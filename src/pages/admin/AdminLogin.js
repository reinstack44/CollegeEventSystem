import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, ShieldCheck, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Verifying Administrative Credentials...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // SECURE BACKEND ROLE VERIFICATION
      // Fetch the role for this specific user from the database
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', data.user.email);

      if (roleError) throw new Error("Failed to verify access clearance.");

      // Check if they possess the required super_admin clearance
      const isAuthorized = roleData && roleData.some(r => r.role === 'super_admin');

      if (!isAuthorized) {
        await supabase.auth.signOut(); // Immediately revoke the session
        throw new Error("UNAUTHORIZED: Access restricted to primary administrator.");
      }

      toast.success("Command Center Access Granted", { id: loadToast });
      navigate('/admin');
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 bg-red-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-75 md:w-125 h-75 md:h-125 bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Main Glassmorphism Container */}
      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-white/10">
        
        {/* LEFT PANEL: Visual Branding (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          {/* High-Tech Background Image overlay (Server/Data theme for Admin) */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-950/60 via-[#0a0f1d]/95 to-[#0a0f1d] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2034" 
            alt="Nexus Admin Core" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
          
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              <ShieldCheck size={32} className="text-blue-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              System <br/>
              Administration <br/>
              <span className="text-blue-500">Core</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              Level 4 clearance required. Monitor, manage, and oversee the entire NexusCircle infrastructure.
            </p>
          </div>

          <div className="relative z-20 pt-12 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Restricted Access Area</p>
          </div>
        </div>

        {/* RIGHT PANEL: Form Area */}
        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative bg-linear-to-b from-transparent to-[#0a0f1d]/50">
          
          {/* Decorative Top Accent for Mobile */}
          <div className="md:hidden absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50" />

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden mb-10 text-center">
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Admin Portal</h2>
            <p className="text-blue-500 font-bold text-[9px] uppercase tracking-[0.3em]">Secure Access Required</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block mb-10">
             <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Identity Verification</h2>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Enter root credentials to continue</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Administrator Email</label>
              <div className="relative flex items-center group">
                <Mail className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={18} />
                <input 
                  type="email" 
                  placeholder="*****@gmail.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Key</label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={18} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                  required 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Zap className="animate-pulse" size={18} /> : "Authorize Access"} 
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>

            <div className="pt-6 mt-4 border-t border-white/5">
              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/5 transition-all duration-300 group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Student Portal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;