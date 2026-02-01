import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../../firebaseConfig';
import { supabase } from '../../sbclient/supabaseClient';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndTickets = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Get URN from the students table using the logged-in email
      const { data: studentData } = await supabase
        .from('students')
        .select('urn')
        .eq('email', user.email)
        .single();

      if (studentData?.urn) {
        // 2. Fetch bookings using that URN
        const { data, error } = await supabase
          .from('bookings')
          .select(`id, student_urn, events ( id, title, date, venue )`)
          .eq('student_urn', studentData.urn);

        if (!error) setTickets(data);
      }
      setLoading(false);
    };

    fetchUserAndTickets();
  }, []);

  if (loading) return <div className="text-center py-20">Loading your passes...</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Your Tickets</h2>
      <div className="grid gap-6">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl shadow-xl flex flex-col md:flex-row border overflow-hidden">
              <div className="p-8 flex-grow">
                <h3 className="text-2xl font-black">{t.events?.title}</h3>
                <p>📅 {t.events?.date} | 📍 {t.events?.venue}</p>
              </div>
              <div className="p-10 bg-gray-50 flex items-center justify-center border-l border-dashed">
                <QRCodeSVG value={t.id} size={120} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No tickets found for your account.</p>
        )}
      </div>
    </div>
  );
};

export default MyTickets;