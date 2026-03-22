import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Ticket, Calendar, MapPin, Zap, Clock, 
  Fingerprint, X, ShieldCheck, Info, CheckCircle2, Trash2, Download, Loader2, History, AlertTriangle, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    ticketId: null, 
    eventTitle: '' 
  });

  const printRef = useRef(null);

  useEffect(() => {
    fetchUserTickets();
  }, []);

  // AUTO-FLIP LOGIC: Detects ticket ID from URL and opens it
  useEffect(() => {
    if (!loading && tickets.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#ticket-')) {
        const eventId = hash.replace('#ticket-', '');
        // Find the ticket that belongs to this event
        const targetTicket = tickets.find(t => String(t.events?.id) === eventId);
        
        if (targetTicket) {
          if (targetTicket.status === 'pending') {
            toast.error("Ticket is still pending verification.");
          } else {
            openTicket(targetTicket);
            // Clean the URL so it doesn't pop up again on refresh
            window.history.replaceState(null, null, ' ');
          }
        }
      }
    }
  }, [loading, tickets]);

  const fetchUserTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('students')
        .select('name, surname')
        .eq('email', user.email)
        .single();
      
      setStudentName(`${profile?.name || 'Student'} ${profile?.surname || ''}`);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, 
          status,
          amount_expected,
          events ( 
            id,
            title, 
            date, 
            venue, 
            school, 
            start_time, 
            end_time,
            registration_deadline,
            event_type
          )
        `)
        .eq('student_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validTickets = (data || []).filter(ticket => ticket.events !== null);
      setTickets(validTickets);
    } catch (error) {
      toast.error("Vault Access Failure");
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
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success("Ticket Cancelled Successfully");
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      setConfirmModal({ isOpen: false, ticketId: null, eventTitle: '' });
    } catch (err) {
      toast.error("Cancellation Failed");
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsFlipping(false);
    // Smooth transition into the flip
    setTimeout(() => setIsFlipping(true), 300);
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating Secure PDF Pass...");
    try {
      const canvas = await html2canvas(printRef.current, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#0a0f1d', 
        windowWidth: 794, 
        logging: false 
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'px', [794, 1123]);
      pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123);
      pdf.save(`ActiveArch_Pass_${selectedTicket.events?.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const TicketCard = ({ ticket }) => {
    const isCheckedIn = ticket.status === 'checked_in';
    const isPending = ticket.status === 'pending';
    const isExpired = new Date(ticket.events?.date) < today;

    const handleCardClick = () => {
      if (isPending) {
        toast('Pass is awaiting Admin UTR verification.', {
          icon: '⏳',
          style: {
            borderRadius: '10px',
            background: '#1f2937',
            color: '#eab308',
            border: '1px solid rgba(234, 179, 8, 0.2)'
          },
        });
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
            {ticket.events?.school}
          </span>
          <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md border ${
            isCheckedIn 
            ? 'text-green-500 border-green-500/20 bg-green-500/10' 
            : isExpired ? 'text-slate-500 border-slate-500/20 bg-slate-500/10' 
            : isPending ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
            : 'text-blue-500 border-blue-500/20 bg-blue-500/10'
          }`}>
            {isCheckedIn ? <CheckCircle2 size={10}/> : isPending ? <Clock size={10}/> : <ShieldCheck size={10}/>}
            {isExpired ? 'EXPIRED' : ticket.status.replace('_', ' ')}
          </span>
        </div>

        <div className="relative z-10 space-y-4 text-left">
          <h3 className={`text-3xl font-black uppercase tracking-tighter leading-[0.85] transition-colors ${isExpired ? 'text-slate-500' : isPending ? 'text-yellow-500/80' : 'group-hover:text-blue-400'}`}>
            {ticket.events?.title}
          </h3>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"><Calendar size={12} className={isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : "text-blue-500"}/> {ticket.events?.date}</p>
            <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"><Clock size={12} className={isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : "text-blue-500"}/> {ticket.events?.start_time} — {ticket.events?.end_time || 'End'}</p>
            <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-[90%]"><MapPin size={12} className={isExpired ? "text-slate-500" : isPending ? "text-yellow-600" : "text-blue-500"}/> {ticket.events?.venue}</p>
            
            {ticket.events?.event_type === 'paid' && (
              <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest pt-1 ${isExpired ? "text-slate-500" : isPending ? "text-yellow-500" : "text-emerald-400"}`}>
                <CreditCard size={12} /> PAID: ₹{ticket.amount_expected}
              </p>
            )}
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className={`flex items-center gap-2 font-black text-[9px] uppercase tracking-widest ${isExpired ? 'text-slate-500' : isPending ? 'text-yellow-500 animate-pulse' : 'text-blue-400 animate-pulse'}`}>
             {isPending ? <Clock size={12} /> : <Info size={12} />} 
             {isExpired ? 'View Record' : isPending ? 'Awaiting Audit' : 'Tap to Open Pass'}
          </div>
          {!isCheckedIn && !isExpired && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                triggerCancelConfirmation(ticket.id, ticket.events?.title);
              }}
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
             <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Security Verified</span>
           </div>
           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white text-left">Tickets Vault</h2>
        </header>

        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-[#0f172a] rounded-[3rem] border border-dashed border-white/10">
            <Info size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active passes in your vault.</p>
          </div>
        ) : (
          <div className="space-y-20">
            {activeTickets.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-linear-to-r from-blue-500/50 to-transparent"></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.5em] text-blue-500">Active Passes</h3>
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
                        <h3 className="text-xs font-black uppercase tracking-[0.5em] text-slate-500">History / Expired</h3>
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
                <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white">Revoke Ticket?</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Are you sure you want to cancel your pass for <br/> 
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

      {/* TICKET DETAIL MODAL WITH FLIP */}
      {selectedTicket && (
        <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-110 border border-white/10 shadow-xl"><X size={32} /></button>
          <div className="perspective-2000 w-full max-w-lg h-150 md:h-162.5">
            <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT OF TICKET */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[3.5rem] border border-blue-500/40 p-10 flex flex-col justify-between shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
                <div className="text-left">
                   <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-3"><ShieldCheck className="text-blue-500" size={28} /><p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">Security Pass Verified</p></div>
                     <div className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${selectedTicket.status === 'checked_in' ? 'text-green-500 border-green-500/20' : 'text-blue-500 border-blue-500/20'}`}>{selectedTicket.status.replace('_', ' ')}</div>
                   </div>
                   <h4 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-12 text-white italic">{selectedTicket.events?.title}</h4>
                   <div className="space-y-6">
                      <div className="flex items-center gap-5"><Calendar className="text-blue-500" size={24} /><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pass Valid For</p><p className="text-xl font-bold">{selectedTicket.events?.date}</p></div></div>
                      <div className="flex items-center gap-5"><Clock className="text-blue-500" size={24} /><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Event Time</p><p className="text-xl font-bold">{selectedTicket.events?.start_time}</p></div></div>
                      <div className="flex items-center gap-5"><MapPin className="text-blue-500" size={24} /><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venue Location</p><p className="text-xl font-bold truncate max-w-62.5">{selectedTicket.events?.venue}</p></div></div>
                      {selectedTicket.events?.event_type === 'paid' && (
                        <div className="flex items-center gap-5">
                          <CreditCard className="text-emerald-500" size={24} />
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Amount Paid</p>
                            <p className="text-xl font-bold text-emerald-400">₹{selectedTicket.amount_expected}</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
                <div className="flex flex-col items-center gap-4 py-6 border-t border-white/5"><p className="text-blue-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Preparing Entry Token...</p></div>
              </div>

              {/* BACK OF TICKET (QR CODE) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[3.5rem] flex flex-col items-center p-8 text-slate-900">
                <div className="text-center mb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Authorized For</p><h4 className="text-2xl font-black uppercase tracking-tighter text-blue-600 italic">{studentName}</h4></div>
                <div className="bg-[#f8fafc] p-6 rounded-[3rem] border-2 border-slate-100 mb-6"><QRCodeCanvas value={selectedTicket.id} size={220} level="H" /></div>
                <div className="w-full space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between"><p className="font-mono text-[11px] text-slate-400 uppercase font-bold truncate max-w-62.5">ID: {selectedTicket.id}</p><Fingerprint size={18} className="text-blue-500" /></div>
                  <button onClick={downloadPDF} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all">{isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}{isDownloading ? 'Generating...' : 'Download PDF'}</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TICKET */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '794px', height: '1123px', backgroundColor: '#0a0f1d', padding: '40px', boxSizing: 'border-box' }}>
            <div style={{ width: '714px', height: '1043px', border: '4px solid #3b82f6', borderRadius: '32px', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1d', boxSizing: 'border-box' }}>
              <div style={{ flex: '0 0 auto', padding: '50px 60px 30px 60px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '3px', textTransform: 'uppercase' }}>{selectedTicket.events?.school || 'EVENT'} • SECURITY PASS</p><div style={{ backgroundColor: '#1e293b', color: '#3b82f6', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', border: '1px solid rgba(59,130,246,0.3)' }}>VERIFIED ACCESS</div></div>
                 <div style={{ marginBottom: '30px', width: '100%' }}><h1 style={{ margin: 0, fontSize: selectedTicket.events?.title.length > 30 ? '34px' : '48px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: '38px', wordWrap: 'break-word', display: 'block' }}>{selectedTicket.events?.title}</h1></div>
                 <div style={{ display: 'flex', marginBottom: '25px', gap: '40px' }}><div style={{ flex: 1 }}><p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Date</p><p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.date}</p></div><div style={{ flex: 1 }}><p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Time</p><p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.start_time}</p></div></div>
                 
                 <div style={{ display: 'flex', marginBottom: '30px', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Venue Location</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.venue}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Payment Status</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: selectedTicket.events?.event_type === 'paid' ? '#10b981' : '#3b82f6' }}>
                        {selectedTicket.events?.event_type === 'paid' ? `PAID ₹${selectedTicket.amount_expected}` : 'FREE PASS'}
                      </p>
                    </div>
                 </div>

                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Authorized Attendee</p>
                    <p style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{studentName}</p>
                 </div>
              </div>
              <div style={{ height: '0', borderBottom: '4px dashed #3b82f6', margin: '0 40px' }}></div>
              <div style={{ flex: '1 1 auto', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
                 <p style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900', color: '#0a0f1d', textTransform: 'uppercase', letterSpacing: '8px' }}>ADMIT ONE</p>
                 <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '15px', border: '1px solid #e2e8f0' }}><QRCodeCanvas value={selectedTicket.id} size={170} level="H" /></div>
                 <div style={{ marginTop: '10px', textAlign: 'center' }}><p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Secure Token ID</p><p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#0a0f1d', fontFamily: 'monospace' }}>{selectedTicket.id}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.perspective-2000 { perspective: 2000px; }.transform-style-3d { transform-style: preserve-3d; }.backface-hidden { backface-visibility: hidden; }.rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
};

export default MyTickets;