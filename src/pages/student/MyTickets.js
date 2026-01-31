import React, { useState } from 'react'; // Removed useEffect
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../sbclient/supabaseClient';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [urn, setUrn] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMyTickets = async () => {
    if (!urn) return;
    
    setLoading(true);
    // Join bookings with events table to get event details
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_urn,
        events ( id, title, date, venue )
      `)
      .eq('student_urn', urn);

    if (error) {
      console.error(error);
      alert("Error fetching tickets. Please check your URN.");
    } else {
      setTickets(data);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl min-h-screen">
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Campus Passes</h2>
        <p className="text-gray-500 mb-6 text-sm">Enter your University Registration Number to see your booked events.</p>
        
        <div className="flex flex-col md:flex-row gap-3">
          <input 
            placeholder="Enter your URN (e.g., 2022CS101)" 
            className="border-2 border-gray-200 p-3 rounded-xl w-full outline-none focus:border-blue-500 transition-all"
            value={urn}
            onChange={(e) => setUrn(e.target.value)}
          />
          <button 
            onClick={fetchMyTickets} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Find My Tickets'}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl shadow-xl flex flex-col md:flex-row border border-gray-100 overflow-hidden transform transition-all hover:scale-[1.01]">
              <div className="p-8 flex-grow">
                <div className="flex items-center gap-2 mb-3 text-blue-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-widest">Confirmed Entry</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{t.events?.title || "Untitled Event"}</h3>
                <div className="mt-4 space-y-2 text-gray-600">
                  <p className="flex items-center gap-2">
                    <span className="text-lg">📅</span> {t.events?.date}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-lg">📍</span> {t.events?.venue}
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50 font-mono text-xs text-gray-400">
                  REF: {t.id}
                </div>
              </div>
              
              <div className="p-10 bg-gray-50 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-dashed border-gray-300">
                <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
                  <QRCodeSVG value={t.id} size={140} level="H" includeMargin={true} />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scan at entrance</p>
              </div>
            </div>
          ))
        ) : (
          !loading && urn && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No tickets found for this URN. Did you book an event yet?</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MyTickets;