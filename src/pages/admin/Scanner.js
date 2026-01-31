import React, { useState } from 'react'; // Removed useEffect
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';

const Scanner = () => {
  const [status, setStatus] = useState('Ready to Verify');
  const [isScanning, setIsScanning] = useState(false);
  // Removed [scanner, setScanner] as it wasn't being used after assignment

  const startScanner = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setIsScanning(true);

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      // Automatically requests back camera permission
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            verifyTicket(decodedText);
          });
        }
      );
    } catch (err) {
      console.error("Camera access error:", err);
      setStatus("❌ Camera access denied.");
      setIsScanning(false);
    }
  };

  const verifyTicket = async (bookingId) => {
    setStatus('Verifying...');
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, student_urn, events ( title )`)
        .eq('id', bookingId)
        .single();

      if (error || !data) {
        setStatus('❌ INVALID TICKET');
      } else {
        setStatus(`✅ VALID: ${data.student_urn}`);
        alert(`Access Granted for ${data.student_urn}`);
      }
    } catch (err) {
      setStatus('⚠️ Database error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-lg text-center">
      <h2 className="text-3xl font-bold mb-4 text-gray-800">Entry Gate</h2>
      
      {!isScanning && (
        <div className="mb-6 p-10 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200">
          <p className="text-blue-600 font-medium mb-4">Click to start the back camera</p>
          <button 
            onClick={startScanner}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            OPEN SCANNER
          </button>
        </div>
      )}

      <div className={`bg-black rounded-3xl overflow-hidden shadow-2xl ${!isScanning ? 'hidden' : 'block'}`}>
        <div id="reader" style={{ width: '100%' }}></div>
      </div>

      <div className="mt-6 p-6 bg-white rounded-2xl shadow-sm border">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</p>
        <h3 className={`text-xl font-bold mt-1 ${status.includes('✅') ? 'text-green-600' : 'text-blue-600'}`}>
          {status}
        </h3>
        
        {(status.includes('❌') || status.includes('✅')) && (
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 font-bold underline"
          >
            Scan Next Ticket
          </button>
        )}
      </div>
    </div>
  );
};

export default Scanner;