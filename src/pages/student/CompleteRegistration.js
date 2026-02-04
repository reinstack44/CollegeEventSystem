import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, ArrowRight, User, Phone, GraduationCap } from 'lucide-react';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ name: '', surname: '', phone: '', urn: '', school: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  const schools = [
    "School of Engineering", 
    "School of Management", 
    "School of Liberal Arts", 
    "School of Design", 
    "School of Film & Media"
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

      // Step 2: Insert into 'students' table. Matches your SQL schema using 'urn'
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
    <div className="min-h-[calc(100vh-64px)] flex justify-center items-start pt-12 md:pt-20 px-4 bg-slate-950 transition-colors duration-500">
      <form onSubmit={handleFinalSubmit} className="bg-[#0f172a] p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-800 w-full max-w-lg transition-all">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Final Verification</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Complete your profile to access tickets</p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">First Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-500" size={16} />
                <input name="name" placeholder="John" onChange={handleChange} className="w-full pl-11 p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Last Name</label>
              <input name="surname" placeholder="Doe" onChange={handleChange} className="w-full p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Create Secure Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={18} />
              <input name="password" type="password" placeholder="••••••••" onChange={handleChange} className="w-full pl-12 p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URN Number</label>
              <input name="urn" placeholder="202201..." onChange={handleChange} className="w-full p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-4 text-slate-500" size={16} />
                <input name="phone" placeholder="+91..." onChange={handleChange} className="w-full pl-11 p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium transition-all" required />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your School/Department</label>
            <div className="relative flex items-center">
              {/* FIXED: GraduationCap is now used here */}
              <GraduationCap className="absolute left-4 text-slate-500" size={18} />
              <select name="school" onChange={handleChange} className="w-full pl-12 p-3.5 bg-slate-900/50 border border-slate-800 focus:border-blue-500 rounded-2xl outline-none text-white text-sm font-medium appearance-none transition-all cursor-pointer" required>
                <option value="" className="bg-slate-900">Select Department</option>
                {schools.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group transition-all mt-6 active:scale-95">
            {loading ? "VERIFYING..." : "COMPLETE REGISTRATION"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-[9px] text-center font-black text-slate-600 uppercase tracking-widest mt-6">
            © ActiveArch {new Date().getFullYear()}
          </p>
        </div>
      </form>
    </div>
  );
};

export default CompleteRegistration;