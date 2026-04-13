import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ScanFace, Chrome } from 'lucide-react';

const Signup = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const loadToast = toast.loading('Connecting to University Portal...');

    try {
      // Initiate OAuth flow. 
      // Supabase handles the redirect to Google and back.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            hd: 'adypu.edu.in', 
            prompt: 'select_account' // Forces them to pick the right account if they have multiple
          },
          // Redirects to CompleteRegistration where we will check if they already exist
          redirectTo: window.location.origin + '/complete-registration'
        }
      });

      if (error) throw error;

    } catch (error) {
      console.error("Auth Error:", error);
      toast.error("Unable to connect to Google workspace. Please try again.", { id: loadToast });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-75 md:w-125 h-75 md:h-125 bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Main Glassmorphism Container */}
      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-white/10">
        
        {/* LEFT PANEL: Visual Branding (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-linear-to-tr from-blue-900/40 via-[#0a0f1d]/90 to-[#0a0f1d] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070" 
            alt="Nexus Tech" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
          
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              <ScanFace size={32} className="text-blue-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              Verify <br/>
              Student <br/>
              <span className="text-blue-500">Identity</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              Secure your account using your official university Google account.
            </p>
          </div>

          <div className="relative z-20 pt-12">
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">
              Nexus<span className="text-blue-500">Circle</span>
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Official Event Host</p>
          </div>
        </div>

        {/* RIGHT PANEL: Form Area */}
        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative bg-linear-to-b from-transparent to-[#0a0f1d]/50">
          
          <div className="md:hidden absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50" />

          <div className="md:hidden mb-10 text-center">
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10">
              <ScanFace size={24} />
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Get Started</h2>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">Verify Credentials</p>
          </div>

          <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-white/5 w-full mb-10 shadow-inner">
             <Link to="/login" className="flex-1 py-3 text-center rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-slate-500 hover:text-white cursor-pointer">
               Student Login
             </Link>
             <div className="flex-1 py-3 text-center rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-blue-600 text-white shadow-md cursor-default">
               Register (New Acc)
             </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 text-center shadow-inner">
              <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">
                To maintain event security, access is strictly restricted to active students. You must authenticate using your official <span className="text-white">@adypu.edu.in</span> workspace account.
              </p>

              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Chrome size={18} className="text-blue-600" />} 
                {loading ? "Authenticating..." : "Sign in with University Google"}
              </button>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                By authenticating, you accept the university <br className="hidden sm:block"/> portal access terms & conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;