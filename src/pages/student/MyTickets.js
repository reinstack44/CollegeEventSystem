import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../sbclient/supabaseClient';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Corrected: Get user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUserEmail(user.email);

        // Fetching tickets based on email
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

  if (loading) return <div className="p-10 text-center font-bold">Loading Tickets...</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h2 className="text-3xl font-black mb-6">My Tickets</h2>
      <div className="grid gap-6">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl shadow-xl flex border overflow-hidden">
              <div className="p-8 flex-grow">
                <h3 className="text-2xl font-black">{t.events?.title || "Event"}</h3>
                <p className="text-gray-600 font-bold mt-2">
                  📅 {t.events?.date ? new Date(t.events.date).toLocaleDateString() : "N/A"} | 📍 {t.events?.venue}
                </p>
                <p className="text-xs text-gray-400 mt-4 font-mono">ID: {t.id}</p>
              </div>
              <div className="p-8 bg-gray-50 flex items-center justify-center border-l border-dashed">
                <QRCodeSVG value={t.id} size={120} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed">
            <p className="text-gray-500 font-bold text-lg">No tickets found for {userEmail}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;