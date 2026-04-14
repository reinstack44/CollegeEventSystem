import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, ShieldCheck, Zap, Command, Chrome } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { user } = session;
          const { data: student } = await supabase
            .from('students')
            .select('email')
            .eq('email', user.email)
            .maybeSingle();

          if (student) {
            navigate('/events');
          } else {
            navigate('/complete-registration');
          }
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const loadToast = toast.loading('Connecting to Google...');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: { prompt: 'select_account' },
          // CHANGED THIS: Force redirect straight to the registration gatekeeper!
          redirectTo: window.location.origin + '/complete-registration'
        }
      });

      if (error) throw new Error("Unable to connect to Google workspace.");

    } catch (error) {
      toast.error(error.message || "Authentication failed. Please try again.", { id: loadToast });
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading("Authenticating...");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Invalid email or password.");
      
      toast.success("Welcome back!", { id: loadToast });
      navigate('/events');
    } catch (error) {
      toast.error(error.message, { id: loadToast });
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1d] flex items-center justify-center">
        <Zap className="animate-pulse text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      <div className="absolute top-[10%] left-[-10%] w-75 md:w-125 h-75 md:h-125 bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-white/10">
        
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/60 via-[#0a0f1d]/90 to-[#0a0f1d] z-10" />
          <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070" alt="University Event" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              <ShieldCheck size={32} className="text-blue-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              Welcome <br/>
              To The <br/>
              <span className="text-blue-500">PLATFORM</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              Login to access university events, manage passes, and explore public fests.
            </p>
          </div>
          <div className="relative z-20 pt-12">
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Nexus<span className="text-blue-500">Circle</span></h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Official Event Host</p>
          </div>
        </div>

        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative bg-linear-to-b from-transparent to-[#0a0f1d]/50">
          <div className="md:hidden absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50" />
          
          <div className="md:hidden mb-10 text-center">
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Portal Login</h2>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">Access Your Events</p>
          </div>

          <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-white/5 w-full mb-10 shadow-inner">
             <div className="flex-1 py-3 text-center rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-blue-600 text-white shadow-md cursor-default">Student Login</div>
             <Link to="/signup" className="flex-1 py-3 text-center rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-slate-500 hover:text-white cursor-pointer">Register (New Acc)</Link>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mb-6"
          >
            {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Chrome size={18} className="text-blue-600" />} 
            {loading ? "Authenticating..." : "Sign in with Google"}
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-full border-t border-white/10"></div>
            <span className="bg-[#0f172a] px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest relative z-10">OR CONTINUE WITH EMAIL</span>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
              <div className="relative flex items-center group">
                <Mail className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={18} />
                <input type="email" placeholder="name@adypu.edu.in or Guest Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" required />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-end px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">Forgot Password?</Link>
              </div>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={18} />
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" required />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="w-full bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <Zap className="animate-pulse" size={18} /> : "Sign In"} 
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>

            <div className="pt-6 mt-4">
              <Link to="/adminlogin" className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all duration-300 group">
                <Command size={14} className="group-hover:text-blue-400 transition-colors" /> Administrative Portal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;