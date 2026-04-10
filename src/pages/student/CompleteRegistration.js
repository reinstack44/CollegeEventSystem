import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, ArrowRight, User, Phone, GraduationCap, Zap, Fingerprint } from 'lucide-react';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ name: '', surname: '', phone: '', urn: '', school: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  const schools = [
    "School of Engineering", 
    "School of Management", 
    "School of Liberal Arts", 
    "School of Design", 
    "School of Film & Media",
    "School of Architecture",
    "School of Law"
  ];

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please start over.");
        window.location.href = "/";
      }
    };
    checkSession();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Securing your account...');

    try {
      // Step 1: Set the user's password for future logins
      const { error: authError } = await supabase.auth.updateUser({ password: formData.password });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();

      // Step 2: Insert into 'students' table. Matches SQL schema using 'urn'
      const { error: dbError } = await supabase.from('students').insert([{
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        urn: formData.urn,
        school: formData.school,
        email: user.email
      }]);

      if (dbError) throw dbError;

      toast.success("Profile verified! Welcome aboard.", { id: loadToast });
      window.location.href = "/events";
    } catch (error) {
      toast.error(error.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[10%] left-[-10%] w-75 md:w-125 h-75 md:h-125 bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 bg-emerald-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Main Glassmorphism Container */}
      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-white/10">
        
        {/* LEFT PANEL: Visual Branding (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          {/* High-Tech Background Image overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/40 via-[#0a0f1d]/90 to-[#0a0f1d] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2070" 
            alt="Nexus Tech" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
          
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              <ShieldCheck size={32} className="text-blue-400" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              Finalize <br/>
              Identity <br/>
              <span className="text-blue-500">Registry</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              Complete your student profile to initialize your account and unlock access to university events.
            </p>
          </div>

          <div className="relative z-20 pt-12 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Secure Connection Established</p>
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
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Final Verification</h2>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">Complete your profile</p>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block mb-8">
             <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Identity Verification</h2>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Complete your student profile</p>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">First Name</label>
                <div className="relative flex items-center group">
                  <User className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                  <input 
                     name="name" 
                     placeholder="First" 
                     onChange={handleChange} 
                     className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                     required 
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Last Name</label>
                <div className="relative flex items-center group">
                   <input 
                      name="surname" 
                      placeholder="Last" 
                      onChange={handleChange} 
                      className="w-full px-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                      required 
                   />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Create Secure Password</label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={18} />
                <input 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
                  onChange={handleChange} 
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URN / Roll Number</label>
                <div className="relative flex items-center group">
                  <Fingerprint className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                  <input 
                     name="urn" 
                     placeholder="e.g. 202201..." 
                     onChange={handleChange} 
                     className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                     required 
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
                <div className="relative flex items-center group">
                  <Phone className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                  <input 
                     name="phone" 
                     placeholder="+91..." 
                     onChange={handleChange} 
                     className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                     required 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your School / Department</label>
              <div className="relative flex items-center group">
                <GraduationCap className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" size={18} />
                <select 
                  name="school" 
                  onChange={handleChange} 
                  className="w-full pl-12 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide appearance-none outline-none transition-all duration-300 shadow-inner cursor-pointer" 
                  required
                >
                  <option value="" className="bg-[#0a0f1d] text-slate-500">Select your department...</option>
                  {schools.map(s => <option key={s} value={s} className="bg-[#0a0f1d]">{s}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Zap className="animate-pulse" size={18} /> : "Complete Registration"} 
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
            
            <p className="text-[9px] text-center font-black text-slate-600 uppercase tracking-widest mt-6 pt-4 border-t border-white/5">
              © NexusCircle {new Date().getFullYear()}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteRegistration;