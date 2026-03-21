import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Ticket, Calendar, MapPin, Zap, Clock, 
  Fingerprint, X, ShieldCheck, Info, CheckCircle2, Trash2, Download, Loader2
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
  const printRef = useRef(null);

  useEffect(() => {
    fetchUserTickets();
  }, []);

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
          events ( 
            title, 
            date, 
            venue, 
            school, 
            start_time, 
            end_time,
            registration_deadline
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

  const handleCancelTicket = async (ticketId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to cancel your ticket for "${eventTitle}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success("Ticket Cancelled Successfully");
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
    } catch (err) {
      toast.error("Cancellation Failed");
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsFlipping(false);
    setTimeout(() => setIsFlipping(true), 100);
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    
    setIsDownloading(true);
    const toastId = toast.loading("Generating A4 Vertical PDF...");
    
    try {
      // Force html2canvas to render exactly at 794px width (standard A4 px width)
      // This prevents mobile browsers from squishing the layout
      const canvas = await html2canvas(printRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Initialize exact A4 portrait dimensions
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
             <div className="p-2 bg-blue-600/20 rounded-lg">
                <Ticket className="text-blue-500" size={24} />
             </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {tickets.map((ticket) => {
              const isCheckedIn = ticket.status === 'checked_in';
              
              return (
                <div 
                  key={ticket.id} 
                  className="relative aspect-square bg-[#0f172a] rounded-[3rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 flex flex-col justify-between group cursor-pointer overflow-hidden transition-all duration-300 active:scale-95"
                  onClick={() => openTicket(ticket)}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]" />

                  <div className="relative z-10 flex justify-between items-start">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/20 px-4 py-1.5 rounded-full border border-blue-400/30">
                      {ticket.events?.school}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md border ${
                      isCheckedIn 
                      ? 'text-green-500 border-green-500/20 bg-green-500/10' 
                      : 'text-blue-500 border-blue-500/20 bg-blue-500/10'
                    }`}>
                      {isCheckedIn ? <CheckCircle2 size={10}/> : <ShieldCheck size={10}/>}
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="relative z-10 space-y-4 text-left">
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-[0.85] group-hover:text-blue-400 transition-colors">
                      {ticket.events?.title}
                    </h3>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        <Calendar size={12} className="text-blue-500"/> {ticket.events?.date}
                      </p>
                      <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        <Clock size={12} className="text-blue-500"/> 
                        {ticket.events?.start_time} — {ticket.events?.end_time || 'End'}
                      </p>
                      <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-[90%]">
                        <MapPin size={12} className="text-blue-500"/> {ticket.events?.venue}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] uppercase tracking-widest animate-pulse">
                       <Info size={12} /> Tap to Open QR Pass
                    </div>
                    {!isCheckedIn && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTicket(ticket.id, ticket.events?.title);
                        }}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-90"
                        title="Cancel Ticket"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TICKET DETAIL MODAL WITH 3D FLIP */}
      {selectedTicket && (
        <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <button 
            onClick={() => setSelectedTicket(null)}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-110 border border-white/10 shadow-xl"
          >
            <X size={32} />
          </button>

          <div className="perspective-2000 w-full max-w-lg h-150 md:h-162.5">
            <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT: EVENT SUMMARY */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[3.5rem] border border-blue-500/40 p-10 flex flex-col justify-between shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
                <div className="text-left">
                   <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="text-blue-500" size={28} />
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">Security Pass Verified</p>
                     </div>
                     <div className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
                       selectedTicket.status === 'checked_in' 
                       ? 'text-green-500 border-green-500/20 bg-green-500/5' 
                       : 'text-blue-500 border-blue-500/20 bg-blue-500/5'
                     }`}>
                       {selectedTicket.status.replace('_', ' ')}
                     </div>
                   </div>
                   <h4 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-12 text-white italic">
                      {selectedTicket.events?.title}
                   </h4>
                   <div className="space-y-6">
                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                          <Calendar className="text-blue-500" size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pass Valid For</p>
                          <p className="text-xl font-bold">{selectedTicket.events?.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                          <Clock className="text-blue-500" size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Event Duration</p>
                          <p className="text-xl font-bold">
                            {selectedTicket.events?.start_time} — {selectedTicket.events?.end_time || 'End'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                          <MapPin className="text-blue-500" size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venue Location</p>
                          <p className="text-xl font-bold">{selectedTicket.events?.venue}</p>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-4 py-6 border-t border-white/5">
                  {selectedTicket.status !== 'checked_in' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelTicket(selectedTicket.id, selectedTicket.events?.title);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    >
                      <Trash2 size={14} /> Cancel Ticket
                    </button>
                  )}
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Preparing Entry Token...</p>
                </div>
              </div>

              {/* BACK: QR CODE ACCESS */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[3.5rem] flex flex-col items-center p-8 text-slate-900 shadow-[0_0_100px_rgba(255,255,255,0.2)]">
                <div className="text-center mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Gate Pass Authorized For</p>
                  <h4 className="text-2xl font-black uppercase tracking-tighter text-blue-600 italic underline decoration-blue-600/20 underline-offset-8">
                    {studentName}
                  </h4>
                </div>
                <div className="bg-[#f8fafc] p-6 rounded-[3rem] border-2 border-slate-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] mb-6">
                  <QRCodeCanvas 
                    value={selectedTicket.id} 
                    size={220} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>
                <div className="w-full space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <p className="font-mono text-[11px] text-slate-400 uppercase font-bold tracking-tighter truncate max-w-62.5">
                      ID: {selectedTicket.id}
                    </p>
                    <Fingerprint size={18} className="text-blue-500" />
                  </div>
                  <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-[0.5em] mb-2">Show Your QR Pass At The Entrance</p>
                  
                  {/* DOWNLOAD PDF BUTTON */}
                  <button 
                    onClick={downloadPDF}
                    disabled={isDownloading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    {isDownloading ? 'Generating PDF...' : 'Download PDF Pass'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TICKET: Strict Vertical A4 Dimensions (794x1123) */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          {/* Exact A4 Wrapper Container */}
          <div 
            ref={printRef} 
            style={{ 
              width: '794px', 
              height: '1123px', 
              backgroundColor: '#ffffff', 
              padding: '40px',
              boxSizing: 'border-box',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* The Ticket Frame */}
            <div style={{
              width: '714px', /* 794 - 40 - 40 */
              height: '1043px', /* 1123 - 40 - 40 */
              border: '4px solid #0f172a',
              borderRadius: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              
              {/* TOP SECTION: Details (Dark) */}
              <div style={{
                flex: 1,
                backgroundColor: '#0a0f1d',
                padding: '50px',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
              }}>
                 {/* Header & Badge */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                   <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase' }}>
                     {selectedTicket.events?.school || 'EVENT'} • OFFICIAL SECURITY PASS
                   </p>
                   <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '16px', border: '2px solid #bbf7d0', textTransform: 'uppercase' }}>
                      VALID PASS
                   </div>
                 </div>

                 {/* Event Title (Natural Wrapping) */}
                 <h1 style={{ margin: '0 0 40px 0', fontSize: '56px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: '1.15', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                   {selectedTicket.events?.title}
                 </h1>

                 {/* Date & Time Row */}
                 <div style={{ display: 'flex', marginBottom: '30px', gap: '30px' }}>
                    <div style={{ flex: 1 }}>
                       <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Event Date</p>
                       <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.date}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                       <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Authorized Time</p>
                       <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.events?.start_time} - {selectedTicket.events?.end_time || 'End'}</p>
                    </div>
                 </div>

                 {/* Venue */}
                 <div style={{ marginBottom: 'auto' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Venue Location</p>
                    <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff', wordWrap: 'break-word', whiteSpace: 'normal' }}>{selectedTicket.events?.venue}</p>
                 </div>

                 {/* Student Name */}
                 <div style={{ borderTop: '2px solid #1e293b', paddingTop: '30px', marginTop: '30px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Authorized Attendee</p>
                    <p style={{ margin: 0, fontSize: '40px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{studentName}</p>
                 </div>
              </div>

              {/* THICK DASHED DIVIDER */}
              <div style={{ height: '0', borderBottom: '6px dashed #cbd5e1', backgroundColor: '#0a0f1d' }}></div>

              {/* BOTTOM SECTION: QR Code (Light) */}
              <div style={{
                height: '420px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: '40px'
              }}>
                 <p style={{ margin: '0 0 20px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '6px' }}>ADMIT ONE</p>
                 
                 <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '24px', border: '3px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <QRCodeCanvas value={selectedTicket.id} size={200} level="H" />
                 </div>
                 
                 <p style={{ margin: '25px 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Ticket ID Reference</p>
                 <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center', padding: '0 40px' }}>
                   {selectedTicket.id}
                 </p>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default MyTickets;