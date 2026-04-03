import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  History, ScanLine, Flashlight, FlashlightOff, ShieldCheck, 
  RefreshCw, ArrowLeft, Users, CheckCircle2, AlertCircle, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Scanner = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [isTorchOn, setIsTorchOn] = useState(false);
  
  const audioCtx = useRef(null);
  const scannerRef = useRef(null);
  const isComponentMounted = useRef(true);
  const userRoleRef = useRef(null); // NEW: Store role context without triggering re-renders

  // --- LOGIC SECTION ---

  const triggerFeedback = useCallback((type) => {
    if (audioCtx.current) {
      const oscillator = audioCtx.current.createOscillator();
      const gainNode = audioCtx.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.current.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.current.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.2);
      } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(110, audioCtx.current.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.4);
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
        .select('*, events(title, org_id, club_id), students(name, surname)')
        .eq('id', identifier)
        .single();

      if (error || !data) {
        triggerFeedback('error'); 
        setScanResult({ type: 'error', message: 'INVALID CREDENTIALS' });
        return;
      } 
      
      // NEW: SECURITY SCOPE CHECK
      const roleCtx = userRoleRef.current;
      const isSuperAdmin = roleCtx?.role === 'super_admin';
      const isMyOrg = roleCtx?.org_id === data.events?.org_id;
      const isMyClub = roleCtx?.club_id === data.events?.club_id;

      let hasAuthority = false;
      if (isSuperAdmin || !roleCtx) hasAuthority = true;
      else if (roleCtx.role === 'org_head' && isMyOrg) hasAuthority = true;
      else if (roleCtx.role === 'club_head' && isMyClub) hasAuthority = true;

      if (!hasAuthority) {
        triggerFeedback('error');
        setScanResult({ type: 'error', message: 'UNAUTHORIZED SECTOR' });
        return;
      }

      // Proceed with Check-in
      if (data.status === 'checked_in') {
        triggerFeedback('error'); 
        setScanResult({ type: 'warning', message: 'ALREADY VERIFIED' });
      } else {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
          .eq('id', data.id);

        if (updateError) throw updateError;

        triggerFeedback('success'); 
        setScanResult({ type: 'success', message: 'ACCESS GRANTED' });
        if (isComponentMounted.current) setTotalScanned(prev => prev + 1);
        
        const newEntry = {
          id: data.id,
          name: `${data.students?.name || 'Unknown'} ${data.students?.surname || ''}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: data.events?.title
        };
        if (isComponentMounted.current) setHistory(prev => [newEntry, ...prev].slice(0, 5));
        toast.success(`Verified: ${data.students?.name}`, { position: "top-center" });
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
        console.warn("Scanner Cleanup Info:", err);
      }
    }
  }, []);

  const startAutomatedScanner = useCallback(async () => {
    try {
      await stopScanner(); 
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      const config = { fps: 30, qrbox: { width: 250, height: 250 } };
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => processCheckIn(decodedText)
      );
    } catch (err) {
      console.error("Scanner Error:", err);
    }
  }, [processCheckIn, stopScanner]);

  useEffect(() => {
    isComponentMounted.current = true;
    
    // NEW: Initialize system with Role context and Scoped Counts
    const initSystem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role, org_id, club_id')
          .eq('email', user.email)
          .single();
        userRoleRef.current = roleData;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Scoped Count Query
      let countQuery = supabase
        .from('bookings')
        .select('*, events!inner(org_id, club_id)', { count: 'exact', head: true })
        .eq('status', 'checked_in')
        .gte('created_at', today);

      if (userRoleRef.current?.role === 'org_head') {
        countQuery = countQuery.eq('events.org_id', userRoleRef.current.org_id);
      } else if (userRoleRef.current?.role === 'club_head') {
        countQuery = countQuery.eq('events.club_id', userRoleRef.current.club_id);
      }

      const { count, error } = await countQuery;
      if (!error && isComponentMounted.current) setTotalScanned(count || 0);
    };

    initSystem();
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    startAutomatedScanner();
    
    return () => { 
      isComponentMounted.current = false;
      stopScanner(); 
    };
  }, [startAutomatedScanner, stopScanner]);

  const handleReScan = () => {
    toast.loading("Re-calibrating...", { duration: 1000 });
    startAutomatedScanner();
  };

  // --- UI SECTION ---

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 pb-20 flex flex-col items-center font-sans">
      
      {/* TOP NAVIGATION */}
      <div className="w-full max-w-lg flex items-center justify-between py-4 mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold tracking-wide uppercase"
        >
          <ArrowLeft size={18} /> Exit Scanner
        </button>
        <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          <Lock size={10} className="text-blue-400" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">System Online</span>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {totalScanned.toString().padStart(2, '0')}
          </h2>
        </div>
        <div className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Security</span>
          </div>
          <h2 className="text-xl font-bold text-blue-400 tracking-tight leading-tight">Identity Check</h2>
        </div>
      </div>

      {/* SCANNER VIEWPORT */}
      <div className={`relative w-full max-w-md aspect-square rounded-[2.5rem] border-4 transition-all duration-500 overflow-hidden bg-black shadow-2xl ${
        scanResult?.type === 'success' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 
        scanResult?.type === 'error' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' :
        scanResult?.type === 'warning' ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' :
        'border-[#1E293B] shadow-[0_0_40px_rgba(30,58,138,0.2)]'
      }`}>
        
        <div id="reader" className="w-full h-full"></div>
        
        {/* SCANNER OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-12 border-2 border-white/10 rounded-3xl"></div>
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-linear-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] animate-scan-line"></div>
        </div>

        {/* CONTROLS */}
        <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-center z-30">
          <button onClick={handleReScan} className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={() => {
              if (scannerRef.current) {
                const newState = !isTorchOn;
                scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] });
                setIsTorchOn(newState);
              }
            }}
            className={`p-3 backdrop-blur-md border border-white/10 rounded-full transition-all ${isTorchOn ? 'bg-yellow-500 text-black' : 'bg-black/40 text-white'}`}
          >
            {isTorchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
          </button>
        </div>

        {/* VERIFICATION OVERLAY */}
        {isVerifying && (
          <div className="absolute inset-0 bg-[#0B1120]/90 backdrop-blur-md flex flex-col items-center justify-center z-40 transition-all">
            <div className="relative">
               <div className="h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
               <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={24} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400 mt-6 animate-pulse">Validating...</p>
          </div>
        )}
      </div>

      {/* STATUS INDICATOR */}
      <div className="mt-8 h-20 flex items-center justify-center w-full px-4">
        {scanResult ? (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 animate-in fade-in zoom-in duration-300 ${
            scanResult.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 
            scanResult.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' :
            'bg-red-500/10 border-red-500/50 text-red-400'
          }`}>
            {scanResult.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="text-lg font-bold tracking-tight uppercase">
              {scanResult.message}
            </span>
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">Scan QR Code To Check-In</p>
        )}
      </div>

      {/* SESSION LOG */}
      <div className="mt-4 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-slate-400">
            <History size={16} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Session_Log</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Last 5 Verified</span>
        </div>

        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/5 rounded-3xl opacity-30">
              <p className="text-xs text-slate-500 font-medium italic uppercase tracking-tighter">Waiting for data...</p>
            </div>
          ) : (
            history.map((entry, idx) => (
              <div key={idx} className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-[#1C2537] transition-colors group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase">{entry.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{entry.event}</span>
                </div>
                <div className="bg-black/20 px-3 py-1 rounded-lg border border-white/5">
                  <span className="text-blue-400 font-mono text-xs font-bold">{entry.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 20%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        .animate-scan-line { animation: scan-line 3s linear infinite; }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #reader__dashboard { display: none !important; }
        #reader__scan_region { background: transparent !important; }
      `}</style>
    </div>
  );
};

export default Scanner;