import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import { ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Scanner = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { qrbox: 250, fps: 10 });
    
    scanner.render(async (decodedText) => {
      if (decodedText === lastScan) return;
      
      setIsVerifying(true);
      setLastScan(decodedText);

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, events(title)')
          .eq('id', decodedText)
          .single();
        
        if (error || !data) {
          toast.error("ACCESS DENIED: Invalid Ticket", { duration: 4000 });
        } else if (data.status === 'checked_in') {
          toast.error(`ALREADY USED: Entry recorded earlier`, { icon: '⚠️' });
        } else {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'checked_in' })
            .eq('id', decodedText);

          if (updateError) throw updateError;
          toast.success(`VERIFIED: Welcome to ${data.events.title}`, { duration: 5000 });
        }
      } catch (err) {
        toast.error("System Error: Check database connection");
      } finally {
        setIsVerifying(false);
      }
    });

    return () => scanner.clear();
  }, [lastScan]);

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <h2 className="text-4xl font-black mb-8 flex gap-3 uppercase italic tracking-tighter">
        <ShieldCheck className="text-blue-500" /> Gate Control
      </h2>
      
      <div className="w-full max-w-md bg-slate-900 p-4 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div id="reader" className="overflow-hidden rounded-3xl"></div>
      </div>

      <div className="mt-12 text-center space-y-4">
        {isVerifying ? (
          <div className="flex items-center gap-3 text-blue-400 font-bold animate-pulse">
            <Loader2 className="animate-spin" /> AUTHORIZING...
          </div>
        ) : (
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Ready for Next Admission</p>
        )}
      </div>
    </div>
  );
};

export default Scanner;