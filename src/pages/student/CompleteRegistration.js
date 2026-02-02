import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ name: '', surname: '', phone: '', urn: '', school: '', password: '' });
  const [loading, setLoading] = useState(false);
  const schools = ["School of Engineering", "School of Law", "School of Management"];

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
      const { error: authError } = await supabase.auth.updateUser({ password: formData.password });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();

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
    <div className="min-h-screen flex justify-center items-center py-12 px-4">
      <form onSubmit={handleFinalSubmit} className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:border dark:border-slate-800 w-full max-w-lg transition-all">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Complete Profile</h2>
            <p className="text-slate-500 text-sm">One last step to verify your identity.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 ml-2">FIRST NAME</label>
              <input name="name" onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 ml-2">LAST NAME</label>
              <input name="surname" onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-2">CREATE PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-300" size={18} />
              <input name="password" type="password" onChange={handleChange} className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 ml-2">URN NUMBER</label>
              <input name="urn" onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 ml-2">PHONE</label>
              <input name="phone" onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-2">SCHOOL</label>
            <select name="school" onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none" required>
              <option value="">Select your department</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 group transition-all mt-4">
            {loading ? "SAVING..." : "COMPLETE REGISTRATION"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompleteRegistration;