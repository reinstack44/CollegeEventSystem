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
      // Redirect to login after successful reset
      navigate('/login');
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-24 px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md transition-all">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
             <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Secure Reset</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase tracking-widest">Update your ADYPU account password</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all text-sm font-medium" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:bg-slate-400"
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
             <ShieldCheck size={14} />
             Cybersecurity Protocol Active
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;