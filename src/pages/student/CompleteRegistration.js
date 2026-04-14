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
    "School of Engineering", 
    "School of Management", 
    "School of Liberal Arts", 
    "School of Design", 
    "School of Film & Media",
    "School of Architecture",
    "School of Law"
  ];

  useEffect(() => {
    const verifyAccessAndRegistration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Session expired. Please start over.");
          window.location.href = "/";
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          // 1. Block existing users
          const { data: existingStudent } = await supabase
            .from('students')
            .select('email')
            .eq('email', user.email)
            .maybeSingle();
          
          if (existingStudent) {
            toast.error("This email account is already registered with us.");
            await supabase.auth.signOut(); 
            window.location.href = "/login"; 
            return;
          }

          // 2. Determine if the user is a Student or a Guest based on Domain
          const emailDomain = user.email.split('@')[1];
          
          // Check if this domain matches any registered organization in your platform
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id')
            .eq('domain', emailDomain)
            .maybeSingle();

          // If the domain is not found in your orgs table, they are a guest
          if (!orgData) {
            setIsGuest(true);
          }
        }
      } catch (error) {
        console.error("Verification Error:", error);
        toast.error("Unable to verify secure session. Please try again.");
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
    const loadToast = toast.loading('Securing your account...');

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: formData.password });
      if (authError) throw new Error("Unable to set secure password. Please try a different one.");

      const { data: { user } } = await supabase.auth.getUser();

      // Safely generate fallback values for Guests so the database doesn't crash on null constraints
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

      if (dbError) throw new Error("Unable to create profile. Ensure your details are correct.");

      toast.success(isGuest ? "Guest profile ready!" : "Student profile verified!", { id: loadToast });
      window.location.href = "/events";
    } catch (error) {
      toast.error(error.message || "An unexpected error occurred. Please try again.", { id: loadToast });
    } finally {
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
      <div className={`absolute bottom-[-10%] right-[-10%] w-75 md:w-125 h-75 md:h-125 rounded-full blur-[120px] -z-10 pointer-events-none ${isGuest ? 'bg-orange-600/10' : 'bg-emerald-600/10'}`} />

      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:border-white/10">
        
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/40 via-[#0a0f1d]/90 to-[#0a0f1d] z-10" />
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2070" 
            alt="Nexus Tech" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
          
          <div className="relative z-20">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
              {isGuest ? <Globe size={32} className="text-orange-400" /> : <ShieldCheck size={32} className="text-blue-400" />}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight drop-shadow-2xl">
              Finalize <br/>
              {isGuest ? 'Guest' : 'Identity'} <br/>
              <span className={isGuest ? "text-orange-500" : "text-blue-500"}>Profile</span>
            </h1>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
              {isGuest 
                ? "Complete your guest profile to browse and book public events." 
                : "Complete your student profile to initialize your account and unlock access to university events."}
            </p>
          </div>

          <div className="relative z-20 pt-12 flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full animate-pulse ${isGuest ? 'bg-orange-500' : 'bg-emerald-500'}`} />
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
               {isGuest ? 'Public Access Granted' : 'Secure Connection Established'}
             </p>
          </div>
        </div>

        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative bg-linear-to-b from-transparent to-[#0a0f1d]/50">
          
          <div className="md:hidden absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50" />

          <div className="md:hidden mb-10 text-center">
            <div className={`w-14 h-14 border rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isGuest ? 'bg-orange-600/10 border-orange-500/20 text-orange-500 shadow-orange-500/10' : 'bg-blue-600/10 border-blue-500/20 text-blue-500 shadow-blue-500/10'}`}>
              {isGuest ? <Globe size={24} /> : <ShieldCheck size={24} />}
            </div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">Final Verification</h2>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">{isGuest ? 'Guest Profile' : 'Complete your profile'}</p>
          </div>

          <div className="hidden md:block mb-8">
             <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-1">{isGuest ? 'Guest Access' : 'Identity Verification'}</h2>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{isGuest ? 'Set up your public profile' : 'Complete your student profile'}</p>
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

            {/* FULL WIDTH PHONE INPUT FOR GUESTS, HALF WIDTH FOR STUDENTS */}
            <div className={`grid ${isGuest ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
              {!isGuest && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URN / Roll Number</label>
                  <div className="relative flex items-center group">
                    <Fingerprint className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                    <input 
                       name="urn" 
                       placeholder="e.g. 202201..." 
                       onChange={handleChange} 
                       className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide outline-none transition-all duration-300 shadow-inner" 
                       required={!isGuest}
                    />
                  </div>
                </div>
              )}
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

            {!isGuest && (
              <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your School / Department</label>
                <div className="relative flex items-center group">
                  <GraduationCap className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" size={18} />
                  <select 
                    name="school" 
                    onChange={handleChange} 
                    className="w-full pl-12 pr-4 py-3.5 bg-[#0f172a] border border-white/5 focus:border-blue-500 focus:bg-[#111827] rounded-2xl text-white text-sm font-bold tracking-wide appearance-none outline-none transition-all duration-300 shadow-inner cursor-pointer" 
                    required={!isGuest}
                  >
                    <option value="" className="bg-[#0a0f1d] text-slate-500">Select your department...</option>
                    {schools.map(s => <option key={s} value={s} className="bg-[#0a0f1d]">{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className={`w-full text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed ${isGuest ? 'bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.6)]' : 'bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.6)]'}`}
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