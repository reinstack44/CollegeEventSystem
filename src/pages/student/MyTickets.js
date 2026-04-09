import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Ticket, Calendar, MapPin, Zap, Clock, 
  X, ShieldCheck, Info, CheckCircle2, Trash2, Download, Loader2, History, AlertTriangle, CreditCard, Users, Gamepad2
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    ticketId: null, 
    eventTitle: '' 
  });

  const printRef = useRef(null);

  const getDisplayAmount = (ticket) => {
    if (ticket.events?.event_type === 'paid') {
      const ticketFee = Number(ticket.events?.price || 0);
      const platformFee = 5;
      const gatewayFee = Number(((ticketFee + platformFee) * 0.025).toFixed(2));
      return (ticketFee + platformFee + gatewayFee).toFixed(2);
    }
    return "0.00";
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('m')) return timeStr; 
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedH = h < 10 ? `0${h}` : h;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    fetchUserTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && tickets.length > 0) {
      const currentHref = window.location.href;
      const ticketMatch = currentHref.match(/#ticket-([a-zA-Z0-9-]+)/);
      
      if (ticketMatch && ticketMatch[1]) {
        const eventId = ticketMatch[1];
        const targetTicket = tickets.find(t => String(t.events?.id) === String(eventId));
        
        if (targetTicket) {
          if (targetTicket.status === 'pending') {
            toast.error("Ticket is still pending verification.");
          } else {
            openTicket(targetTicket);
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    }
  }, [loading, tickets]);

  const fetchUserTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('students').select('name, surname').eq('email', user.email).single();
      setStudentName(`${profile?.name || 'Student'} ${profile?.surname || ''}`);

      const { data: memberships } = await supabase.from('booking_members').select('booking_id').eq('student_email', user.email);
      const bookingIds = memberships ? memberships.map(m => m.booking_id) : [];

      if (bookingIds.length === 0) {
        setTickets([]);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, amount_expected, team_name, selected_game, student_email,
          events ( id, title, date, venue, school, start_time, end_time, registration_deadline, event_type, price, org_id )
        `)
        .in('id', bookingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgIds = [...new Set((data || []).map(b => b.events?.org_id).filter(Boolean))];
      let orgMap = {};
      if (orgIds.length > 0) {
        const { data: orgData } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        if (orgData) orgData.forEach(o => { orgMap[o.id] = o.name; });
      }

      const validTickets = (data || []).filter(ticket => ticket.events !== null).map(t => ({
        ...t,
        orgName: orgMap[t.events.org_id] || 'Organization',
        isLead: t.student_email === user.email 
      }));

      setTickets(validTickets);
    } catch (error) {
      toast.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTickets = tickets.filter(ticket => new Date(ticket.events?.date) >= today);
  const expiredTickets = tickets.filter(ticket => new Date(ticket.events?.date) < today);

  const triggerCancelConfirmation = (id, title) => {
    setConfirmModal({ isOpen: true, ticketId: id, eventTitle: title });
  };

  const handleCancelTicket = async () => {
    const { ticketId } = confirmModal;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', ticketId);
      if (error) throw error;

      toast.success("Ticket cancelled successfully.");
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      setConfirmModal({ isOpen: false, ticketId: null, eventTitle: '' });
    } catch (err) {
      toast.error("Failed to cancel ticket.");
    }
  };

  const openTicket = async (ticket) => {
    let fullMembers = [];
    if (ticket.team_name) {
       const { data: memEmails } = await supabase.from('booking_members').select('student_email').eq('booking_id', ticket.id);
       if (memEmails) {
          const emails = memEmails.map(m => m.student_email);
          const { data: profiles } = await supabase.from('students').select('email, name, surname').in('email', emails);
          fullMembers = profiles || [];
       }
    }

    setSelectedTicket({ ...ticket, fullMembers });
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating PDF...");
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#0a0f1d' });
      const imgWidth = 400; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width; 
      
      const pdf = new jsPDF('p', 'px', [imgWidth, imgHeight]); 
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Ticket_${selectedTicket.events?.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("Download complete!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally { setIsDownloading(false); }
  };

  const TicketCard = ({ ticket }) => {
    const isCheckedIn = ticket.status === 'checked_in';
    const isPending = ticket.status === 'pending';
    const isExpired = new Date(ticket.events?.date) < today;

    const handleCardClick = () => {
      if (isPending) {
        toast('Ticket is pending approval.', { icon: '⏳', style: { borderRadius: '10px', background: '#1f2937', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)' }});
        return; 
      }
      openTicket(ticket);
    };

    return (
      <div 
        className={`relative aspect-square bg-[#0f172a] rounded-[3rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 flex flex-col justify-between group overflow-hidden transition-all duration-300 ${isExpired ? 'opacity-60 grayscale-[0.5] cursor-pointer' : isPending ? 'cursor-not-allowed border-yellow-500/20' : 'cursor-pointer active:scale-95'}`}
        onClick={handleCardClick}
      >
        <div className={`absolute inset-0 bg-linear-to-br ${isExpired ? 'from-slate-600/10' : isPending ? 'from-yellow-600/5' : 'from-blue-600/10'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <div className={`absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent ${isExpired ? 'via-slate-500' : isPending ? 'via-yellow-500' : 'via-blue-500'} to-transparent ${!isExpired && !isPending && 'shadow-[0_0_15px_rgba(59,130,246,0.8)]'}`} />

        <div className="relative z-10 flex justify-between items-start">
          <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${isExpired ? 'text-slate-400 bg-slate-500/10 border-slate-400/30' : isPending ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-blue-400 bg-blue-500/20 border-blue-400/30'}`}>
            {ticket.orgName}
          </span>
          <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md border ${isCheckedIn ? 'text-green-500 border-green-500/20 bg-green-500/10' : isExpired ? 'text-slate-500 border-slate-500/20 bg-slate-500/10' : isPending ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' : 'text-blue-500 border-blue-500/20 bg-blue-500/10'}`}>
            {isCheckedIn ? <CheckCircle2 size={10}/> : isPending ? <Clock size={10}/> : <ShieldCheck size={10}/>}
            {isExpired ? 'EXPIRED' : ticket.status.replace('_', ' ')}
          </span>
        </div>

        <div className="relative z-10 space-y-4 text-left">
          <h3 className={`text-3xl font-black uppercase tracking-tighter leading-[0.85] transition-colors line-clamp-2 ${isExpired ? 'text-slate-500' : isPending ? 'text-yellow-500/80' : 'group-hover:text-blue-400'}`}>
            {ticket.events?.title}
          </h3>
          <div className="space-y-2">
            {ticket.team_name && <p className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest"><Users size={12}/> TEAM: {ticket.team_name}</p>}
            {ticket.selected_game && <p className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase tracking-widest"><Gamepad2 size={12}/> {ticket.selected_game}</p>}
            <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"><Calendar size={12} className={isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : "text-blue-500"}/> {ticket.events?.date}</p>
            <div className="flex items-start gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
               <MapPin size={12} className={`shrink-0 mt-0.5 ${isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : "text-blue-500"}`} /> 
               <span className="truncate">{ticket.events?.venue}</span>
            </div>
            
            {/* PRICE TAG RESTORED */}
            <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest pt-1 ${isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : ticket.events?.event_type === 'paid' ? "text-emerald-400" : "text-blue-400"}`}>
              {ticket.events?.event_type === 'paid' ? <CreditCard size={12} /> : <Ticket size={12} />} 
              {ticket.events?.event_type === 'paid' ? `PAID: ₹${getDisplayAmount(ticket)}` : 'FREE ENTRY'}
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className={`flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${isExpired ? 'text-slate-500' : isPending ? 'text-yellow-500 animate-pulse' : 'text-blue-400 animate-pulse'}`}>
             {isPending ? <Clock size={12} /> : <Info size={12} />} 
             {isExpired ? 'View Details' : isPending ? 'Pending Approval' : 'Tap to View Ticket'}
          </div>
          {!isCheckedIn && !isExpired && ticket.isLead && (
            <button 
              onClick={(e) => { e.stopPropagation(); triggerCancelConfirmation(ticket.id, ticket.events?.title); }}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95 group/cancel"
            >
              <Trash2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cancel</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="h-screen bg-[#0a0f1d] flex items-center justify-center">
      <Zap className="animate-pulse text-blue-500" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 pb-24 selection:bg-blue-500/30 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
           <div className="flex items-center gap-3 mb-2 text-left">
             <div className="p-2 bg-blue-600/20 rounded-lg"><Ticket className="text-blue-500" size={24} /></div>
             <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Your Bookings</span>
           </div>
           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white text-left">My Tickets</h2>
        </header>

        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-[#0f172a] rounded-[3rem] border border-dashed border-white/10">
            <Info size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active tickets found.</p>
          </div>
        ) : (
          <div className="space-y-20">
            {activeTickets.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-linear-to-r from-blue-500/50 to-transparent"></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.5em] text-blue-500">Active Tickets</h3>
                    <div className="h-px flex-1 bg-linear-to-l from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {activeTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
                </div>
              </section>
            )}

            {expiredTickets.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-linear-to-r from-slate-700/50 to-transparent"></div>
                    <div className="flex items-center gap-2">
                        <History size={14} className="text-slate-500" />
                        <h3 className="text-xs font-black uppercase tracking-[0.5em] text-slate-500">Past Tickets</h3>
                    </div>
                    <div className="h-px flex-1 bg-linear-to-l from-slate-700/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {expiredTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-300 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0f172a] border border-red-500/30 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(239,68,68,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500 to-transparent" />
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white">Cancel Ticket?</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Are you sure you want to cancel your ticket for <br/> 
                  <span className="text-white font-bold italic">"{confirmModal.eventTitle}"</span>?
                </p>
              </div>
              <div className="flex flex-col w-full gap-3">
                <button onClick={handleCancelTicket} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-red-900/20">
                  Confirm Cancellation
                </button>
                <button onClick={() => setConfirmModal({ isOpen: false, ticketId: null, eventTitle: '' })} className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border border-white/5">
                  Keep Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET UI */}
      {selectedTicket && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white z-610 border border-white/10 transition-all"><X size={24} /></button>
          <div className="w-full max-w-[90vw] md:max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in-95 duration-300">
             
             <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 p-6 md:p-8 flex flex-col w-full text-left relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                   <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-relaxed max-w-[60%]">
                      {selectedTicket.orgName} {selectedTicket.clubName ? `• ${selectedTicket.clubName}` : ''} <br/> EVENT PASS
                   </p>
                   <div className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      VERIFIED
                   </div>
                </div>

                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-6">{selectedTicket.events?.title}</h2>

                {selectedTicket.selected_game && (
                   <div className="mb-4">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tournament</p>
                      <p className="text-sm font-black text-cyan-400 uppercase">{selectedTicket.selected_game}</p>
                   </div>
                )}

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</p>
                     <p className="text-sm font-bold text-white">{selectedTicket.events?.date}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Time</p>
                     <p className="text-sm font-bold text-white">{formatTime(selectedTicket.events?.start_time)}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Venue</p>
                     <p className="text-sm font-bold text-white">{selectedTicket.events?.venue}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Status</p>
                     {/* MODAL PRICE TAG RESTORED */}
                     <p className="text-sm font-black text-emerald-400 uppercase">
                        {selectedTicket.events?.event_type === 'paid' ? `PAID: ₹${getDisplayAmount(selectedTicket)}` : 'FREE ENTRY'}
                     </p>
                   </div>
                </div>

                <div className="mb-6">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{selectedTicket.team_name ? 'Team Name' : 'Attendee'}</p>
                   <p className="text-xl font-black text-white uppercase truncate">{selectedTicket.team_name || studentName}</p>
                </div>

                {selectedTicket.team_name && selectedTicket.fullMembers && selectedTicket.fullMembers.length > 0 && (
                   <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Users size={12}/> Team Members</p>
                      <div className="space-y-1">
                        {selectedTicket.fullMembers.map((m, idx) => (
                           <p key={idx} className="text-xs font-bold text-slate-300">• {m.name} {m.surname}</p>
                        ))}
                      </div>
                   </div>
                )}

                <div className="bg-white -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6 pt-8 relative flex flex-col items-center mt-auto shrink-0">
                   <div className="absolute top-0 left-0 w-full h-0 border-t-2 border-dashed border-slate-800" style={{ transform: 'translateY(-50%)' }}></div>
                   <div className="absolute top-0 left-0 w-4 h-4 bg-[#0a0f1d] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 bg-[#0a0f1d] rounded-full translate-x-1/2 -translate-y-1/2"></div>

                   <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4">A D M I T &nbsp; O N E</p>
                   <QRCodeCanvas value={selectedTicket.id || "error"} size={140} level="H" className="mb-4" />
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket ID</p>
                   <p className="text-[9px] font-mono font-bold text-slate-900">{selectedTicket.id}</p>
                   
                   <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} disabled={isDownloading} className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2">
                     {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                     {isDownloading ? "Generating..." : "Download PDF"}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE PDF LAYER */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '400px', backgroundColor: '#0a0f1d', padding: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '40px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                <div style={{ padding: '32px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: '1.5', maxWidth: '60%' }}>
                         {selectedTicket.orgName} <br/> EVENT PASS
                      </p>
                      <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
                         VERIFIED
                      </div>
                   </div>

                   <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '24px' }}>{selectedTicket.events?.title}</h2>

                   {selectedTicket.selected_game && (
                      <div style={{ marginBottom: '16px' }}>
                         <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Tournament</p>
                         <p style={{ fontSize: '16px', fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase' }}>{selectedTicket.selected_game}</p>
                      </div>
                   )}

                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Date</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.date}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Time</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{formatTime(selectedTicket.events?.start_time)}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Venue</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.venue}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Payment Status</p>
                        {/* PDF PRICE TAG RESTORED */}
                        <p style={{ fontSize: '14px', fontWeight: '900', color: '#34d399', textTransform: 'uppercase' }}>
                           {selectedTicket.events?.event_type === 'paid' ? `PAID: ₹${getDisplayAmount(selectedTicket)}` : 'FREE ENTRY'}
                        </p>
                      </div>
                   </div>

                   <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>{selectedTicket.team_name ? 'Team Name' : 'Attendee'}</p>
                      <p style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{selectedTicket.team_name || studentName}</p>
                   </div>

                   {selectedTicket.team_name && selectedTicket.fullMembers && selectedTicket.fullMembers.length > 0 && (
                      <div style={{ padding: '16px', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '24px' }}>
                         <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Team Members</p>
                         {selectedTicket.fullMembers.map((m, idx) => (
                            <p key={idx} style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', margin: '4px 0' }}>• {m.name} {m.surname}</p>
                         ))}
                      </div>
                   )}
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '0', borderTop: '2px dashed #94a3b8' }}></div>
                   <p style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '6px', marginBottom: '16px' }}>A D M I T &nbsp; O N E</p>
                   <QRCodeCanvas value={selectedTicket.id || "error"} size={140} level="H" style={{ marginBottom: '16px' }} />
                   <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Ticket ID</p>
                   <p style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>{selectedTicket.id}</p>
                </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default MyTickets;