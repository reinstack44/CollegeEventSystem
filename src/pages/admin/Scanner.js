import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  ShieldCheck, Loader2, Camera, UserCheck, 
  AlertTriangle, Clock, History, Users, Search, ChevronRight, Trash2 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Scanner = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    const fetchInitialCount = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in')
        .gte('created_at', today);
      
      if (!error) setTotalScanned(count || 0);
    };
    fetchInitialCount();
  }, []);

  const processCheckIn = async (identifier) => {
    if (!identifier) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, events(title), students(name, surname, roll_number)')
        .or(`id.eq.${identifier}, student_email.eq.${identifier}`)
        .single();

      if (error || !data) {
        setScanResult({ type: 'error', message: 'ID NOT FOUND' });
        toast.error("INVALID IDENTITY: Access Denied");
      } else if (data.status === 'checked_in') {
        setScanResult({ type: 'warning', message: 'ALREADY IN' });
        toast.error(`VOID: Used by ${data.students?.name}`, { icon: '⚠️' });
      } else {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'checked_in' })
          .eq('id', data.id);

        if (updateError) throw updateError;

        setScanResult({ type: 'success', message: 'VERIFIED' });
        setTotalScanned(prev => prev + 1);
        
        const newEntry = {
          id: data.id,
          name: `${data.students?.name} ${data.students?.surname}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          event: data.events?.title
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 5));
        toast.success(`VERIFIED: Welcome, ${data.students?.name}`);
      }
    } catch (err) {
      toast.error("Database Link Error");
    } finally {
      setIsVerifying(false);
      setManualId('');
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { 
      qrbox: { width: 250, height: 250 }, 
      fps: 15,
      aspectRatio: 1.0 
    });
    
    scanner.render((decodedText) => {
      if (decodedText !== lastScan) {
        setLastScan(decodedText);
        processCheckIn(decodedText);
      }
    });

    return () => scanner.clear();
  }, [lastScan]);

  const clearHistory = () => {
    setHistory([]);
    toast.success("Activity Log Cleared");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 flex flex-col items-center selection:bg-blue-500/30">
      
      {/* --- LIVE STATS --- */}
      <div className="w-full max-w-md flex items-center justify-between mb-10 bg-blue-600/5 border border-blue-500/20 p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <div>
           <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[10px] mb-1">Gate Admissions</p>
           <h2 className="text-4xl font-black italic tracking-tighter leading-none">{totalScanned} <span className="text-slate-600 text-lg not-italic">Scanned</span></h2>
        </div>
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
           <Users className="text-white" size={28} />
        </div>
      </div>

      <header className="w-full max-w-md mb-8 px-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <ShieldCheck className="text-blue-500" size={24} />
           <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Gate Protocol</p>
        </div>
        {scanResult?.type === 'warning' && <AlertTriangle className="text-yellow-500 animate-pulse" size={20} />}
      </header>
      
      {/* --- SCANNER INTERFACE --- */}
      <div className={`w-full max-w-md p-2 rounded-[3rem] border-2 transition-all duration-500 shadow-2xl overflow-hidden ${
        scanResult?.type === 'success' ? 'border-green-500 bg-green-500/5' : 
        scanResult?.type === 'error' ? 'border-red-500 bg-red-500/5' :
        scanResult?.type === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
        'border-white/10 bg-slate-900'
      }`}>
        <div id="reader" className="overflow-hidden rounded-[2.5rem]"></div>
      </div>

      {/* --- STATUS OVERLAY --- */}
      <div className="mt-8 w-full max-w-md text-center h-20">
        {isVerifying ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-blue-500" size={28} />
            <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest">Verifying Identity...</p>
          </div>
        ) : scanResult ? (
          <p className={`text-2xl font-black uppercase italic tracking-tighter ${
            scanResult.type === 'success' ? 'text-green-500' : 
            scanResult.type === 'error' ? 'text-red-500' : 'text-yellow-500'
          }`}>
            {scanResult.message}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <Camera size={24} className="text-slate-400" />
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.4em]">Awaiting QR Capture</p>
          </div>
        )}
      </div>

      {/* --- MANUAL ENTRY --- */}
      <div className="mt-6 w-full max-w-md space-y-4">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Manual ID / Email Check-in..."
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && processCheckIn(manualId)}
            className="w-full pl-14 pr-20 py-5 bg-slate-900/80 border border-white/5 rounded-[2rem] outline-none focus:border-blue-500/50 text-xs font-bold uppercase tracking-widest transition-all"
          />
          <button 
            onClick={() => processCheckIn(manualId)}
            disabled={!manualId || isVerifying}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl transition-all active:scale-90"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* --- SCANNER HISTORY --- */}
      <div className="mt-12 w-full max-w-md space-y-6">
        <div className="flex items-center justify-between px-2 text-slate-400 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <History size={18} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Activity Log</h3>
          </div>
          <button 
            onClick={clearHistory}
            className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-xl transition-all"
            title="Clear History"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
              <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">No Session Records</p>
            </div>
          ) : (
            history.map((entry, index) => (
              <div key={index} className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 flex items-center justify-between group animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase italic tracking-tight text-white">{entry.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{entry.event}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-blue-400 mb-1 justify-end font-black text-[10px]">
                    <Clock size={12} /> {entry.time}
                  </div>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">ID: {entry.id.slice(0,8)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;