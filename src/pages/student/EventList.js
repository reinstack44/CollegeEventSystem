import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient'; 

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events') 
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. New Booking Logic
  const handleBooking = async (eventId, eventTitle) => {
    // For ₹0 budget, we use a simple prompt to identify the student.
    // In a final build, this would come from your AuthContext.
    const studentUrn = prompt("Please enter your URN to confirm booking:");

    if (!studentUrn) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{ student_urn: studentUrn, event_id: eventId }]);

      if (error) {
        // Handle duplicate booking (Unique Constraint in SQL)
        if (error.code === '23505') {
          alert("You have already booked a ticket for this event!");
        } else {
          throw error;
        }
      } else {
        alert(`Successfully booked: ${eventTitle}! Check 'My Tickets' to see your QR code.`);
      }
    } catch (error) {
      alert("Booking failed: " + error.message);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) return <div className="text-center p-10 font-semibold">Loading campus events...</div>;

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center uppercase tracking-wider">Campus Events</h2>
      
      {events.length === 0 ? (
        <div className="bg-blue-50 p-10 rounded-xl text-center border-2 border-dashed border-blue-200">
          <p className="text-blue-600 font-medium">No events currently listed. Admins will update soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map(event => (
            <div key={event.id} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border-l-8 border-blue-600">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                {event.school_target || "General"}
              </span>
              <h3 className="text-2xl font-bold mt-3 text-gray-900">{event.title}</h3>
              <div className="mt-4 space-y-1 text-gray-600">
                <p className="flex items-center">📅 <span className="ml-2">{event.date}</span></p>
                <p className="flex items-center">📍 <span className="ml-2 font-medium">{event.venue}</span></p>
              </div>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed line-clamp-3 italic">
                {event.description}
              </p>
              <button 
                onClick={() => handleBooking(event.id, event.title)}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Book Ticket
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;