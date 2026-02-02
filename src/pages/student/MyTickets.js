import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../sbclient/supabaseClient';
import { Ticket, Calendar, MapPin, Inbox, Shield } from 'lucide-react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Fetch current user session from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUserEmail(user.email);

        // Fetch bookings with joined event details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, 
            events ( title, date, venue )
          `)
          .eq('student_email', user.email);

        if (error) throw error;
        setTickets(data || []);
      } catch (err) {
        console.error("Fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-8 max-w-5xl py-12 transition-colors duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
            <Ticket size={28}/>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Digital Vault</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 uppercase tracking-wider">Your Entry Passes</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <Shield size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{userEmail}</span>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid gap-8">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row overflow-hidden transition-all hover:scale-[1.01] hover:shadow-blue-500/5">
              {/* Left Content */}
              <div className="p-10 flex-grow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full">Confirmed Entry</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                  {t.events?.title || "University Event"}
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 font-bold">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Calendar size={18} className="text-blue-600"/>
                      </div>
                      <span>{t.events?.date ? new Date(t.events.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : "Date TBD"}</span>
                   </div>
                   <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 font-bold">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <MapPin size={18} className="text-rose-500"/>
                      </div>
                      <span>{t.events?.venue || "ADYPU Campus"}</span>
                   </div>
                </div>
                <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entry Pass ID</p>
                  <p className="font-mono text-slate-800 dark:text-slate-300 mt-1 select-all">{t.id}</p>
                </div>
              </div>
              
              {/* Right QR Section */}
              <div className="p-10 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-dashed border-slate-200 dark:border-slate-800 min-w-[280px]">
                <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl transition-transform hover:scale-105 duration-300">
                  <QRCodeSVG value={t.id} size={160} level="H" includeMargin={false} />
                </div>
                <div className="mt-6 text-center">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Authorized Access Only</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[9px] mt-1 italic">Scan at the event gate for check-in</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State Section */
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8 shadow-inner">
               <Inbox size={48} />
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-black text-3xl">No Tickets Found</p>
            <p className="text-slate-400 mt-2 font-medium">Head over to the Events tab to browse and book upcoming activities.</p>
            <div className="mt-8 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-400 italic italic">Scanning tickets for: {userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;