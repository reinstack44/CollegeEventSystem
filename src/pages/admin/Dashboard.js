import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  LayoutDashboard, PlusCircle, ScanLine, Settings, 
  Users, ArrowRight, Trash2, Calendar, MapPin, Activity 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchEvents();
        setLoading(false);
      } else {
        navigate('/adminlogin');
      }
    };
    checkAdmin();
  }, [navigate]);

  const fetchEvents = async () => {
    // Select all columns to ensure school and school_target are available
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
      toast.error("Database Link Failure");
    } else {
      setEvents(data || []);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (window.confirm(`Security Protocol: Wipe all data for "${title}"?`)) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) toast.error("Wipe Failed: " + error.message);
      else {
        toast.success("Event Wiped");
        setEvents(events.filter(event => event.id !== id));
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-8 max-w-6xl py-12">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-xl">
          <LayoutDashboard size={28}/>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Command Center</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 uppercase tracking-wider">Event Management Alpha</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 text-left">
        <AdminCard to="/admin/create" icon={<PlusCircle size={28} className="text-green-500" />} title="Create" desc="New deployments." color="border-green-500" />
        <AdminCard to="/admin/scan" icon={<ScanLine size={28} className="text-blue-500" />} title="Scanner" desc="QR gate control." color="border-blue-500" />
        <AdminCard to="/admin/users" icon={<Users size={28} className="text-purple-500" />} title="Students" desc="Manage attendees." color="border-purple-500" />
        <AdminCard to="/admin/settings" icon={<Settings size={28} className="text-slate-400" />} title="System" desc="Security logs." color="border-slate-400" />
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 text-left">
          <Activity size={24} className="text-blue-500" /> Live Operations
        </h3>
        
        <div className="space-y-4 text-left">
          {events.length === 0 ? (
            <p className="text-slate-500 italic p-4">No active deployments found.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 transition-all hover:border-blue-500/30 group">
                <div className="w-full">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
                    {/* Fallback logic to support both columns */}
                    {event.school || event.school_target || "Global School"}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">{event.title}</h4>
                  <div className="flex gap-4 text-xs text-slate-500 font-bold mt-1">
                    <span className="flex items-center gap-1"><Calendar size={14}/> {event.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {event.venue}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDeleteEvent(event.id, event.title)}
                  className="mt-4 md:mt-0 p-4 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
        {icon}
      </div>
      <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs leading-relaxed">{desc}</p>
    </div>
  </Link>
);

export default Dashboard;