import React, { useState } from 'react'; // Removed useEffect
import { Html5QrcodeScanner } from 'html5-qrcode'; // Removed unused Format import
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldAlert, Camera } from 'lucide-react';

const Scanner = () => {
  const [result, setResult] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner("reader", { 
      fps: 15, 
      qrbox: 250,
      showTorchButtonIfSupported: true,
      rememberLastUsedCamera: true,
      supportedScanTypes: [0] 
    });

    scanner.render(async (text) => {
      scanner.clear();
      setResult(text);
      verifyTicket(text);
    }, (err) => {});
  };

  const verifyTicket = async (id) => {
    const loadToast = toast.loading("Security Check...");
    try {
      const { data, error } = await supabase.from('bookings')
        .select('*, events(title, date, end_time), students(full_name)')
        .eq('id', id).single();

      if (error || !data) throw new Error("Invalid Ticket");

      const eventDate = new Date(data.events.date);
      if (eventDate < new Date().setHours(0,0,0,0)) {
        toast.error("Ticket is Expired", { id: loadToast });
        setTicketData({ ...data, expired: true });
        return;
      }

      setTicketData(data);
      toast.success(`Valid: ${data.students.full_name}`, { id: loadToast });
    } catch (err) {
      toast.error(err.message, { id: loadToast });
    }
  };

  return (
    <div className="pt-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-[3rem] border border-slate-800 text-center">
        <h2 className="text-2xl font-black text-white mb-8">Security Scanner</h2>
        
        {!result && (
          <button onClick={startScanner} className="bg-blue-600 text-white p-12 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-105 transition-all">
            <Camera size={48} />
          </button>
        )}

        <div id="reader" className="overflow-hidden rounded-3xl mt-4"></div>

        {ticketData && (
          <div className={`mt-8 p-6 rounded-3xl border ${ticketData.expired ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
            {ticketData.expired ? <ShieldAlert className="text-red-500 mx-auto mb-2" /> : <ShieldCheck className="text-green-500 mx-auto mb-2" />}
            <p className="font-black text-lg text-white tracking-widest uppercase">
              {ticketData.expired ? "Ticket Expired" : "Valid Entry"}
            </p>
            <p className="text-slate-400 font-bold mt-2">{ticketData.students?.full_name}</p>
            <p className="text-slate-500 text-xs mt-1">ID: {ticketData.id}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;