import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { Ticket, Calendar, MapPin, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserTickets();
  }, []);

  const fetchUserTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, status, events ( title, date, venue, school, start_time, end_time )`)
        .eq('student_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      toast.error("Could not load your vault");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-black"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-black mb-12 uppercase italic flex items-center gap-3">
          <Ticket className="text-blue-500" size={36} /> Digital Vault
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tickets.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-800">
              <p className="text-slate-500 font-black uppercase tracking-widest">No Active Passes Found</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-slate-900 rounded-[3rem] border border-slate-800 overflow-hidden flex flex-col shadow-2xl relative">
                <div className="bg-white p-8 flex justify-center items-center">
                  <QRCodeCanvas value={ticket.id} size={180} level={"H"} />
                </div>

                <div className="p-8 space-y-4">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{ticket.events?.school}</span>
                  <h3 className="text-2xl font-black uppercase leading-tight">{ticket.events?.title}</h3>
                  
                  <div className="space-y-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <p className="flex items-center gap-2"><Calendar size={14}/> {ticket.events?.date}</p>
                    <p className="flex items-center gap-2"><Clock size={14}/> {ticket.events?.start_time} - {ticket.events?.end_time}</p>
                    <p className="flex items-center gap-2"><MapPin size={14}/> {ticket.events?.venue}</p>
                  </div>

                  <div className={`mt-4 py-3 px-6 rounded-2xl text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${
                    ticket.status === 'checked_in' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-600 text-white'
                  }`}>
                    {ticket.status === 'checked_in' ? <><CheckCircle2 size={16}/> Entry Confirmed</> : "Valid Pass"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default MyTickets;