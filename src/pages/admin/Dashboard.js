import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  LayoutDashboard, PlusCircle, ScanLine, 
  ArrowRight, Zap, ArrowLeft, Edit3,
  Database, Building, Users, Flag, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// IMPORT SMART BACK HOOK FOR NATIVE iOS ROUTING
import { useSmartBack } from '../../App';

const Dashboard = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack(); // Initialize the smart back hook
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  
  const [myClubs, setMyClubs] = useState([]);
  const [activeClubId, setActiveClubId] = useState(localStorage.getItem('active_club_id'));

  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const clubDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) {
        setIsClubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/adminlogin', { replace: true });

        // 1. Secure Role Fetch
        const { data: profile } = await supabase.from('students').select('role').eq('email', user.email).single();
        const { data: roles } = await supabase.from('user_roles').select('*').eq('email', user.email);
        
        const isSuperAdmin = profile?.role === 'super_admin' || roles?.some(r => r.role === 'super_admin');
        const isOrgHead = roles?.some(r => r.role === 'org_head');
        const isClubHead = roles?.some(r => r.role === 'club_head');

        // 2. Determine Highest Authority
        let role = 'student';
        if (isSuperAdmin) role = 'super_admin';
        else if (isOrgHead) role = 'org_head';
        else if (isClubHead) role = 'club_head';

        if (role === 'student') {
          toast.error("Access Denied: Admin privileges required.");
          return navigate('/events', { replace: true });
        }

        setUserRole(role);

        // 3. Initialize Workspace for Club Heads
        if (role === 'club_head') {
          const clubIds = roles.filter(r => r.role === 'club_head').map(r => r.club_id);
          const { data: clubsData } = await supabase.from('clubs').select('*').in('id', clubIds);
          
          if (clubsData && clubsData.length > 0) {
            setMyClubs(clubsData);
            if (!localStorage.getItem('active_club_id')) {
              localStorage.setItem('active_club_id', clubsData[0].id);
              localStorage.setItem('active_club_name', clubsData[0].name);
              setActiveClubId(clubsData[0].id);
            }
          }
        }
        
      } catch (error) {
        console.error("Dashboard verification error:", error);
        toast.error("Unable to verify administrative session.");
      } finally {
        setLoading(false);
      }
    };
    verifyAdmin();
  }, [navigate]);

  const handleWorkspaceSwitch = (clubId) => {
    const selectedClub = myClubs.find(c => c.id === clubId);
    if (selectedClub) {
      localStorage.setItem('active_club_id', selectedClub.id);
      localStorage.setItem('active_club_name', selectedClub.name);
      setActiveClubId(selectedClub.id);
      setIsClubDropdownOpen(false);
      toast.success(`Active workspace: ${selectedClub.name}`);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#0a0f1d]"><Zap className="animate-pulse text-blue-600" size={48}/></div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl text-left">
      <div className="w-full mb-4 sm:mb-6 flex justify-start">
        {/* UPDATED: useSmartBack handles the iOS history stack properly */}
        <button onClick={() => smartBack('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3.5 text-white rounded-xl sm:rounded-2xl shadow-xl shrink-0 ${
            userRole === 'super_admin' ? 'bg-blue-600' : 
            userRole === 'org_head' ? 'bg-indigo-600' : 'bg-pink-600'
          }`}>
            <LayoutDashboard className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-none">
              {userRole === 'super_admin' ? 'Admin Dashboard' : userRole === 'org_head' ? 'Org Dashboard' : 'Club Dashboard'}
            </h2>
            <p className="text-slate-500 font-medium text-[10px] sm:text-sm mt-1 sm:mt-2 uppercase tracking-wider">
              {userRole === 'super_admin' ? 'Primary Management Console' : userRole === 'org_head' ? 'Organization Control Center' : 'Club Management Module'}
            </p>
          </div>
        </div>

        {userRole === 'club_head' && myClubs.length > 0 && (
          <div className="flex items-center gap-3 bg-[#111827] border border-slate-800 p-3 rounded-2xl shadow-lg shrink-0 relative z-50">
            <div className="p-2 bg-pink-500/10 rounded-lg"><Flag className="text-pink-500 w-4 h-4"/></div>
            <div className="flex flex-col relative w-full sm:w-48" ref={clubDropdownRef}>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Club</span>
              
              <button 
                onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                className="flex items-center justify-between w-full bg-transparent outline-none text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span className="truncate pr-2">
                  {myClubs.find(c => c.id === activeClubId)?.name || 'Select Club'}
                </span>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180 text-pink-500' : ''}`} />
              </button>

              {isClubDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 min-w-48 w-full bg-[#111827] border border-pink-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                    {myClubs.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleWorkspaceSwitch(c.id)}
                        className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors ${activeClubId === c.id ? 'bg-pink-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <AdminCard to="/admin/create" icon={<PlusCircle className="text-green-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Create" desc="New Event." color="border-green-500" />
        <AdminCard to="/admin/events" icon={<Edit3 className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Manage Events" desc="Modify & Delete." color="border-orange-500" />
        <AdminCard to="/admin/scan" icon={<ScanLine className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Scanner" desc="QR Ticket Check-in." color="border-blue-500" />
        <AdminCard to="/admin/master-registry" icon={<Database className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Database" desc="View Registrations." color="border-purple-500" /> 
        
        {(userRole === 'super_admin' || userRole === 'org_head') && (
          <AdminCard to="/club/my-clubs" icon={<Users className="text-pink-500 w-5 h-5 sm:w-7 sm:h-7" />} title={userRole === 'org_head' ? 'Manage Clubs' : 'Clubs'} desc="Assign Leaders." color="border-pink-500" /> 
        )}
        {userRole === 'super_admin' && (
          <AdminCard to="/admin/applications" icon={<Building className="text-emerald-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Applications" desc="Org Approvals." color="border-emerald-500" /> 
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #db2777; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl border-l-4 sm:border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4 sm:mb-6">
      <div className="p-2.5 sm:p-3 bg-slate-800 rounded-xl sm:rounded-2xl">{icon}</div>
      <ArrowRight className="text-slate-400 group-hover:text-blue-500 transition-colors w-4 h-4 sm:w-5 sm:h-5" />
    </div>
    <div>
      <h3 className="text-base sm:text-xl font-black text-white mb-0.5 sm:mb-1 truncate">{title}</h3>
      <p className="text-slate-400 font-bold text-[9px] sm:text-xs leading-tight sm:leading-relaxed uppercase tracking-widest truncate">{desc}</p>
    </div>
  </Link>
);

export default Dashboard;