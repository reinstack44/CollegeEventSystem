import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { Mail, Hash, Phone, Building2, BadgeCheck, Flag, ShieldAlert, Zap, ChevronRight, ArrowLeft } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
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

        // Securely Fetch and Determine Role from Database ONLY
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', user.email);

        if (!roleError && roleData && roleData.length > 0) {
           if (roleData.some(r => r.role === 'super_admin')) {
               setHighestRole('Super Admin');
               setRawRole('super_admin');
           } else if (roleData.some(r => r.role === 'org_head')) {
               setHighestRole('Organization Head');
               setRawRole('org_head');
           } else if (roleData.some(r => r.role === 'club_head')) {
               setHighestRole('Club Lead');
               setRawRole('club_head');
           } else {
               setHighestRole('Verified Student');
               setRawRole('student');
           }
        } else {
           // Fallback if no roles exist in the database for this user
           setHighestRole('Verified Student');
           setRawRole('student');
        }
      }
    };
    fetchProfile();
  }, []);

  if (!student) return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1d] flex items-center justify-center">
      <Zap className="animate-pulse text-blue-500" size={48} />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-8 bg-[#0a0f1d] relative z-0 overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-0 w-75 md:w-125 h-75 md:h-125 bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-75 md:w-125 h-75 md:h-125 bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Wrapper to hold Back Button and Card */}
      <div className="w-full max-w-2xl flex flex-col relative z-10">
        
        {/* --- BACK BUTTON --- */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors font-black text-[10px] uppercase tracking-widest mb-6 w-fit"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Main Glassmorphism Card */}
        <div className="w-full bg-[#111827]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:border-white/20">
          
          {/* Header Banner */}
          <div className="h-32 sm:h-40 w-full bg-linear-to-r from-blue-900/60 to-indigo-900/40 relative border-b border-white/5">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center mix-blend-overlay opacity-20 pointer-events-none"></div>
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
               <BadgeCheck size={14} className="text-blue-400" />
               <span className="text-[9px] font-black text-white uppercase tracking-widest">Verified Account</span>
            </div>
          </div>

          <div className="px-6 sm:px-10 pb-10 relative">
            {/* Overlapping Avatar */}
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-6 -mt-14 sm:-mt-16 mb-8 relative z-10">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#0f172a] border-4 border-[#111827] shadow-xl flex items-center justify-center text-4xl sm:text-5xl font-black text-blue-500 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-blue-500/10 to-transparent"></div>
                {student.name ? student.name[0] : 'S'}
              </div>
              
              <div className="mt-4 sm:mt-16 text-center sm:text-left flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter truncate">
                  {student.name} {student.surname}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-md border border-white/5 w-fit">
                      <Mail size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-300 tracking-wider truncate max-w-50 sm:max-w-none">{student.email}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
              <ProfileCard 
                icon={<Hash size={16} />} 
                iconColor="text-blue-400" 
                label="URN Number" 
                value={student.urn} 
              />
              <ProfileCard 
                icon={<Phone size={16} />} 
                iconColor="text-emerald-400" 
                label="Contact Number" 
                value={student.phone} 
              />
              <ProfileCard 
                icon={<Building2 size={16} />} 
                iconColor="text-orange-400" 
                label="University School" 
                value={student.school} 
              />
              <ProfileCard 
                icon={<BadgeCheck size={16} />} 
                iconColor="text-purple-400" 
                label="Clearance Level" 
                value={highestRole} 
              />
            </div>

            {/* Management Shortcuts (Dynamic) */}
            {rawRole !== 'student' && (
              <div className="pt-6 border-t border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldAlert size={12} /> Management Portals
                </p>
                
                {rawRole === 'club_head' && (
                  <Link to="/club/my-clubs" className="flex items-center justify-between w-full p-4 bg-linear-to-r from-pink-600/10 to-pink-600/5 hover:from-pink-600/20 border border-pink-500/20 hover:border-pink-500/40 rounded-xl transition-all group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded-lg"><Flag size={16} className="text-pink-400" /></div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white uppercase tracking-wider">Club Dashboard</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manage your club events</span>
                        </div>
                     </div>
                     <ChevronRight size={18} className="text-slate-500 group-hover:text-pink-400 transition-colors" />
                  </Link>
                )}
                
                {rawRole === 'org_head' && (
                  <Link to="/org/dashboard" className="flex items-center justify-between w-full p-4 bg-linear-to-r from-indigo-600/10 to-indigo-600/5 hover:from-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl transition-all group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><Building2 size={16} className="text-indigo-400" /></div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white uppercase tracking-wider">Organization Dashboard</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manage your university</span>
                        </div>
                     </div>
                     <ChevronRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                )}
                
                {rawRole === 'super_admin' && (
                  <Link to="/admin" className="flex items-center justify-between w-full p-4 bg-linear-to-r from-blue-600/10 to-blue-600/5 hover:from-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg"><ShieldAlert size={16} className="text-blue-400" /></div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-white uppercase tracking-wider">Admin Command</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global platform access</span>
                        </div>
                     </div>
                     <ChevronRight size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact, Professional Card Component
const ProfileCard = ({ icon, iconColor, label, value }) => (
  <div className="flex items-center gap-4 p-4 bg-[#0f172a] rounded-xl border border-white/5 hover:bg-white/5 transition-colors shadow-inner">
    <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-[#111827] border border-white/5 shadow-sm ${iconColor}`}>
      {icon}
    </div>
    <div className="flex flex-col min-w-0 overflow-hidden">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-sm font-bold text-white truncate">{value || 'N/A'}</span>
    </div>
  </div>
);

export default Profile;