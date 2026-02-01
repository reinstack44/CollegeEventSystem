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
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch the URN from the 'students' table using the authenticated email
        const { data: studentProfile, error: profileError } = await supabase
          .from('students')
          .select('urn')
          .eq('email', user.email)
          .single();

        if (profileError || !studentProfile) {
          console.error("Profile not found:", profileError);
          setLoading(false);
          return;
        }

        // 2. Fetch bookings where the student_urn matches the profile found
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            student_urn,
            events ( title, date, venue )
          `)
          .eq('student_urn', studentProfile.urn);

        if (bookingError) throw bookingError;
        setTickets(bookingData || []);
      } catch (err) {
        console.error("Error fetching tickets:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTickets();
  }, []);

  if (loading) return <div className="text-center py-20 font-bold">Checking for your passes...</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl min-h-screen">
      <h2 className="text-3xl font-black mb-8 text-gray-800">My Campus Passes</h2>
      
      <div className="grid gap-6">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl shadow-xl flex flex-col md:flex-row border border-gray-100 overflow-hidden">
              <div className="p-8 flex-grow">
                <div className="flex items-center gap-2 mb-3 text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span className="text-xs font-bold uppercase tracking-widest">Confirmed Entry</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900">{t.events?.title || "Untitled Event"}</h3>
                <div className="mt-4 space-y-2 text-gray-600">
                  <p>📅 {t.events?.date}</p>
                  <p>📍 {t.events?.venue}</p>
                </div>
              </div>
              
              <div className="p-10 bg-gray-50 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-dashed border-gray-300">
                <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
                  <QRCodeSVG value={t.id} size={140} level="H" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Scan at Entrance</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium text-lg">No tickets found for your account.</p>
            <p className="text-gray-400 text-sm">Make sure you have booked an event in the Events section!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;