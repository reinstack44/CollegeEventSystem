import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*');
    setEvents(data);
  };
  
  // Replace Firebase auth with Supabase auth
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  fetchEvents();
  return () => subscription.unsubscribe();
}, []);

  const handleBookTicket = async (eventId) => {
    // Check if user is logged in via Firebase
    if (!user) {
      setShowLoginPopup(true); // Trigger professional popup
      return;
    }

    // Process booking automatically using verified email
    try {
      const { error } = await supabase.from('bookings').insert([
        { 
          event_id: eventId, 
          student_email: user.email, 
          status: 'confirmed'
        }
      ]);

      if (error) throw error;
      alert("Ticket Booked Successfully!");
    } catch (err) {
      alert("Booking Error: " + err.message);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-black mb-8 text-gray-800 text-center">Upcoming Events</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {events.map(event => (
          /* PRESERVING YOUR UI STYLE FROM image_bc117c.png */
          <div key={event.id} className="relative bg-white w-full max-w-[350px] p-6 rounded-[2rem] shadow-xl border-l-[6px] border-blue-600 transition-transform hover:scale-[1.02]">
            <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              {event.school || "General"}
            </span>
            
            <h3 className="text-2xl font-black mt-4 mb-4 text-gray-800 leading-tight">
              {event.title}
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-600 font-medium">
                <span className="text-xl">📅</span>
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 font-medium">
                <span className="text-xl text-pink-500">📍</span>
                <span>{event.location || "ADYPU Campus"}</span>
              </div>
            </div>

            <p className="text-gray-500 italic text-sm mb-8 leading-relaxed">
              {event.description || "Everyone registered students has to come 30 minutes before the time!!"}
            </p>

            <button 
              onClick={() => handleBookTicket(event.id)}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              Book Ticket
            </button>
          </div>
        ))}
      </div>

      {/* MODAL: ONLY SHOWS IF NOT LOGGED IN */}
      {showLoginPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="text-6xl mb-6">🔒</div>
            <h3 className="text-2xl font-black text-gray-800 mb-3">Login Required</h3>
            <p className="text-gray-500 font-medium leading-relaxed mb-8">
              To secure your spot, please log in with your verified student account.
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg"
              >
                Go to Login
              </button>
              <button 
                onClick={() => setShowLoginPopup(false)}
                className="w-full text-gray-400 font-bold hover:text-gray-600 transition"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventList;