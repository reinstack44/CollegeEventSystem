import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  LayoutDashboard, PlusCircle, ScanLine, Settings, 
  Users, ArrowRight, Trash2, Calendar, MapPin, Activity, 
  Archive, Search, X, Users2, AlertCircle
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
    // 1. Fetch events
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (eventError) {
      toast.error("Database Link Failure");
      return;
    }

    // 2. Fetch booking counts
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('event_id');

    if (bookingError) {
      toast.error("Attendance sync failed");
      setEvents(eventData || []);
    } else {
      const eventsWithCounts = eventData.map(event => ({
        ...event,
        count: bookingData.filter(b => b.event_id === event.id).length
      }));
      setEvents(eventsWithCounts);
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

  const isExpired = (deadline) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(deadline);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveEvents = filteredEvents.filter(e => !isExpired(e.registration_deadline));
  const completedEvents = filteredEvents.filter(e => isExpired(e.registration_deadline));

  if (loading) return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
    </div>
  );

  return (
    <div className="container mx-auto p-8 max-w-6xl py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-xl">
            <LayoutDashboard size={28}/>
          </div>
          <div className="text-left">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic leading-none">Command Center</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2 uppercase tracking-wider">Management Dashboard</p>
          </div>
        </div>

        <div className="relative flex items-center w-full md:w-80 group">
          <Search className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search deployments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-bold transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 text-left">
        <AdminCard to="/admin/create" icon={<PlusCircle size={28} className="text-green-500" />} title="Create" desc="New deployments." color="border-green-500" />
        <AdminCard to="/admin/scan" icon={<ScanLine size={28} className="text-blue-500" />} title="Scanner" desc="QR gate control." color="border-blue-500" />
        <AdminCard to="/admin/students" icon={<Users size={28} className="text-purple-500" />} title="Students" desc="Manage attendees." color="border-purple-500" /> 
        <AdminCard to="/admin/settings" icon={<Settings size={28} className="text-slate-400" />} title="System" desc="Security logs." color="border-slate-400" />
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 mb-10">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 text-left">
          <Activity size={24} className="text-blue-500" /> Live Operations
        </h3>
        <EventTable list={liveEvents} status="Active" onDelete={handleDeleteEvent} />
      </div>

      <div className="bg-slate-100/50 dark:bg-slate-950/30 p-10 rounded-[3.5rem] border border-dashed border-slate-300 dark:border-slate-800 opacity-80">
        <h3 className="text-xl font-black text-slate-500 mb-8 flex items-center gap-3 text-left">
          <Archive size={24} /> Completed Events
        </h3>
        <EventTable list={completedEvents} status="Completed" onDelete={handleDeleteEvent} />
      </div>
    </div>
  );
};

const EventTable = ({ list, status, onDelete }) => (
  <div className="space-y-4 text-left">
    {list.length === 0 ? (
      <p className="text-slate-500 italic p-4 text-xs font-bold uppercase tracking-widest">No matching {status} entries.</p>
    ) : (
      list.map((event) => {
        const isSoldOut = event.ticket_limit && event.count >= event.ticket_limit; // Sold Out Logic

        return (
          <div key={event.id} className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 transition-all hover:border-blue-500/30 group">
            <div className="w-full">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
                  {event.school || "ADYPU"}
                </span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${status === 'Active' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-slate-500 border-slate-500/20 bg-slate-500/5'}`}>
                  {status}
                </span>
                
                {/* ATTENDANCE & LIMIT BADGE */}
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-colors ${isSoldOut ? 'bg-red-500 text-white border-red-500' : 'bg-slate-900 text-white border-white/10'}`}>
                  {isSoldOut ? <AlertCircle size={10} /> : <Users2 size={10} className="text-blue-500" />}
                  {event.count || 0} / {event.ticket_limit || '∞'} {isSoldOut ? 'Sold Out' : 'Booked'}
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">{event.title}</h4>
              <div className="flex gap-4 text-xs text-slate-500 font-bold mt-1">
                <span className="flex items-center gap-1"><Calendar size={14}/> {event.date}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> {event.venue}</span>
              </div>
            </div>
            <button 
              onClick={() => onDelete(event.id, event.title)}
              className="mt-4 md:mt-0 p-4 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
            >
              <Trash2 size={20} />
            </button>
          </div>
        );
      })
    )}
  </div>
);

const AdminCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-colors">
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