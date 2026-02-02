import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { MapPin, Calendar, ShieldCheck, ArrowRight } from 'lucide-react';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    supabase.from('events').select('*').then(({ data }) => setEvents(data || []));
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
  }, []);

  const handleBookTicket = async (eventId, title) => {
    if (!user) { setShowLoginPopup(true); return; }
    const loadToast = toast.loading(`Booking ${title}...`);
    try {
      const { error } = await supabase.from('bookings').insert([{ event_id: eventId, student_email: user.email, status: 'confirmed' }]);
      if (error) throw error;
      toast.success("Ticket ready in My Tickets!", { id: loadToast });
    } catch (err) {
      toast.error(err.message, { id: loadToast });
    }
  };

  return (
    <div className="py-12 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6 text-center md:text-left">
          <div>
            <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Active Events</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Verified university events and workshops.</p>
          </div>
          <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-black flex items-center gap-2 border border-blue-100 dark:border-blue-800/50">
            <ShieldCheck size={20} /> ADYPU OFFICIAL
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {events.map(event => (
            <div key={event.id} className="group relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-3 hover:shadow-2xl hover:shadow-blue-500/10">
              <span className="inline-block px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-slate-200 dark:border-slate-700">
                {event.school_target || "All ADYPU Schools"}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                {event.title}
              </h3>
              
              <div className="space-y-4 mb-10">
                <IconInfo icon={<Calendar className="text-blue-600" size={18}/>} text={new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} />
                <IconInfo icon={<MapPin className="text-rose-500" size={18}/>} text={event.venue || "ADYPU Campus"} />
              </div>

              <button 
                onClick={() => handleBookTicket(event.id, event.title)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/10 dark:shadow-none"
              >
                Book Ticket <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showLoginPopup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] max-w-sm w-full text-center shadow-3xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <ShieldCheck size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Auth Required</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">Please sign in with your official student account to access tickets.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => window.location.href = '/login'} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none">Go to Login</button>
              <button onClick={() => setShowLoginPopup(false)} className="w-full text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 transition">Maybe Later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IconInfo = ({ icon, text }) => (
  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 font-bold">
    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">{icon}</div>
    <span className="text-sm">{text}</span>
  </div>
);

export default EventList;