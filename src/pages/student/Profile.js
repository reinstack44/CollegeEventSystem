import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { Mail, Hash, Phone, Building2, BadgeCheck } from 'lucide-react';

const Profile = () => {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('students').select('*').eq('email', user.email).single();
        if (!error) setStudent(data);
      }
    };
    fetchProfile();
  }, []);

  if (!student) return (
    <div className="flex justify-center items-center h-96">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl dark:border dark:border-slate-800 overflow-hidden transition-all">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white text-center relative">
          <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-5xl font-black mx-auto mb-4 border border-white/30 shadow-2xl">
            {student.name ? student.name[0] : 'S'}
          </div>
          <h2 className="text-3xl font-black">{student.name} {student.surname}</h2>
          <div className="flex items-center justify-center gap-2 mt-2 opacity-90">
             <Mail size={16} /> <span>{student.email}</span>
          </div>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <ProfileCard icon={<Hash className="text-blue-500" />} label="URN Number" value={student.urn} />
          <ProfileCard icon={<Phone className="text-green-500" />} label="Contact" value={student.phone} />
          <ProfileCard icon={<Building2 className="text-orange-500" />} label="School" value={student.school} />
          <ProfileCard icon={<BadgeCheck className="text-purple-500" />} label="Status" value="Verified Student" />
        </div>
      </div>
    </div>
  );
};

const ProfileCard = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02]">
    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      {icon}
    </div>
    <div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{value}</p>
    </div>
  </div>
);

export default Profile;