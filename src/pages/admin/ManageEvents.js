import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Search, Edit3, Trash2, Zap, ArrowLeft, Activity, CalendarX
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageEvents = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (eventError) {
      toast.error("Database Link Failure");
    } else {
      setEvents(eventData || []);
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (id, title) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 text-left">
        <p className="text-xs font-black uppercase text-white tracking-widest leading-relaxed">
          Wipe all data for <span className="text-red-500">"{title}"</span>?
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">This will permanently delete the event and all associated data.</p>
        <div className="flex gap-2 mt-2">
          <button 
            className="bg-red-600 px-4 py-3 rounded-xl text-[10px] font-black w-full shadow-lg shadow-red-600/20 active:scale-95 transition-all"
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
          <button className="bg-slate-700 px-4 py-3 rounded-xl text-[10px] font-black w-full active:scale-95 transition-all" onClick={() => toast.dismiss(t.id)}>CANCEL</button>
        </div>
      </div>
    ), { duration: 5000, style: { background: '#111827', border: '1px solid #ef4444', minWidth: '320px' }});
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 sm:p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
        
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3 text-blue-500 mb-4">
              <Activity size={28} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Modification Center</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Manage Events</h2>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 bg-[#111827] border border-white/5 rounded-2xl outline-none text-xs sm:text-sm font-bold focus:border-blue-500/50 transition-colors shadow-lg"
            />
          </div>
        </header>

        <div className="bg-[#111827] p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl">
          {loading ? (
            <div className="py-20 flex justify-center"><Zap className="animate-pulse text-blue-500" size={40} /></div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-20 flex flex-col items-center opacity-40">
              <CalendarX size={48} className="mb-4 text-slate-500" />
              <p className="font-black uppercase text-xs tracking-widest italic">No events found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all gap-4 group">
                  <div className="w-full">
                    <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest">{event.school}</span>
                    <h4 className="text-lg sm:text-xl font-black text-white uppercase italic leading-tight mt-1 group-hover:text-blue-400 transition-colors">{event.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end border-t border-white/5 sm:border-none pt-4 sm:pt-0">
                    <button 
                      onClick={() => navigate(`/admin/create?edit=${event.id}`)} 
                      className="flex-1 sm:flex-none flex justify-center items-center p-3 sm:p-4 bg-blue-500/10 text-blue-500 rounded-xl sm:rounded-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                    >
                      <Edit3 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id, event.title)} 
                      className="flex-1 sm:flex-none flex justify-center items-center p-3 sm:p-4 bg-red-500/10 text-red-500 rounded-xl sm:rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                      <Trash2 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageEvents;