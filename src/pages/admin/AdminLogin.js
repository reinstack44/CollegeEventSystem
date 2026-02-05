import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

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
      // Step 1: Attempt standard login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Step 2: AUTHORITY CHECK - Only allow generic admin email
      const authorizedAdmins = ['admin@activearch.in'];

      if (!authorizedAdmins.includes(data.user.email)) {
        // If they are not an authorized admin, log them out immediately
        await supabase.auth.signOut();
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
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-16 md:pt-24 px-4 bg-[#020617]">
      <div className="bg-slate-900/50 p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-blue-500/10 w-full max-w-md backdrop-blur-xl">
        
        <div className="mb-10 text-center">
          {/* Blue Secure Theme with ShieldCheck icon */}
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic">Admin Portal</h2>
          <p className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em]">Secure Access Required</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Admin Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="email" 
                placeholder="admin@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Security Key</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : "AUTHORIZE ACCESS"} <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;