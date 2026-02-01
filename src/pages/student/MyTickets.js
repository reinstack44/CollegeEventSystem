import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../../firebaseConfig';
import { supabase } from '../../sbclient/supabaseClient';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Get the URN from students table using email
        const { data: profile } = await supabase
          .from('students')
          .select('urn')
          .eq('email', user.email)
          .single();

        const registeredUrn = profile?.urn;

        // 2. Search bookings by BOTH email and URN to catch all data
        // This handles the NULL values seen in your screenshots
        let query = supabase.from('bookings').select(`
          id, student_urn, student_email,
          events ( title, date, venue )
        `);

        if (registeredUrn) {
          query = query.or(`student_email.eq."${user.email}",student_urn.eq."${registeredUrn}"`);
        } else {
          query = query.eq('student_email', user.email);
        }

        const { data, error } = await query;
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
                <p className="text-gray-600 font-bold mt-2">📅 {t.events?.date} | 📍 {t.events?.venue}</p>
                <p className="text-xs text-gray-400 mt-4 font-mono">ID: {t.id}</p>
              </div>
              <div className="p-8 bg-gray-50 flex items-center justify-center border-l border-dashed">
                <QRCodeSVG value={t.id} size={120} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed">
            <p className="text-gray-500 font-bold text-lg">No tickets found for {auth.currentUser?.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;