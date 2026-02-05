import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Calendar, Clock, Search, Zap, Info, 
  CheckCircle, Timer, MapPin, X, ChevronDown 
} from 'lucide-react';
import toast from 'react-hot-toast';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentIso = now.toISOString();

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .gte('reg_end_timestamp', currentIso) 
        .order('date', { ascending: true });

      if (eventError) throw eventError;

      const { data: bookingData } = await supabase.from('bookings').select('event_id, student_email');

      const eventsWithMeta = (eventData || []).map(event => {
        const eventBookings = bookingData?.filter(b => b.event_id === event.id) || [];
        const startTime = new Date(event.reg_start_timestamp);
        
        return {
          ...event,
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          isBooked: user && eventBookings.some(b => b.student_email === user.email),
          isOpen: now >= startTime,
          opensAt: startTime
        };
      });

      setEvents(eventsWithMeta);
    } catch (error) {
      toast.error("Discovery Failed");
    } finally {
      setLoading(false);
    }
  }, [now]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBook = async (e, event) => {
    e.stopPropagation(); 
    if (!event.isOpen) return toast.error("Wait for the window to open!");
    if (event.isBooked) return toast.error("Already secured!");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login Required");

    const { error } = await supabase.from('bookings').insert([{
      event_id: event.id,
      student_email: user.email,
      status: 'confirmed'
    }]);

    if (!error) {
      toast.success("Pass Secured!");
      fetchEvents();
    }
  };

  const counts = {
    all: events.length,
    available: events.filter(e => !e.isBooked).length,
    secured: events.filter(e => e.isBooked).length
  };

  const filteredEvents = events.filter(e => {
    const matchesDate = filterDate ? e.date === filterDate : true;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = statusFilter === 'all' || (statusFilter === 'available' ? !e.isBooked : e.isBooked);
    return matchesDate && matchesSearch && matchesStatus;
  });

  const activeEvents = filteredEvents.filter(e => e.isOpen);
  const pendingEvents = filteredEvents.filter(e => !e.isOpen);

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 bg-[#111827]/90 backdrop-blur-xl p-3 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text"
                placeholder="Search deployments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-[#1f2937]/50 border-none rounded-[2rem] outline-none text-sm"
              />
            </div>

            {/* RESTORED DATE PICKER LOGIC */}
            <div className="relative w-full md:w-auto">
              {!showDatePicker ? (
                <button 
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center justify-between gap-6 px-8 py-5 bg-[#1f2937] hover:bg-slate-700 rounded-[2rem] text-sm font-black transition-all min-w-[220px] border border-white/5"
                >
                  <div className="flex items-center gap-3 text-blue-500">
                    <Calendar size={18} />
                    <span className="text-white uppercase tracking-widest text-[11px]">{filterDate || "Select Date"}</span>
                  </div>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
              ) : (
                <div className="flex items-center gap-4 bg-[#1f2937] px-6 py-4 rounded-[2rem] border border-blue-500/50">
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => { setFilterDate(e.target.value); setShowDatePicker(false); }}
                    className="bg-transparent border-none outline-none text-xs font-bold [color-scheme:dark] cursor-pointer"
                    autoFocus
                  />
                  <button onClick={() => {setShowDatePicker(false); setFilterDate('');}} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"><X size={16} /></button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-[#111827] border border-white/5 rounded-2xl w-fit">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All" count={counts.all} />
            <FilterButton active={statusFilter === 'available'} onClick={() => setStatusFilter('available')} label="Available" count={counts.available} />
            <FilterButton active={statusFilter === 'secured'} onClick={() => setStatusFilter('secured')} label="Secured" count={counts.secured} />
          </div>
        </div>

        {activeEvents.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-3"><Zap className="text-yellow-500 fill-yellow-500" size={24}/> Registrations Open</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {activeEvents.map(event => (
                <FlipCard key={event.id} event={event} onBook={handleBook} isFlipped={flippedCards[event.id]} onFlip={() => toggleFlip(event.id)} />
              ))}
            </div>
          </section>
        )}

        {pendingEvents.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-3 text-slate-500"><Timer size={24}/> Opening Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 opacity-80">
              {pendingEvents.map(event => (
                <FlipCard key={event.id} event={event} isFlipped={flippedCards[event.id]} onFlip={() => toggleFlip(event.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, count }) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
    {label} <span className={`px-2 py-0.5 rounded-md text-[8px] ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{count}</span>
  </button>
);

const FlipCard = ({ event, onBook, isFlipped, onFlip }) => {
  const getTimeRemaining = () => {
    const diff = new Date(event.reg_start_timestamp) - new Date();
    if (diff <= 0) return "Starting...";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="perspective-1000 h-[320px] w-full">
      <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <div onClick={onFlip} className={`absolute inset-0 backface-hidden bg-[#111827] rounded-[2.5rem] border p-8 flex flex-col justify-between cursor-pointer ${!event.isOpen ? 'border-blue-900/30' : event.isBooked ? 'border-green-500/30' : 'border-slate-800'}`}>
          <div className="flex justify-between items-start">
            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500">{event.school}</span>
            {!event.isOpen ? (
              <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] uppercase bg-blue-500/10 px-3 py-1 rounded-full"><Timer size={12}/> Opens in {getTimeRemaining()}</div>
            ) : event.isBooked ? (
              <div className="flex items-center gap-2 text-green-500 font-black text-[9px] uppercase"><CheckCircle size={12}/> Pass Secured</div>
            ) : (
              <div className="flex items-center gap-2 text-blue-400/60 font-black text-[9px] uppercase animate-pulse"><Info size={12}/> Tap Details</div>
            )}
          </div>
          <div>
            <h3 className={`text-3xl font-black uppercase italic leading-none mb-6 ${!event.isOpen ? 'text-slate-600' : 'text-white'}`}>{event.title}</h3>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase"><Calendar size={14}/> {event.date}</span>
              <span className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase"><Clock size={14}/> {event.start_time}</span>
              {/* RESTORED MAP PIN */}
              <span className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase"><MapPin size={14}/> {event.venue}</span>
            </div>
          </div>
          <button 
            disabled={!event.isOpen || event.isBooked || event.isSoldOut}
            onClick={(e) => { e.stopPropagation(); onBook(e, event); }} 
            className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] transition-all ${!event.isOpen ? 'bg-slate-900 text-slate-700' : event.isBooked ? 'bg-green-600/20 text-green-500' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}
          >
            {!event.isOpen ? `Opens at ${new Date(event.reg_start_timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : event.isBooked ? "Pass Secured" : "Book Entry Pass"}
          </button>
        </div>

        <div onClick={onFlip} className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1a2236] rounded-[2.5rem] border border-blue-500/30 p-10 flex flex-col cursor-pointer">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Detailed Description</h4>
          <p className="text-slate-300 text-[13px] leading-relaxed font-medium flex-grow overflow-y-auto">{event.description || "No description provided."}</p>
          <p className="mt-6 text-[9px] font-black text-slate-500 uppercase italic text-center">Tap to return</p>
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default EventList;