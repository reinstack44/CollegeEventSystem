import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldAlert, CheckCircle, XCircle, Zap, Search, Clock, ShieldCheck } from 'lucide-react';

const VerifyPayments = () => {
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPending = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, utr_number, amount_expected, created_at, student_email,
          events ( title, price )
        `)
        .eq('status', 'pending')
        .not('utr_number', 'is', null) // Only fetch ones where the student entered a UTR manually
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingClaims(data || []);
    } catch (error) {
      toast.error("Failed to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    
    // Auto-refresh when new claims come in
    const channel = supabase.channel('pending_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: "status=eq.pending" }, fetchPending)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleApprove = async (bookingId) => {
    const toastId = toast.loading("Verifying Identity...");
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'verified' })
        .eq('id', bookingId);
      
      if (error) throw error;
      toast.success("Pass Authorized!", { id: toastId });
      setPendingClaims(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      toast.error("Verification failed.", { id: toastId });
    }
  };

  const handleReject = async (bookingId) => {
    if (!window.confirm("Are you sure? This will delete their booking request.")) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      toast.success("Fraudulent claim rejected.");
      setPendingClaims(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      toast.error("Rejection failed.");
    }
  };

  const filteredClaims = pendingClaims.filter(c => 
    c.utr_number?.includes(searchQuery) || c.student_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-emerald-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] p-6 text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><ShieldAlert className="text-emerald-500" size={24} /></div>
              <span className="text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px]">Manual Audits</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Pending Clearances</h2>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" placeholder="Search UTR or Email..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-slate-800 rounded-2xl outline-none focus:border-emerald-500 text-xs font-bold"
            />
          </div>
        </header>

        {filteredClaims.length === 0 ? (
          <div className="text-center py-20 bg-[#111827] rounded-[3rem] border border-dashed border-white/5">
            <ShieldCheck size={48} className="mx-auto text-emerald-500/50 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Zero Pending Claims. The system is operating perfectly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredClaims.map((claim) => (
              <div key={claim.id} className="bg-[#111827] border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-emerald-500/50">
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10}/> Pending Audit
                    </span>
                    <h3 className="text-lg font-black uppercase italic text-white">{claim.events?.title}</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400">{claim.student_email}</p>
                  
                  <div className="pt-2 flex flex-wrap gap-4">
                    <div className="bg-[#0a0f1d] px-4 py-2 rounded-xl border border-slate-800">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Claimed UTR</p>
                      <p className="font-mono text-emerald-400 font-bold tracking-[0.2em]">{claim.utr_number}</p>
                    </div>
                    <div className="bg-[#0a0f1d] px-4 py-2 rounded-xl border border-slate-800">
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Expected Amount</p>
                      <p className="font-mono text-white font-bold tracking-widest">₹{claim.amount_expected}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
                  <button onClick={() => handleApprove(claim.id)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-500/30 transition-all font-black text-[10px] uppercase tracking-widest">
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button onClick={() => handleReject(claim.id)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPayments;