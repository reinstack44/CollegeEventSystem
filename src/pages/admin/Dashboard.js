import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { LayoutDashboard, PlusCircle, ScanLine, Settings, Users, ArrowRight } from 'lucide-react';

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
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-8 max-w-6xl py-12 transition-colors duration-500">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-xl">
          <LayoutDashboard size={28}/>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Command Center</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 uppercase tracking-wider">Event Management Alpha</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AdminCard 
          to="/admin/create" 
          icon={<PlusCircle size={32} className="text-green-500" />} 
          title="Create Event" 
          desc="Deploy new event details and registration parameters."
          color="border-green-500"
        />
        <AdminCard 
          to="/admin/scan" 
          icon={<ScanLine size={32} className="text-blue-500" />} 
          title="QR Scanner" 
          desc="Real-time ticket verification and gate check-in."
          color="border-blue-500"
        />
        <AdminCard 
          to="/admin/users" 
          icon={<Users size={32} className="text-purple-500" />} 
          title="Student Data" 
          desc="Review registered students and URN verifications."
          color="border-purple-500"
        />
        <AdminCard 
          to="/admin/settings" 
          icon={<Settings size={32} className="text-slate-400" />} 
          title="System Logs" 
          desc="Audit trails and security configuration."
          color="border-slate-400"
        />
      </div>
    </div>
  );
};

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border-l-[8px] ${color} transition-all hover:-translate-y-2 hover:shadow-blue-500/10`}>
    <div className="flex items-start justify-between">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl mb-6 transition-colors group-hover:bg-white dark:group-hover:bg-slate-700">
        {icon}
      </div>
      <ArrowRight className="text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors" size={24} />
    </div>
    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
  </Link>
);

export default Dashboard;