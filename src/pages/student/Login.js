import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith('@adypu.edu.in')) {
      toast.error("Access Denied: Use @adypu.edu.in email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate('/events');
    } catch (error) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-24 px-4 bg-[#0a0f1d]">
      <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-slate-800 w-full max-w-md shadow-2xl">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Student Login</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Access Command Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">University Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-500" size={18} />
              <input type="email" placeholder="name@adypu.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white text-sm focus:border-blue-500 outline-none transition-all" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white text-sm focus:border-blue-500 outline-none transition-all" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
            {loading ? <Zap className="animate-pulse" size={20} /> : "SIGN IN"} <ArrowRight size={20} />
          </button>

          <div className="pt-6 text-center border-t border-slate-800/50">
            <p className="text-slate-500 text-xs font-medium">
              New student?{' '}
              <Link to="/signup" className="text-blue-500 font-black uppercase tracking-widest hover:underline transition-all">
                Register Here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;