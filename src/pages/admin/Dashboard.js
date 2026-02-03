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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) toast.error("Failed to load events");
    else setEvents(data || []);
  };

  const handleDeleteEvent = async (id, title) => {
    if (window.confirm(`Emergency Protocol: Are you sure you want to delete "${title}"? This action is permanent.`)) {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error("Deletion failed: " + error.message);
      } else {
        toast.success("Event Wiped from Database");
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <div className="p-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-xl">
          <LayoutDashboard size={28}/>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Command Center</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 uppercase tracking-wider">Event Management Alpha</p>
        </div>
      </div>

      {/* Main Grid Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <AdminCard 
          to="/admin/create" 
          icon={<PlusCircle size={28} className="text-green-500" />} 
          title="Create" 
          desc="Deploy new events."
          color="border-green-500"
        />
        <AdminCard 
          to="/admin/scan" 
          icon={<ScanLine size={28} className="text-blue-500" />} 
          title="Scanner" 
          desc="Verify QR tickets."
          color="border-blue-500"
        />
        <AdminCard 
          to="/admin/users" 
          icon={<Users size={28} className="text-purple-500" />} 
          title="Students" 
          desc="Manage registrations."
          color="border-purple-500"
        />
        <AdminCard 
          to="/admin/settings" 
          icon={<Settings size={28} className="text-slate-400" />} 
          title="System" 
          desc="Audit trail & logs."
          color="border-slate-400"
        />
      </div>

      {/* Management Section */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
          <Activity size={24} className="text-blue-500" /> Live Operations
        </h3>

        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-slate-500 italic">No active deployments found.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-500/30 transition-all group">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{event.school}</span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">{event.title}</h4>
                  <div className="flex gap-4 text-xs text-slate-500 font-bold mt-1">
                    <span className="flex items-center gap-1"><Calendar size={14}/> {event.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {event.venue}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDeleteEvent(event.id, event.title)}
                  className="mt-4 md:mt-0 p-4 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all group"
                  title="Wipe Event"
                >
                  <Trash2 size={20} className="group-active:scale-90 transition-transform" />
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
  <Link to={to} className={`group bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-l-[6px] ${color} transition-all hover:-translate-y-1 hover:shadow-blue-500/10 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-colors group-hover:bg-white dark:group-hover:bg-slate-700">
        {icon}
      </div>
      <ArrowRight className="text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors" size={20} />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs leading-relaxed">{desc}</p>
    </div>
  </Link>
);

export default Dashboard;