import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { MapPin, Calendar, Clock, Loader2, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleBookTicket = async (eventId) => {
    setLoadingId(eventId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to book"); return; }

      const { error } = await supabase.from('bookings').insert([{ 
        event_id: eventId, 
        student_email: user.email,
        status: 'booked'
      }]);

      if (error) {
        if (error.code === '23505') toast.error("You have already booked this event!");
        else throw error;
      } else {
        toast.success("Success! Your ticket is booked. Find it in 'My Tickets'", {
          duration: 5000,
          icon: '🎉',
        });
      }
    } catch (err) {
      toast.error("Booking failed. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="py-12 px-6 bg-[#0a0f1d] min-h-screen text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {events.map(event => (
          <div key={event.id} className="bg-slate-900/50 p-8 rounded-[3rem] border border-slate-800 flex flex-col justify-between hover:border-blue-500/50 transition-all group">
            <div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{event.school}</span>
              <h4 className="text-2xl font-black mt-2 mb-4 uppercase group-hover:text-blue-400 transition-colors">{event.title}</h4>
              <p className="text-slate-400 text-sm line-clamp-3 mb-6">{event.description}</p>
              
              <div className="space-y-2 text-slate-400 font-bold text-xs uppercase mb-8">
                <p className="flex items-center gap-2"><Calendar size={14}/> {event.date}</p>
                <p className="flex items-center gap-2"><Clock size={14}/> {event.start_time} - {event.end_time}</p>
                <p className="flex items-center gap-2"><MapPin size={14}/> {event.venue}</p>
              </div>
            </div>
            <button 

              onClick={() => handleBookTicket(event.id)} 

              disabled={loadingId === event.id} 

              className="w-full bg-blue-600 py-4 rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-500 disabled:bg-slate-700 active:scale-95 transition-all"

            >
              {loadingId === event.id ? <Loader2 className="animate-spin" /> : <><Ticket size={20}/> BOOK PASS</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventList;