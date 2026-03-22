import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  LayoutDashboard, PlusCircle, ScanLine, ShieldAlert, 
  Users, ArrowRight, Trash2, Activity, 
  Search, Edit3, Zap, CheckCircle, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (eventError) {
      toast.error("Database Link Failure");
      return;
    }

    const { data: bookingData } = await supabase.from('bookings').select('event_id');
    const eventsWithCounts = (eventData || []).map(event => ({
      ...event,
      count: bookingData?.filter(b => b.event_id === event.id).length || 0
    }));
    setEvents(eventsWithCounts);
  };

  const handleDeleteEvent = async (id, title) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2">
        <p className="text-xs font-black uppercase text-white">Wipe all data for "{title}"?</p>
        <div className="flex gap-2">
          <button 
            className="bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black"
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('events').delete().eq('id', id);
              if (error) toast.error("Wipe Failed");
              else {
                toast.success("Event Purged");
                setEvents(events.filter(event => event.id !== id));
              }
            }}
          >CONFIRM WIPE</button>
          <button className="bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-black" onClick={() => toast.dismiss(t.id)}>CANCEL</button>
        </div>
      </div>
    ), { style: { background: '#111827', border: '1px solid #ef4444' }});
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#0a0f1d]"><Zap className="animate-pulse text-blue-600" size={48}/></div>;

  return (
    <div className="container mx-auto p-8 max-w-350 py-12 text-left">
      
      {/* NEW: TOP NAVIGATION / BACK BUTTON */}
      <div className="w-full mb-6 flex justify-start">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl"><LayoutDashboard size={28}/></div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none">Admin dashboard</h2>
            <p className="text-slate-500 font-medium text-sm mt-2 uppercase tracking-wider">Management Control Panel</p>
          </div>
        </div>
        <div className="relative flex items-center w-full md:w-80 group">
          <Search className="absolute left-4 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search Events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-white text-sm font-bold shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
        <AdminCard to="/admin/create" icon={<PlusCircle size={28} className="text-green-500" />} title="Create" desc="New Event." color="border-green-500" />
        <AdminCard to="/admin/scan" icon={<ScanLine size={28} className="text-blue-500" />} title="Scanner" desc="QR Gate Control." color="border-blue-500" />
        <AdminCard to="/admin/students" icon={<Users size={28} className="text-purple-500" />} title="Students" desc="Attendence Record." color="border-purple-500" /> 
        <AdminCard to="/admin/logs" icon={<ShieldAlert size={28} className="text-red-500" />} title="Terminate Entry" desc="Security Control." color="border-red-500" />
        <AdminCard to="/admin/bookings" icon={<CheckCircle size={28} className="text-yellow-500" />} title="Manual Entry" desc="Verify UTR Audits." color="border-yellow-500" />
      </div>

      <div className="bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-800">
        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3"><Activity size={24} className="text-blue-500" /> Created Events Modification & Deletion Controls</h3>
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="flex flex-col md:flex-row items-center justify-between bg-slate-800 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all">
              <div className="w-full">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{event.school}</span>
                <h4 className="text-lg font-black text-white uppercase italic">{event.title}</h4>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <button onClick={() => navigate(`/admin/create?edit=${event.id}`)} className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={20}/></button>
                <button onClick={() => handleDeleteEvent(event.id, event.title)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-slate-800 rounded-2xl">{icon}</div>
      <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
    </div>
    <div>
      <h3 className="text-xl font-black text-white mb-1">{title}</h3>
      <p className="text-slate-400 font-medium text-xs leading-relaxed">{desc}</p>
    </div>
  </Link>
);

export default Dashboard;