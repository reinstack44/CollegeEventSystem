import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { Mail, Hash, Phone, Building2, BadgeCheck, Flag, ShieldAlert } from 'lucide-react';

const Profile = () => {
  const [student, setStudent] = useState(null);
  const [highestRole, setHighestRole] = useState('Loading...');
  const [rawRole, setRawRole] = useState('student');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch Student Details
        const { data, error } = await supabase.from('students').select('*').eq('email', user.email).single();
        if (!error) setStudent(data);

        // Securely Fetch and Determine Role
        const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
        if (adminEmails.includes(user.email)) {
           setHighestRole('Super Admin');
           setRawRole('super_admin');
        } else {
           const { data: roleData } = await supabase.from('user_roles').select('role').eq('email', user.email);
           if (roleData && roleData.length > 0) {
              if (roleData.some(r => r.role === 'org_head')) {
                  setHighestRole('Organization Head');
                  setRawRole('org_head');
              }
              else if (roleData.some(r => r.role === 'club_head')) {
                  setHighestRole('Club Lead');
                  setRawRole('club_head');
              }
           } else {
              setHighestRole('Verified Student');
              setRawRole('student');
           }
        }
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
        <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-10 text-white text-center relative">
          <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-4xl flex items-center justify-center text-5xl font-black mx-auto mb-4 border border-white/30 shadow-2xl">
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
          <ProfileCard icon={<BadgeCheck className="text-purple-500" />} label="Status" value={highestRole} />
        </div>

        {/* DYNAMIC DASHBOARD SHORTCUTS FOR AUTHORIZED USERS */}
        {rawRole !== 'student' && (
          <div className="px-10 pb-10">
             <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Management Access</p>
                
                {rawRole === 'club_head' && (
                  <Link to="/club/my-clubs" className="flex items-center justify-center gap-2 w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(236,72,153,0.2)] active:scale-95">
                     <Flag size={16} /> Open Club Dashboard
                  </Link>
                )}
                
                {rawRole === 'org_head' && (
                  <Link to="/org/dashboard" className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-95">
                     <Building2 size={16} /> Open Org Dashboard
                  </Link>
                )}
                
                {rawRole === 'super_admin' && (
                  <Link to="/admin" className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-95">
                     <ShieldAlert size={16} /> Open Admin Panel
                  </Link>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileCard = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02]">
    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      {icon}
    </div>
    <div className="text-left">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

export default Profile;