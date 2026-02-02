import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Updating security credentials...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully!", { id: loadToast });
      navigate('/login');
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-24 px-4 transition-colors duration-500">
      {/* Dark Blue/Slate Card Styling */}
      <div className="bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-md transition-all">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
             <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">Secure Reset</h2>
          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Update your ADYPU account password</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
            <div className="relative flex items-center">
              {/* Corrected Absolute Icon Positioning */}
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:bg-slate-400"
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
           <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-4">
             <ShieldCheck size={14} />
             Cybersecurity Protocol Active
           </div>
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              © ActiveArch {new Date().getFullYear()}
           </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;