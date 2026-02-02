import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Authenticating...');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!", { id: loadToast });
      navigate("/events"); 
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter email to reset password");
      return;
    }
    const loadToast = toast.loading('Sending reset link...');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`, 
      });
      if (error) throw error;
      toast.success("Reset link sent! Check your inbox.", { id: loadToast });
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-20 px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md transition-all">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Log in to your student account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">University Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="email" placeholder="name@adypu.edu.in" 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none text-slate-900 dark:text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password" placeholder="••••••••" 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 p-3.5 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none text-slate-900 dark:text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 group transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            {loading ? "VERIFYING..." : "SIGN IN"}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
          <Link to="/adminlogin" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold text-xs">
            <ShieldCheck size={16} />
            Administrator Access
          </Link>
          <p className="text-[11px] text-slate-500 font-medium">
            New here? <Link to="/" className="text-blue-600 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;