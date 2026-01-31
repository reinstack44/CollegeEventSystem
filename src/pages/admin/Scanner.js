import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';

const Scanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState('Ready to Scan');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
    });

    scanner.render(onScanSuccess, onScanError);

    async function onScanSuccess(decodedText) {
      scanner.clear(); // Stop scanning once we find a code
      setScanResult(decodedText);
      verifyTicket(decodedText);
    }

    function onScanError(err) {
      // Common to ignore errors during active scanning
    }

    return () => scanner.clear();
  }, []);

  const verifyTicket = async (bookingId) => {
    setStatus('Verifying...');
    try {
      // Query bookings and join with events/students for full details
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student_urn,
          events ( title )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        setStatus('❌ INVALID TICKET');
      } else {
        setStatus(`✅ VALID: ${data.student_urn} for ${data.events.title}`);
      }
    } catch (err) {
      setStatus('⚠️ Error connecting to database');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Entry Scanner</h2>
      
      <div className="bg-white p-4 rounded-3xl shadow-xl overflow-hidden border-2 border-gray-100">
        <div id="reader" className="w-full"></div>
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-gray-50 text-center border-2 border-dashed border-gray-200">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Scan Result</p>
        <h3 className={`text-xl font-black ${status.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </h3>
        {scanResult && <p className="mt-2 text-xs font-mono text-gray-400">ID: {scanResult}</p>}
        
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Scan Next Ticket
        </button>
      </div>
    </div>
  );
};

export default Scanner;