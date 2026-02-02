import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, Mail, ArrowRight, ChevronLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Authorizing Admin Access...');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast.success("Access Granted. Welcome, Admin.", { id: loadToast });
      navigate('/admin'); 
    } catch (error) {
      toast.error("Unauthorized: " + error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    // Added pt-12 and changed justify-center to items-start to fix the "too big" feel
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-24 px-4 transition-colors duration-500">
      {/* Reduced padding to p-8 to make the card more compact and professional */}
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl dark:shadow-none dark:border dark:border-slate-800 w-full max-w-md relative overflow-hidden transition-all">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-blue-600 dark:to-indigo-500" />
        
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
             <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Admin Portal</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase tracking-widest">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">System Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="admin@adypu.edu.in" 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all text-sm font-medium" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Root Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all text-sm font-medium" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3 group transition-all active:scale-95 disabled:bg-slate-400"
          >
            {loading ? "VERIFYING..." : "INITIALIZE LOGIN"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <button 
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-colors"
        >
          <ChevronLeft size={16} />
          Return to Student Portal
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;