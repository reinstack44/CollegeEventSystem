import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  History, Radio, Flashlight, FlashlightOff, Activity, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const Scanner = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [isTorchOn, setIsTorchOn] = useState(false);
  
  const audioCtx = useRef(null);
  const scannerRef = useRef(null);
  const isComponentMounted = useRef(true);

  const fetchInitialCount = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'checked_in')
      .gte('created_at', today);
    if (!error && isComponentMounted.current) setTotalScanned(count || 0);
  };

  const triggerFeedback = useCallback((type) => {
    if (audioCtx.current) {
      const oscillator = audioCtx.current.createOscillator();
      const gainNode = audioCtx.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.current.destination);

      if (type === 'success') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1200, audioCtx.current.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, audioCtx.current.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.5);
      }
      oscillator.start();
      oscillator.stop(audioCtx.current.currentTime + 0.5);
    }
  }, []);

  const processCheckIn = useCallback(async (identifier) => {
    if (!identifier || isVerifying) return;
    setIsVerifying(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(title), students(name, surname)')
        .eq('id', identifier)
        .single();

      if (error || !data) {
        triggerFeedback('error'); 
        setScanResult({ type: 'error', message: 'CRITICAL ERROR: ID INVALID' });
      } else if (data.status === 'checked_in') {
        triggerFeedback('error'); 
        setScanResult({ type: 'warning', message: 'ACCESS VOID: DUPLICATE' });
      } else {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'checked_in' })
          .eq('id', data.id);

        if (updateError) throw updateError;

        triggerFeedback('success'); 
        setScanResult({ type: 'success', message: 'ACCESS GRANTED' });
        if (isComponentMounted.current) setTotalScanned(prev => prev + 1);
        
        const newEntry = {
          id: data.id,
          name: `${data.students?.name || 'Unknown'} ${data.students?.surname || ''}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          event: data.events?.title
        };
        if (isComponentMounted.current) setHistory(prev => [newEntry, ...prev].slice(0, 5));
        toast.success(`SYSTEM: ${data.students?.name} AUTHORIZED`, { position: "bottom-center" });
      }
    } catch (err) {
      triggerFeedback('error');
    } finally {
      if (isComponentMounted.current) {
        setIsVerifying(false);
        setTimeout(() => setScanResult(null), 3000);
      }
    }
  }, [isVerifying, triggerFeedback]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.getState() === 2) { 
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Cleanup Warning: Scanner already stopped", err);
      }
    }
  }, []);

  const startAutomatedScanner = useCallback(async () => {
    try {
      await stopScanner(); 

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 30, 
        qrbox: { width: 250, height: 250 }, 
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => processCheckIn(decodedText)
      );
    } catch (err) {
      if (isComponentMounted.current) {
        console.error("Scanner Error:", err);
      }
    }
  }, [processCheckIn, stopScanner]);

  useEffect(() => {
    isComponentMounted.current = true;
    fetchInitialCount();
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    
    startAutomatedScanner();

    return () => { 
      isComponentMounted.current = false;
      stopScanner(); 
    };
  }, [startAutomatedScanner, stopScanner]);

  const handleReScan = () => {
    toast.loading("Re-Initializing Sensor...", { duration: 1000 });
    startAutomatedScanner();
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-blue-500 p-6 pb-32 flex flex-col items-center font-mono">
      
      {/* HUD HEADER - THEMED BLUE */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 bg-[#050914] border-l-4 border-l-red-600 border-white/5 p-6 rounded-r-3xl shadow-[0_0_30px_rgba(37,99,235,0.1)]">
        <div className="text-left">
           <div className="flex items-center gap-2 mb-1">
             <Radio className="text-red-600 animate-pulse" size={12} />
             <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[8px]">Netrunner Protocol v.2.6</p>
           </div>
           <h2 className="text-4xl font-black italic tracking-tighter leading-none text-white">
             {totalScanned.toString().padStart(3, '0')} <span className="text-blue-500 text-xs not-italic tracking-[0.3em] uppercase ml-2">Verified</span>
           </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
           <Activity size={20} className="text-blue-500/30 animate-pulse" />
        </div>
      </div>

      {/* CENTERED BLUE THEMED SCANNER */}
      <div className={`relative w-full max-w-md aspect-square rounded-[2rem] border-2 transition-all duration-300 overflow-hidden shadow-2xl flex items-center justify-center ${
        scanResult?.type === 'success' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)]' : 
        scanResult?.type === 'error' ? 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)]' :
        'border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.1)]'
      }`}>
        
        <div id="reader" className="w-full h-full scanner-container"></div>
        
        {/* RE-SCAN BUTTON: BLUE THEMED */}
        <button 
          onClick={handleReScan}
          className="absolute top-6 left-6 z-30 p-4 bg-black/60 border border-blue-500/20 rounded-xl text-blue-500 hover:bg-blue-500/20 transition-all active:scale-90"
          title="Re-Sync Sensor"
        >
          <RefreshCw size={20} />
        </button>

        {/* HUD OVERLAYS - BLUE BRACKETS */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-[250px] h-[250px] relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                
                {/* BLUE LASER SCAN */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_15px_#2563eb] animate-cyber-scan"></div>
            </div>
        </div>

        {isVerifying && (
          <div className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="h-12 w-12 border-4 border-t-red-600 border-white/10 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-red-600 mt-4">Decrypting ID...</p>
          </div>
        )}

        <button 
          onClick={() => {
            if (scannerRef.current) {
              const newState = !isTorchOn;
              scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] });
              setIsTorchOn(newState);
            }
          }}
          className="absolute top-6 right-6 z-30 p-4 bg-black/60 border border-blue-500/20 rounded-xl text-blue-500"
        >
          {isTorchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
        </button>
      </div>

      {/* RESULT INDICATOR */}
      <div className="mt-8 h-16 flex items-center justify-center w-full text-center">
        {scanResult ? (
          <div className="px-10 py-3 border-2 skew-x-[-12deg] flex items-center bg-[#050914]">
             <span className={`text-2xl font-black italic tracking-tighter uppercase ${
               scanResult.type === 'success' ? 'text-green-500' : 'text-red-600'
             }`}>
               {scanResult.message}
             </span>
          </div>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 opacity-50">Awaiting Cyber-Link...</p>
        )}
      </div>

      {/* ACTIVITY FEED */}
      <div className="mt-8 w-full max-w-md space-y-4 pb-20">
        <div className="flex items-center px-4 border-b border-blue-500/10 pb-4">
          <History size={14} className="mr-2" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Session_Log</h3>
        </div>
        <div className="space-y-3">
          {history.length === 0 ? (
             <div className="py-10 text-center border border-dashed border-blue-500/10 rounded-2xl opacity-20">
               <p className="text-[9px] font-black uppercase tracking-[0.5em]">Log Empty</p>
             </div>
          ) : (
            history.map((entry, idx) => (
              <div key={idx} className="bg-[#050914] p-5 rounded-2xl border-l-2 border-blue-500/30 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm font-black uppercase italic tracking-tight text-white">{entry.name}</p>
                  <p className="text-[9px] text-blue-500/50 font-bold uppercase">{entry.event}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-500 font-black text-[10px]">{entry.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes cyber-scan {
          0%, 100% { top: 0%; opacity: 0.5; }
          50% { top: 100%; opacity: 1; }
        }
        .animate-cyber-scan { animation: cyber-scan 2.5s ease-in-out infinite; }
        
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 2rem !important;
        }
        
        #reader__dashboard { display: none !important; }
        #reader__scan_region { background: transparent !important; }
      `}</style>
    </div>
  );
};

export default Scanner;