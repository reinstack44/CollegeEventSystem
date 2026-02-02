import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { CalendarPlus, Type, MapPin, AlignLeft, Send } from 'lucide-react';

const CreateEvent = () => {
  const [formData, setFormData] = useState({ title: '', date: '', venue: '', description: '', school: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading("Deploying event...");

    try {
      const { error } = await supabase.from('events').insert([formData]);
      if (error) throw error;
      toast.success("Event is now live!", { id: loadToast });
      setFormData({ title: '', date: '', venue: '', description: '', school: '' });
    } catch (err) {
      toast.error(err.message, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-3xl py-12 transition-colors duration-500">
      <div className="bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-green-500 text-white rounded-2xl shadow-lg">
            <CalendarPlus size={28}/>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">New Event</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">Event Title</label>
              <div className="relative group">
                <Type className="absolute left-4 top-4 text-slate-400" size={20} />
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white border-none transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">Event Date</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white border-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">Venue / Location</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-4 text-slate-400" size={20} />
              <input required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white border-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">Event Description</label>
            <div className="relative group">
              <AlignLeft className="absolute left-4 top-4 text-slate-400" size={20} />
              <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-white border-none transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl">
            {loading ? "PROCESSING..." : "PUBLISH EVENT"}
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;