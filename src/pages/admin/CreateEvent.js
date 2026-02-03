import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { CalendarPlus } from 'lucide-react'; // Cleaned imports

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: '', date: '', venue: '', description: '', school: '', start_time: '', end_time: ''
  });

  const schools = ["School of Engineering", "School of Management", "School of Liberal Arts", "School of Design", "School of Film & Media"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([formData]);
    if (error) toast.error(error.message);
    else {
      toast.success("Event Published Successfully!");
      setFormData({ title: '', date: '', venue: '', description: '', school: '', start_time: '', end_time: '' });
    }
  };

  return (
    <div className="pt-12 px-6">
      <div className="max-w-3xl mx-auto bg-slate-900 p-12 rounded-[4rem] border border-slate-800">
        <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
          <CalendarPlus className="text-blue-500" /> Create Event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Event Title" type="text" onChange={v => setFormData({...formData, title: v})} value={formData.title} />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-2 tracking-widest">Select School</label>
              <select 
                required value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})}
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-blue-500 transition-all"
              >
                <option value="">Select School</option>
                {schools.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Date" type="date" onChange={v => setFormData({...formData, date: v})} value={formData.date} />
            <Input label="Start Time (e.g. 9AM)" type="text" onChange={v => setFormData({...formData, start_time: v})} value={formData.start_time} />
            <Input label="End Time (e.g. 2PM)" type="text" onChange={v => setFormData({...formData, end_time: v})} value={formData.end_time} />
          </div>

          <Input label="Venue" type="text" onChange={v => setFormData({...formData, venue: v})} value={formData.venue} />
          
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            PUBLISH EVENT
          </button>
        </form>
      </div>
    </div>
  );
};

const Input = ({ label, type, onChange, value }) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
    <input required type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:border-blue-500 transition-all" />
  </div>
);

export default CreateEvent;