import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  History, Flashlight, FlashlightOff, ShieldCheck, 
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
  
  const [pendingTeamVerification, setPendingTeamVerification] = useState(null);
  
  const audioCtx = useRef(null);
  const scannerRef = useRef(null);
  const isComponentMounted = useRef(true);
  const userRoleRef = useRef(null); 
  const isLockedRef = useRef(false);
  const startScannerRef = useRef(null);

  // --- ERROR SHIELD: Prevents the "onabort" crash overlay from appearing ---
  useEffect(() => {
    const handleGlobalError = (e) => {
      const errorMsg = e.message || (e.reason && e.reason.message) || "";
      if (errorMsg.includes('onabort') || errorMsg.includes('video surface')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleGlobalError, true);
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleGlobalError, true);
    };
  }, []);

  const triggerFeedback = useCallback((type) => {
    if (audioCtx.current && audioCtx.current.state !== 'closed') {
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

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // 1. Stop the scanning process if active
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        
        // 2. Physical hardware track kill
        const tracks = window.document.querySelectorAll('video');
        tracks.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
          }
        });

        // 3. Clear the DOM reference
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        // Silent catch for the unavoidable 'onabort' during rapid exit
      }
    }
  }, []);

  const startAutomatedScanner = useCallback(async () => {
    if (!isComponentMounted.current) return;
    try {
      await stopScanner(); 
      isLockedRef.current = false; 
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => processCheckIn(decodedText),
        () => {} // Framework search callback
      );
    } catch (err) {
      console.error("Scanner init error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopScanner]);

  useEffect(() => {
    startScannerRef.current = startAutomatedScanner;
  }, [startAutomatedScanner]);

  const finalizeCheckIn = useCallback(async (bookingData) => {
    try {
      const { data, error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', bookingData.id)
        .neq('status', 'checked_in') 
        .select();

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        triggerFeedback('error');
        if (isComponentMounted.current) setScanResult({ type: 'warning', message: 'Already Checked In' });
        toast.error("Ticket already used!");
        return; 
      }

      triggerFeedback('success'); 
      if (isComponentMounted.current) {
        setScanResult({ type: 'success', message: 'Entry Approved' });
        setTotalScanned(prev => prev + (bookingData.team_name ? bookingData.fullMembers.length : 1));
        const newEntry = {
          id: bookingData.id,
          name: bookingData.team_name ? `Team: ${bookingData.team_name}` : `${bookingData.students?.name || 'Student'} ${bookingData.students?.surname || ''}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: bookingData.events?.title,
          isTeam: !!bookingData.team_name
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 5));
      }
      toast.success(bookingData.team_name ? `Team Approved: ${bookingData.team_name}` : `Approved: ${bookingData.students?.name}`);
    } catch (err) {
      triggerFeedback('error');
    } finally {
      if (isComponentMounted.current) {
        setPendingTeamVerification(null);
        setTimeout(() => {
            if (!isComponentMounted.current) return;
            setScanResult(null);
            setIsVerifying(false);
            isLockedRef.current = false;
            if (scannerRef.current && !scannerRef.current.isScanning) {
                startScannerRef.current();
            }
        }, 3000);
      }
    }
  }, [triggerFeedback]);

  const processCheckIn = useCallback(async (identifier) => {
    if (!identifier || isVerifying || isLockedRef.current) return;
    isLockedRef.current = true;
    setIsVerifying(true);
    
    if (scannerRef.current && scannerRef.current.isScanning) {
      try { await scannerRef.current.pause(); } catch(e) {}
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(title, org_id, club_id), students(name, surname, email)')
        .eq('id', identifier)
        .single();

      if (error || !data) {
        triggerFeedback('error'); 
        if (isComponentMounted.current) setScanResult({ type: 'error', message: 'Invalid Ticket' });
        setTimeout(() => {
            if (!isComponentMounted.current) return;
            setIsVerifying(false);
            setScanResult(null);
            isLockedRef.current = false;
            if (scannerRef.current) startScannerRef.current();
        }, 3000);
        return;
      } 
      
      const roleCtx = userRoleRef.current;
      let hasAuthority = roleCtx?.role === 'super_admin' || !roleCtx || (roleCtx.role === 'org_head' && roleCtx.org_id === data.events?.org_id) || (roleCtx.role === 'club_head' && roleCtx.club_id === data.events?.club_id);

      if (!hasAuthority) {
        triggerFeedback('error');
        if (isComponentMounted.current) setScanResult({ type: 'error', message: 'Wrong Event Scanner' });
        setTimeout(() => {
            if (!isComponentMounted.current) return;
            setIsVerifying(false);
            setScanResult(null);
            isLockedRef.current = false;
            if (scannerRef.current) startScannerRef.current();
        }, 3000);
        return;
      }

      if (data.status === 'checked_in') {
        triggerFeedback('error'); 
        if (isComponentMounted.current) setScanResult({ type: 'warning', message: 'Already Checked In' });
        setTimeout(() => {
            if (!isComponentMounted.current) return;
            setIsVerifying(false);
            setScanResult(null);
            isLockedRef.current = false;
            if (scannerRef.current) startScannerRef.current();
        }, 3000);
        return;
      } 

      if (data.status === 'pending') {
        triggerFeedback('error'); 
        if (isComponentMounted.current) setScanResult({ type: 'warning', message: 'Payment Not Done' });
        setTimeout(() => {
            if (!isComponentMounted.current) return;
            setIsVerifying(false);
            setScanResult(null);
            isLockedRef.current = false;
            if (scannerRef.current) startScannerRef.current();
        }, 3000);
        return;
      }

      if (data.team_name) {
         const { data: memEmails } = await supabase.from('booking_members').select('student_email').eq('booking_id', data.id);
         let fullMembers = [];
         if (memEmails && memEmails.length > 0) {
            const emails = memEmails.map(m => m.student_email);
            const { data: profiles } = await supabase.from('students').select('email, name, surname').in('email', emails);
            fullMembers = profiles || [];
         } else if (data.students) {
            fullMembers = [{ name: data.students.name, surname: data.students.surname, email: data.students.email }];
         }
         triggerFeedback('success'); 
         if (isComponentMounted.current) setPendingTeamVerification({ ...data, fullMembers });
      } else {
         await finalizeCheckIn(data);
      }
    } catch (err) {
      triggerFeedback('error');
      setTimeout(() => {
          if (!isComponentMounted.current) return;
          setIsVerifying(false);
          setScanResult(null);
          isLockedRef.current = false;
          if (scannerRef.current) startScannerRef.current();
      }, 3000);
    }
  }, [isVerifying, triggerFeedback, finalizeCheckIn]);

  useEffect(() => {
    isComponentMounted.current = true;
    const initSystem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.from('user_roles').select('role, org_id, club_id').eq('email', user.email).single();
        userRoleRef.current = roleData;
      }
      const today = new Date().toISOString().split('T')[0];
      let countQuery = supabase.from('bookings').select('*, events!inner(org_id, club_id)', { count: 'exact', head: true }).eq('status', 'checked_in').gte('created_at', today);
      if (userRoleRef.current?.role === 'org_head') countQuery = countQuery.eq('events.org_id', userRoleRef.current.org_id);
      else if (userRoleRef.current?.role === 'club_head') countQuery = countQuery.eq('events.club_id', userRoleRef.current.club_id);
      const { count, error } = await countQuery;
      if (!error && isComponentMounted.current) setTotalScanned(count || 0);
    };

    initSystem();
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    startAutomatedScanner();
    return () => { 
      isComponentMounted.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
         scannerRef.current.stop().catch(() => {});
      }
      if (audioCtx.current) audioCtx.current.close().catch(() => {});
    };
  }, [startAutomatedScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const newState = !isTorchOn;
      const capabilities = scannerRef.current.getRunningTrackCapabilities();
      if (!capabilities.torch) throw new Error();
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] });
      setIsTorchOn(newState);
    } catch (err) {
      toast.error("Flashlight not supported.");
    }
  };

  const handleExit = async () => {
    // 1. Lock everything immediately
    isLockedRef.current = true;
    setIsVerifying(true); 
    const t = toast.loading("Closing camera safety...");
    
    // 2. Wait for hard hardware release
    await stopScanner();
    
    // 3. Clear toast and navigate
    toast.dismiss(t);
    navigate('/admin-dashboard'); 
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 pb-20 flex flex-col items-center font-sans overflow-hidden relative">
      
      {pendingTeamVerification && (
         <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-full max-w-md bg-[#111827] border border-indigo-500/30 rounded-4xl p-8 shadow-[0_0_80px_rgba(99,102,241,0.2)] flex flex-col relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-indigo-500 to-transparent" />
               <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-lg">
                   <Users size={32} className="text-indigo-400" />
                 </div>
                 <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter mb-2">Team Check-In</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pendingTeamVerification.events?.title}</p>
               </div>
               <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 mb-6 text-left overflow-y-auto custom-scrollbar max-h-60">
                  <div className="space-y-2 pr-2">
                     {pendingTeamVerification.fullMembers?.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#1e293b] p-3 rounded-xl border border-white/5">
                           <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-[10px] uppercase shrink-0">{m.name?.charAt(0) || 'U'}</div>
                           <p className="text-sm font-bold text-white truncate">{m.name} {m.surname}</p>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <button onClick={() => finalizeCheckIn(pendingTeamVerification)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95 shadow-lg flex justify-center items-center gap-2"><CheckCircle2 size={18}/> Approve Entry</button>
                  <button onClick={() => { setPendingTeamVerification(null); setIsVerifying(false); isLockedRef.current = false; startScannerRef.current(); }} className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border border-white/5">Cancel</button>
               </div>
            </div>
         </div>
      )}

      <div className="w-full max-w-lg flex items-center justify-between py-4 mb-6 relative z-50">
        <button onClick={handleExit} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold tracking-wide uppercase"><ArrowLeft size={18} /> Exit Scanner</button>
        <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          <Lock size={10} className="text-blue-400" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Active</span>
        </div>
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><Users size={14} /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Checked In</span></div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{totalScanned.toString().padStart(2, '0')}</h2>
        </div>
        <div className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1"><ShieldCheck size={14} /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Security</span></div>
          <h2 className="text-xl font-bold text-blue-400 tracking-tight">Ticket Check</h2>
        </div>
      </div>

      <div className={`relative w-full max-w-md aspect-square rounded-[2.5rem] border-4 transition-all duration-500 overflow-hidden bg-black shadow-2xl ${scanResult?.type === 'success' ? 'border-green-500' : scanResult?.type === 'error' ? 'border-red-500' : scanResult?.type === 'warning' ? 'border-yellow-500' : 'border-[#1E293B]'}`}>
        <div id="reader" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="relative w-62.5 h-62.5 overflow-hidden rounded-3xl">
            <div className="absolute left-0 right-0 mx-auto w-[90%] h-0.5 bg-linear-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] animate-scan-line"></div>
          </div>
        </div>
        <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-center z-30">
          <button onClick={startScannerRef.current} className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-all"><RefreshCw size={20} /></button>
          <button onClick={toggleTorch} className={`p-3 backdrop-blur-md border border-white/10 rounded-full transition-all ${isTorchOn ? 'bg-yellow-500 text-black' : 'bg-black/40 text-white'}`}>{isTorchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}</button>
        </div>
        {(isVerifying && !pendingTeamVerification) && (
          <div className="absolute inset-0 bg-[#0B1120]/90 backdrop-blur-md flex flex-col items-center justify-center z-40 transition-all">
            <div className="h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 animate-pulse">Processing...</p>
          </div>
        )}
      </div>

      <div className="mt-8 h-20 flex items-center justify-center w-full px-4">
        {scanResult ? (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 animate-in fade-in zoom-in duration-300 ${scanResult.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : scanResult.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
            {scanResult.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="text-lg font-bold tracking-tight uppercase">{scanResult.message}</span>
          </div>
        ) : (<p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">Scan QR Code</p>)}
      </div>

      <div className="mt-4 w-full max-w-md space-y-4 relative z-0">
        <div className="flex items-center gap-2 text-slate-400 px-2"><History size={16} /><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">History</h3></div>
        <div className="space-y-2">
          {history.length === 0 ? (<div className="py-8 text-center border border-dashed border-white/5 rounded-3xl opacity-30"><p className="text-xs text-slate-500 font-medium italic">Scans will appear here...</p></div>) : (
            history.map((entry, idx) => (
              <div key={idx} className="bg-[#161E2E] p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-[#1C2537] transition-colors group">
                <div className="flex items-center gap-3">
                   <ShieldCheck size={16} className="text-blue-500 shrink-0"/>
                   <div className="flex flex-col min-w-0"><span className="text-sm font-bold text-white uppercase truncate">{entry.name}</span><span className="text-[9px] text-slate-500 uppercase font-semibold truncate">{entry.event}</span></div>
                </div>
                <div className="bg-black/20 px-3 py-1 rounded-lg border border-white/5 shrink-0"><span className="text-blue-400 font-mono text-[10px] font-bold">{entry.time}</span></div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan-line { 0% { top: 5%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 95%; opacity: 0; } }
        .animate-scan-line { animation: scan-line 2.5s ease-in-out infinite; }
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #reader__dashboard { display: none !important; }
        #reader__scan_region { background: transparent !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.6); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Scanner;