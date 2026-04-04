import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Building2, PlusCircle, ScanLine, 
  ArrowRight, Zap, ArrowLeft, Edit3,
  Users, Database
} from 'lucide-react';

const OrgDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgDetails, setOrgDetails] = useState(null);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // 1. Get the user's role and org_id
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, org_id')
          .eq('email', user.email)
          .single();

        if (roleError || !roleData || roleData.role !== 'org_head') {
          return navigate('/'); // Not an org head, kick them out
        }

        // 2. Fetch the Organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', roleData.org_id)
          .single();

        if (orgError) throw orgError;
        
        setOrgDetails(orgData);
      } catch (error) {
        console.error("Dashboard Access Error:", error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [navigate]);

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#0a0f1d]"><Zap className="animate-pulse text-blue-600" size={48}/></div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl text-left">
      
      {/* TOP NAVIGATION / BACK BUTTON */}
      <div className="w-full mb-4 sm:mb-6 flex justify-start">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Events
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] shrink-0">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-none truncate max-w-sm md:max-w-xl">
              {orgDetails?.name || 'Organization'} HQ
            </h2>
            <p className="text-slate-500 font-medium text-[10px] sm:text-sm mt-1 sm:mt-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Event Head
            </p>
          </div>
        </div>
      </div>

      {/* ORG CONTROL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <OrgCard to="/admin/create" icon={<PlusCircle className="text-green-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Create" desc="New Org Event." color="border-green-500" />
        <OrgCard to="/admin/events" icon={<Edit3 className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Manage Events" desc="Modify & Delete." color="border-orange-500" />
        <OrgCard to="/org/clubs" icon={<Users className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Manage Clubs" desc="Factions & Heads." color="border-purple-500" /> 
        <OrgCard to="/admin/scan" icon={<ScanLine className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Scanner" desc="Secure Check-in." color="border-blue-500" />
        
        {/* NEW DATABASE ROUTE INTEGRATION */}
        <OrgCard to="/admin/master-registry" icon={<Database className="text-cyan-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Database" desc="Master Registry." color="border-cyan-500" />
      </div>

    </div>
  );
};

const OrgCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-4xl shadow-xl border-l-4 sm:border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4 sm:mb-6">
      <div className="p-2.5 sm:p-3 bg-slate-800 rounded-xl sm:rounded-2xl shrink-0">{icon}</div>
      <ArrowRight className="text-slate-400 group-hover:text-white transition-colors w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
    </div>
    <div>
      <h3 className="text-base sm:text-xl font-black text-white mb-0.5 sm:mb-1 truncate">{title}</h3>
      <p className="text-slate-400 font-bold text-[9px] sm:text-xs leading-tight sm:leading-relaxed uppercase tracking-widest truncate">{desc}</p>
    </div>
  </Link>
);

export default OrgDashboard;