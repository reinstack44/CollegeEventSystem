import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, ArrowRight, User, Phone, GraduationCap, Zap, Fingerprint, Globe } from 'lucide-react';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ name: '', surname: '', phone: '', urn: '', school: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isGuest, setIsGuest] = useState(false); 
  
  const schools = [
    "School of Engineering", "School of Management", "School of Liberal Arts", 
    "School of Design", "School of Film & Media", "School of Architecture", "School of Law"
  ];

  useEffect(() => {
    const verifyAccessAndRegistration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = "/";
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          const { data: existingStudent } = await supabase
            .from('students')
            .select('email')
            .eq('email', user.email)
            .maybeSingle();
          
          if (existingStudent) {
            window.location.href = "/events"; 
            return;
          }

          const emailDomain = user.email.split('@')[1];
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id')
            .eq('domain', emailDomain)
            .maybeSingle();

          if (!orgData) {
            setIsGuest(true);
          }
        }
      } catch (error) {
        console.error("Verification Error:", error);
        window.location.href = "/";
      } finally {
        setIsChecking(false);
      }
    };
    
    verifyAccessAndRegistration();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading('Creating your account...');

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: formData.password });
      if (authError) throw new Error("Unable to set password. Please try a different one.");

      const { data: { user } } = await supabase.auth.getUser();

      const finalUrn = isGuest ? `GUEST-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : formData.urn;
      const finalSchool = isGuest ? 'External Guest' : formData.school;

      const { error: dbError } = await supabase.from('students').insert([{
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        urn: finalUrn,
        school: finalSchool,
        email: user.email
      }]);

      if (dbError) throw new Error("Unable to finalize account. URN or Phone might already be registered.");

      toast.success(isGuest ? "Guest account created!" : "Student account created!", { id: loadToast });
      window.location.href = "/events";
    } catch (error) {
      toast.error(error.message || "An unexpected error occurred.", { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48} /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      <div className="absolute top-[10%] left-[-10%] w-75 md:w-125 h-75 md:h-125 bg-blue-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className={`absolute bottom-[-10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 rounded-full blur-[120px] -z-10 pointer-events-none ${isGuest ? 'bg-orange-600/10' : 'bg-emerald-600/10'}`} />

      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500">
        
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/40 via-[#0a0f1d]/90 to-[#0a0f1d] z-10" />
          <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2070" alt="Nexus Tech" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              {isGuest ? <Globe size={32} className="text-orange-400" /> : <ShieldCheck size={32} className="text-blue-400" />}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              Create <br/>
              {isGuest ? 'Guest' : 'Student'} <br/>
              <span className={isGuest ? "text-orange-500" : "text-blue-500"}>Account</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              {isGuest ? "Create your guest profile to book public events." : "Complete your profile to unlock university events."}
            </p>
          </div>
        </div>

        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative bg-linear-to-b from-transparent to-[#0a0f1d]/50">
          <div className="mb-8">
             <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">{isGuest ? 'Guest Registration' : 'Student Registration'}</h2>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Finalize your account details</p>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">First Name</label>
                <div className="relative flex items-center group">
                  <User className="absolute left-4 text-slate-500 group-focus-within:text-blue-500" size={16} />
                  <input name="name" placeholder="First" onChange={handleChange} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold outline-none" required />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Last Name</label>
                <div className="relative flex items-center group">
                   <input name="surname" placeholder="Last" onChange={handleChange} className="w-full px-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold outline-none" required />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Create Password</label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 text-slate-500 group-focus-within:text-blue-500" size={18} />
                <input name="password" type="password" placeholder="••••••••" onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold outline-none" required />
              </div>
            </div>

            <div className={`grid ${isGuest ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
              {!isGuest && (
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URN / Roll Number</label>
                  <div className="relative flex items-center group">
                    <Fingerprint className="absolute left-4 text-slate-500 group-focus-within:text-blue-500" size={16} />
                    <input name="urn" placeholder="e.g. 202201..." onChange={handleChange} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold outline-none" required={!isGuest} />
                  </div>
                </div>
              )}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
                <div className="relative flex items-center group">
                  <Phone className="absolute left-4 text-slate-500 group-focus-within:text-blue-500" size={16} />
                  <input name="phone" placeholder="+91..." onChange={handleChange} className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold outline-none" required />
                </div>
              </div>
            </div>

            {!isGuest && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your School / Department</label>
                <div className="relative flex items-center group">
                  <GraduationCap className="absolute left-4 text-slate-500 pointer-events-none" size={18} />
                  <select name="school" onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 rounded-2xl text-white text-sm font-bold appearance-none outline-none cursor-pointer" required={!isGuest}>
                    <option value="" className="bg-[#0a0f1d] text-slate-500">Select department...</option>
                    {schools.map(s => <option key={s} value={s} className="bg-[#0a0f1d]">{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button type="submit" disabled={loading} className={`w-full text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all ${isGuest ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}>
                {loading ? <Zap className="animate-pulse" size={18} /> : "Create Account"} 
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteRegistration;