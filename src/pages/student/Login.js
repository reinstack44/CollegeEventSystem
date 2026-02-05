import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2, Command } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.toLowerCase().endsWith('@adypu.edu.in')) {
      toast.error("Access Denied: Use your @adypu.edu.in email.");
      return;
    }

    setLoading(true);
    const loadToast = toast.loading('Authenticating...');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast.success("Welcome back!", { id: loadToast });
      navigate('/events');
    } catch (error) {
      toast.error(error.message || "Invalid credentials", { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-16 md:pt-24 px-4 bg-[#0a0f1d]">
      <div className="bg-[#111827] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-md transition-all">
        
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic">Student Login</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">Access Command Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
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

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : "SIGN IN"} <ArrowRight size={20} />
          </button>

          <div className="pt-6 space-y-4 text-center border-t border-slate-800/50">
            <p className="text-slate-500 text-xs font-medium">
              New student?{' '}
              <Link to="/" className="text-blue-500 font-black uppercase tracking-widest hover:underline">
                Register Here
              </Link>
            </p>

            <Link 
              to="/adminlogin" 
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all"
            >
              <Command size={14} /> Administrative Portal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;