import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react'; // Removed AlertCircle

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "PASSWORD_RECOVERY") {
        // User could be redirected here manually, handle if necessary
      }
    });
  }, [navigate]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }

    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    setLoading(true);
    const loadToast = toast.loading('Updating security credentials...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated! Access restored.", { id: loadToast });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-24 px-4 bg-[#0a0f1d]">
      <div className="bg-[#111827] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-md relative overflow-hidden transition-all">
        {/* Updated Gradient Class */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
        
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
             <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-black text-white mb-1 uppercase italic tracking-tight">Secure Reset</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-[0.2em]">Enter your new credentials</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 text-left block">New Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 text-left block">Confirm Password</label>
            <div className="relative flex items-center">
              <ShieldCheck className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "UPDATING..." : "RESTORE ACCESS"}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/50">
           <div className="flex items-center justify-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em]">
             <ShieldCheck size={12} className="text-blue-500" />
             End-to-End Encryption Active
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;