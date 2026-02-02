import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ScanLine, ShieldCheck, ShieldAlert } from 'lucide-react';

const Scanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(onScanSuccess, onScanError);

    async function onScanSuccess(decodedText) {
      scanner.clear();
      setScanResult(decodedText);
      const loadToast = toast.loading("Verifying Ticket...");

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, events(title)')
          .eq('id', decodedText)
          .single();

        if (error || !data) throw new Error("Invalid Ticket ID");

        setIsValid(true);
        toast.success(`Access Granted: ${data.events.title}`, { id: loadToast });
      } catch (err) {
        setIsValid(false);
        toast.error("Unauthorized: Access Denied", { id: loadToast });
      }
    }

    function onScanError(err) { /* Silent ignore scanning attempts */ }

    return () => {
        try {
            scanner.clear();
        } catch (e) {
            console.error("Scanner clear error", e);
        }
    };
  }, []);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center py-12 transition-colors duration-500">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ScanLine size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Ticket Scanner</h2>
          <p className="text-slate-500 font-medium">Align QR code within the frame</p>
        </div>

        <div id="reader" className="overflow-hidden rounded-3xl border-4 border-slate-100 dark:border-slate-800"></div>

        {scanResult && (
          <div className={`mt-8 p-6 rounded-3xl border-2 flex flex-col items-center animate-in zoom-in duration-300 ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200'}`}>
            {isValid ? <ShieldCheck className="text-green-500 mb-2" size={40}/> : <ShieldAlert className="text-red-500 mb-2" size={40}/>}
            <p className={`font-black text-xl ${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {isValid ? "VALID PASS" : "INVALID PASS"}
            </p>
            <p className="text-slate-500 text-xs mt-1 font-mono">{scanResult}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 font-bold hover:underline transition-all active:scale-95">Scan Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;