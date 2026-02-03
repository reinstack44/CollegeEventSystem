import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { Calendar, Clock, MapPin, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetching tickets joined with event and student data
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          events (title, date, venue, start_time, end_time),
          students (full_name, urn)
        `)
        .eq('students.email', user.email);

      if (!error) setTickets(data || []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (eventDate) => {
    return new Date(eventDate) < new Date().setHours(0, 0, 0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="text-blue-500 animate-spin" size={48} />
      </div>
    );
  }

  const activeTickets = tickets.filter(t => t.events && !isExpired(t.events.date));
  const expiredTickets = tickets.filter(t => t.events && isExpired(t.events.date));

  return (
    <div className="py-12 px-6 bg-black min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-black text-white mb-12 tracking-tight">My Vault</h2>
        
        {tickets.length === 0 ? (
          <p className="text-slate-500 font-bold">No tickets found in your vault.</p>
        ) : (
          <>
            <TicketSection title="Active Pass" items={activeTickets} expired={false} />
            <TicketSection title="History" items={expiredTickets} expired={true} />
          </>
        )}
      </div>
    </div>
  );
};

const TicketSection = ({ title, items, expired }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-12">
      <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-6 ml-2 ${expired ? 'text-slate-600' : 'text-blue-500'}`}>
        {title} ({items.length})
      </h3>
      <div className="grid gap-6">
        {items.map(ticket => (
          <div key={ticket.id} className={`relative overflow-hidden bg-slate-900 border ${expired ? 'border-slate-800 opacity-60' : 'border-blue-500/30'} rounded-[2.5rem] p-8 flex flex-col md:flex-row justify-between items-center transition-all`}>
            <div className="space-y-4 text-center md:text-left">
              <div>
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  {ticket.students?.full_name || 'Student'}
                </p>
                <h4 className="text-2xl font-black text-white leading-tight">
                  {ticket.events?.title || 'Untitled Event'}
                </h4>
              </div>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <IconBox icon={<Calendar size={14}/>} text={ticket.events ? new Date(ticket.events.date).toLocaleDateString() : 'N/A'} />
                <IconBox icon={<Clock size={14}/>} text={ticket.events?.start_time || 'N/A'} />
                <IconBox icon={<MapPin size={14}/>} text={ticket.events?.venue || 'N/A'} />
              </div>
            </div>

            <div className="mt-8 md:mt-0 flex flex-col items-center gap-2">
              <div className={`p-4 rounded-2xl ${expired ? 'bg-slate-800' : 'bg-white shadow-xl shadow-blue-500/10'}`}>
                 <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">QR CODE</div>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ID: {ticket.id.split('-')[0]}</p>
            </div>
            
            {expired ? (
              <div className="absolute top-4 right-8 text-red-500 flex items-center gap-1 font-black text-[10px] uppercase tracking-widest">
                <ShieldAlert size={14}/> Expired
              </div>
            ) : (
              <div className="absolute top-4 right-8 text-green-500 flex items-center gap-1 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck size={14}/> Verified
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const IconBox = ({ icon, text }) => (
  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800">
    <span className="text-blue-500">{icon}</span> {text}
  </div>
);

export default MyTickets;