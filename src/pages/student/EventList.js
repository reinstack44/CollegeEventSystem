import React, { useEffect, useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
// Removed unused toast import
import { MapPin, Calendar, Clock, Search, ArrowRight } from 'lucide-react'; // Removed unused icons

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  // Removed unused user state

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
    setFilteredEvents(data || []);
  };

  useEffect(() => {
    let result = events;
    if (search) result = result.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
    if (filterDate) result = result.filter(e => e.date === filterDate);
    setFilteredEvents(result);
  }, [search, filterDate, events]);

  const activeEvents = filteredEvents.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date());

  return (
    <div className="py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="w-full md:w-1/2">
            <h2 className="text-5xl font-black text-white tracking-tight mb-4">Discovery</h2>
            <div className="relative group flex items-center">
              <Search className="absolute left-4 text-slate-500" size={20} />
              <input 
                type="text" placeholder="Search events..." 
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 p-4 bg-slate-900 border border-slate-800 rounded-[2rem] text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="date" onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-12 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none"
              />
            </div>
          </div>
        </div>

        {activeEvents.length > 0 && <EventSection title="Happening Today" items={activeEvents} />}
        <EventSection title="Upcoming Events" items={upcomingEvents} />
      </div>
    </div>
  );
};

const EventSection = ({ title, items }) => (
  <div className="mb-16">
    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-8 ml-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {items.map(event => (
        <div key={event.id} className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 hover:border-blue-500/50 transition-all group">
          <span className="text-[10px] font-black text-slate-500 uppercase mb-4 block tracking-widest">{event.school}</span>
          <h4 className="text-2xl font-black text-white mb-6 group-hover:text-blue-500 transition-colors">{event.title}</h4>
          <div className="space-y-3 mb-8">
            <IconRow icon={<Calendar size={16}/>} text={new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <IconRow icon={<Clock size={16}/>} text={`${event.start_time} - ${event.end_time}`} />
            <IconRow icon={<MapPin size={16}/>} text={event.venue} />
          </div>
          <button className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 transition-all">
            BOOK TICKET <ArrowRight size={18} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const IconRow = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
    <div className="text-blue-500">{icon}</div>
    {text}
  </div>
);

export default EventList;