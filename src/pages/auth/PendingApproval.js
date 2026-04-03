import React, { useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, ArrowLeft } from 'lucide-react';

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Prevent back-button routing issues
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4 selection:bg-yellow-500/30 relative overflow-hidden">
      
      {/* Cinematic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center">
        
        {/* Animated Icon Container */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping opacity-75"></div>
          <div className="w-28 h-28 bg-[#111827] rounded-full border-2 border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)] flex items-center justify-center relative z-10">
            <Clock size={48} className="text-yellow-500" />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white mb-4">
          Application Processing
        </h1>
        
        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 px-4">
          Your organization's profile and identity documents have been securely transmitted to the NexusCircle compliance team. 
          <br/><br/>
          <strong className="text-white">Verification may take up to 24 hours.</strong> Once approved, you will gain full access to the Organization Admin Dashboard.
        </p>

        <div className="bg-[#111827]/50 border border-slate-800 rounded-2xl p-5 flex items-start gap-4 mb-10 text-left w-full">
          <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Security Notice</h4>
            <p className="text-xs text-slate-500 leading-relaxed">If our team requires additional information to verify your domain or identity, we will reach out to your registered official email address.</p>
          </div>
        </div>

        <button 
          onClick={handleSignOut} 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all w-full md:w-auto"
        >
          <ArrowLeft size={16} /> Sign Out & Return Home
        </button>

      </div>
    </div>
  );
};

export default PendingApproval;