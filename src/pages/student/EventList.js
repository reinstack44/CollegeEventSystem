import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { Calendar, MapPin, Clock, Search, Rocket, Zap, X, Info, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  const todayDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      toast.error("Discovery Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBook = async (e, eventId) => {
    e.stopPropagation(); 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Please login first");

    const { error } = await supabase.from('bookings').insert([{
      event_id: eventId,
      student_email: user.email,
      status: 'confirmed'
    }]);

    if (error) {
      error.code === '23505' ? toast.error("Already Booked!") : toast.error(error.message);
    } else {
      toast.success("Pass Secured!");
    }
  };

  const isPast = (eventTime, eventDate) => {
    if (eventDate > todayDate) return false;
    if (eventDate < todayDate) return true;
    const [time, modifier] = eventTime.split(' ');
    let [hours, minutes] = time.split(':');
    if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
    if (modifier === 'AM' && hours === '12') hours = '00';
    return `${hours}:${minutes}` < currentTime;
  };

  const filteredEvents = events.filter(e => {
    const matchesDate = filterDate ? e.date === filterDate : true;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const todayEvents = filteredEvents.filter(e => e.date === todayDate && !isPast(e.start_time, e.date));
  const upcomingEvents = filteredEvents.filter(e => e.date > todayDate);

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 pb-24 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row items-center gap-4 bg-[#111827]/90 backdrop-blur-xl p-3 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-[#1f2937]/50 border-none rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
            />
          </div>

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
              <div className="flex items-center gap-4 bg-[#1f2937] px-6 py-4 rounded-[2rem] border border-blue-500/50 animate-in zoom-in-95 duration-200">
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

        <div className="space-y-20">
          {todayEvents.length > 0 && (
            <section className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                Happening Today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {todayEvents.map(event => (
                  <FlipCard key={event.id} event={event} onBook={handleBook} isFlipped={flippedCards[event.id]} onFlip={() => toggleFlip(event.id)} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-8">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Rocket size={24} className="text-blue-500"/> Upcoming Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {upcomingEvents.map(event => (
                <FlipCard key={event.id} event={event} onBook={handleBook} isFlipped={flippedCards[event.id]} onFlip={() => toggleFlip(event.id)} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const FlipCard = ({ event, onBook, isFlipped, onFlip }) => (
  <div onClick={onFlip} className="perspective-1000 cursor-pointer h-[320px] w-full">
    <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
      <div className="absolute inset-0 backface-hidden bg-[#111827] rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
        <div className="flex justify-between items-start">
          <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20">{event.school}</span>
          <div className="flex items-center gap-2 text-blue-400/60 font-black text-[9px] uppercase animate-pulse"><Info size={12}/> Tap to see details</div>
        </div>
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter leading-[0.85] mb-6">{event.title}</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase"><Calendar size={14} className="text-blue-500"/> {event.date}</div>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
              <Clock size={14} className="text-blue-500"/> 
              {event.start_time} - {event.end_time}
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase"><MapPin size={14} className="text-blue-500"/> {event.venue}</div>
          </div>
        </div>
        <button onClick={(e) => onBook(e, event.id)} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">Book Entry Pass</button>
      </div>

      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1a2236] rounded-[2.5rem] border border-blue-500/30 p-10 shadow-2xl flex flex-col">
        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Detailed Description</h4>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-3">
           <p className="text-slate-300 text-[13px] leading-relaxed font-medium">{event.description || "No description provided."}</p>
        </div>
        <p className="mt-6 text-[9px] font-black text-slate-500 uppercase italic">Tap card to return</p>
      </div>
    </div>

    <style>{`
      .perspective-1000 { perspective: 1000px; }
      .transform-style-3d { transform-style: preserve-3d; }
      .backface-hidden { backface-visibility: hidden; }
      .rotate-y-180 { transform: rotateY(180deg); }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
    `}</style>
  </div>
);

export default EventList;