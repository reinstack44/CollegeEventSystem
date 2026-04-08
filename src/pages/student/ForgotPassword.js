import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, KeyRound, Zap } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith('@adypu.edu.in')) {
      toast.error("Access Denied: Use @adypu.edu.in email.");
      return;
    }
    setLoading(true);
    const loadToast = toast.loading('Sending reset link...');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;
      toast.success("Reset link sent! Check your university inbox.", { id: loadToast });
    } catch (error) {
      toast.error(error.message || "Request failed", { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center px-4 bg-[#0a0f1d]">
      <div className="bg-[#111827] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
        
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <KeyRound size={32} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic">Reset Access</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">Enter email to recover account</p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">University Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="email" 
                placeholder="name@adypu.edu.in" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            {loading ? <Zap className="animate-pulse" size={18} /> : "SEND RESET LINK"}
          </button>

          <div className="pt-4 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;