import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  LayoutDashboard, PlusCircle, ScanLine, ShieldAlert, 
  ArrowRight, Zap, ArrowLeft, Edit3
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
      } else {
        navigate('/adminlogin');
      }
    };
    checkAdmin();
  }, [navigate]);

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-[#0a0f1d]">
      <Zap className="animate-pulse text-blue-600" size={48}/>
    </div>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl text-left min-h-screen bg-[#0a0f1d]">
      
      <div className="w-full mb-4 sm:mb-6 flex justify-start">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Site
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3.5 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-xl shrink-0">
            <LayoutDashboard className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-none">Admin dashboard</h2>
            <p className="text-slate-500 font-medium text-[10px] sm:text-sm mt-1 sm:mt-2 uppercase tracking-wider">Management Launchpad</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminCard to="/admin/create" icon={<PlusCircle className="text-green-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Create" desc="New Event." color="border-green-500" />
        <AdminCard to="/admin/events" icon={<Edit3 className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Manage Events" desc="Modify & Delete." color="border-orange-500" />
        <AdminCard to="/admin/scan" icon={<ScanLine className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Scanner" desc="QR Gate Control." color="border-blue-500" />
        
        {/* MATCHES THE NEW ROUTE IN APP.JS */}
        <AdminCard to="/admin/master-registry" icon={<ShieldAlert className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Master DB" desc="Verified Students." color="border-purple-500" /> 
      </div>
    </div>
  );
};

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-slate-900/50 p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl border border-white/5 border-l-4 sm:border-l-[6px] ${color} transition-all hover:-translate-y-1 hover:bg-slate-900 flex flex-col justify-between h-full`}>
    <div className="flex items-start justify-between mb-4 sm:mb-6">
      <div className="p-2.5 sm:p-3 bg-slate-800 rounded-xl sm:rounded-2xl">{icon}</div>
      <ArrowRight className="text-slate-400 group-hover:text-blue-500 transition-colors w-4 h-4 sm:w-5 sm:h-5" />
    </div>
    <div>
      <h3 className="text-base sm:text-xl font-black text-white mb-0.5 sm:mb-1 truncate italic uppercase tracking-tight">{title}</h3>
      <p className="text-slate-400 font-bold text-[9px] sm:text-xs leading-tight sm:leading-relaxed uppercase tracking-widest truncate">{desc}</p>
    </div>
  </Link>
);

export default Dashboard;