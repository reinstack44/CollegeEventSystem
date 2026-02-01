import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../../firebaseConfig';
import { supabase } from '../../sbclient/supabaseClient';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketsByRegisteredURN = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch the URN from the 'students' table using the logged-in email
        const { data: studentProfile, error: profileError } = await supabase
          .from('students')
          .select('urn')
          .eq('email', user.email)
          .single();

        if (profileError || !studentProfile) {
          console.error("Student profile not found for this email.");
          setLoading(false);
          return;
        }

        const registeredUrn = studentProfile.urn;

        // 2. Fetch bookings where the student_urn matches the registered URN
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            student_urn,
            events ( title, date, venue )
          `)
          .eq('student_urn', registeredUrn);

        if (bookingError) throw bookingError;
        setTickets(bookingData || []);

      } catch (err) {
        console.error("Error fetching tickets:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketsByRegisteredURN();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl min-h-screen">
      <header className="mb-10 text-center">
        <h2 className="text-3xl font-black text-gray-800">My Campus Passes</h2>
        <p className="text-gray-500 mt-2">Tickets registered to your University ID</p>
      </header>
      
      <div className="grid gap-8">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row border border-gray-100 overflow-hidden transform transition-hover hover:scale-[1.01]">
              {/* Ticket Details */}
              <div className="p-10 flex-grow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full uppercase tracking-tighter">
                    Verified Entry
                  </span>
                </div>
                
                <h3 className="text-3xl font-black text-gray-900 leading-tight mb-4">
                  {t.events?.title || "Event Title"}
                </h3>
                
                <div className="space-y-3 text-gray-600 font-bold">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <span>{t.events?.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl text-red-500">📍</span>
                    <span>{t.events?.venue}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-mono">ID: {t.id}</span>
                  <span className="text-sm font-black text-blue-600 uppercase tracking-widest">{t.student_urn}</span>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="p-10 bg-gray-50 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l-4 border-dashed border-gray-200">
                <div className="bg-white p-4 rounded-3xl shadow-lg mb-4">
                  <QRCodeSVG value={t.id} size={150} level="H" includeMargin={true} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scan at Entrance</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
            <div className="text-6xl mb-6">🎟️</div>
            <h3 className="text-2xl font-black text-gray-800">No Tickets Found</h3>
            <p className="text-gray-400 mt-2 max-w-xs mx-auto">
              You haven't registered for any events like the **U25 Summit** yet. Check the events page!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;