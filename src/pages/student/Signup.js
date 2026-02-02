import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { Mail, Sparkles, ArrowRight } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Sending verification link...');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: `${window.location.origin}/events` },
      });
      if (error) throw error;
      toast.success("Verification link sent!", { id: loadToast });
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-16 md:pt-24 px-4 transition-colors duration-500">
      <div className="bg-[#0f172a] p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-md transition-all">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
             <Sparkles size={28} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Get Started</h2>
          <p className="text-slate-400 font-medium text-xs leading-relaxed uppercase tracking-widest">Verify your ADYPU credentials</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">University Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="email" placeholder="name@adypu.edu.in" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white transition-all text-sm font-medium shadow-inner" 
                required 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 transition-all">
            {loading ? "SENDING..." : "VERIFY EMAIL"} <ArrowRight size={20} />
          </button>

          <div className="mt-8 text-center border-t border-slate-800 pt-6">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">© ActiveArch {new Date().getFullYear()}</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;