import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Ticket, Calendar, MapPin, Loader2, Clock, 
  Fingerprint, X, ShieldCheck, Info, CheckCircle2, Trash2 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);

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
    setTimeout(() => setIsFlipping(true), 300);
  };

  if (loading) return (
    <div className="h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
           <div className="flex items-center gap-3 mb-2 text-left">
             <div className="p-2 bg-blue-600/20 rounded-lg">
                <Ticket className="text-blue-500" size={24} />
             </div>
             <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Security Verified</span>
           </div>
           <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white text-left">Digital Vault</h2>
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
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]" />

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
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] uppercase tracking-widest animate-pulse">
                       <Info size={12} /> Tap to Open
                    </div>
                    {/* Updated Cancel Ticket Button on Card */}
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
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <button 
            onClick={() => setSelectedTicket(null)}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-[110] border border-white/10 shadow-xl"
          >
            <X size={32} />
          </button>

          <div className="perspective-2000 w-full max-w-lg h-[600px] md:h-[650px]">
            <div className={`relative w-full h-full transition-all duration-[900ms] transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT: EVENT SUMMARY */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[3.5rem] border border-blue-500/40 p-10 flex flex-col justify-between shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
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
                {/* Cancel Button inside Modal */}
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
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest animate-pulse tracking-[0.3em]">Preparing Entry Token...</p>
                </div>
              </div>

              {/* BACK: QR CODE ACCESS */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[3.5rem] flex flex-col items-center p-10 text-slate-900 shadow-[0_0_100px_rgba(255,255,255,0.2)]">
                <div className="text-center mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Gate Access Authorized</p>
                  <h4 className="text-3xl font-black uppercase tracking-tighter text-blue-600 italic underline decoration-blue-600/20 underline-offset-8">
                    {studentName}
                  </h4>
                </div>
                <div className="bg-[#f8fafc] p-10 rounded-[3rem] border-2 border-slate-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] mb-8">
                  <QRCodeCanvas 
                    value={selectedTicket.id} 
                    size={260} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>
                <div className="w-full space-y-5">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <p className="font-mono text-[11px] text-slate-400 uppercase font-bold tracking-tighter truncate max-w-[250px]">
                      ID: {selectedTicket.id}
                    </p>
                    <Fingerprint size={18} className="text-blue-500" />
                  </div>
                  <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-[0.5em]">Scan for Instant Admission</p>
                </div>
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