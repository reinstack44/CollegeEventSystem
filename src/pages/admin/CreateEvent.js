import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { 
  Loader2, ShieldCheck, AlignLeft, MapPin, 
  Calendar, Building2, Clock, Ticket 
} from 'lucide-react';

const CreateEvent = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', 
    date: '', 
    venue: '', 
    description: '', 
    school: 'ADYPU', // Defaulting to ADYPU
    start_time: '',
    end_time: '',
    ticket_limit: '' // New field for attendance control
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Convert ticket_limit to number for database compatibility
    const submissionData = {
      ...formData,
      ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : null
    };

    const { error } = await supabase.from('events').insert([submissionData]);
    
    if (error) {
      toast.error(`Publishing Failed: ${error.message}`);
    } else {
      toast.success("Event Published Successfully!");
      setFormData({ 
        title: '', date: '', venue: '', description: '', school: 'ADYPU', 
        start_time: '', end_time: '', ticket_limit: '' 
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1d] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111827] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* FIXED HEADER */}
        <div className="p-8 pb-6 border-b border-slate-800/50 flex items-center gap-4 bg-[#111827]">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Create Event</h2>
            <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Command Center Deployment</p>
          </div>
        </div>
        
        {/* SCROLLABLE VIEWPORT */}
        <form id="create-event-form" onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
            
            {/* Event Title */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <AlignLeft size={14} /> Event Title
              </label>
              <input 
                required 
                placeholder="Enter event name" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" 
              />
            </div>

            {/* School Selection and Ticket Limit Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Building2 size={14} /> Organizing School
                </label>
                <select 
                  required 
                  value={formData.school} 
                  onChange={e => setFormData({...formData, school: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm appearance-none cursor-pointer"
                >
                  <option value="ADYPU">ADYPU (University)</option>
                  <option value="Engineering">School of Engineering</option>
                  <option value="Management">School of Management</option>
                  <option value="Design">School of Design</option>
                  <option value="Film & Media">School of Film & Media</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Ticket size={14} /> Ticket Limit
                </label>
                <input 
                  type="number"
                  placeholder="Leave blank for unlimited"
                  value={formData.ticket_limit} 
                  onChange={e => setFormData({...formData, ticket_limit: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" 
                />
              </div>
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Calendar size={14}/> Event Date
                </label>
                <input 
                  required 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm [color-scheme:dark]" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Clock size={14}/> Start Time
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={formData.start_time} 
                  onChange={e => setFormData({...formData, start_time: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" 
                />
              </div>
            </div>

            {/* End Time and Venue Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Clock size={14}/> End Time
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. 04:00 PM"
                  value={formData.end_time} 
                  onChange={e => setFormData({...formData, end_time: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <MapPin size={14}/> Venue
                </label>
                <input 
                  required 
                  placeholder="e.g. Seminar Hall" 
                  value={formData.venue} 
                  onChange={e => setFormData({...formData, venue: e.target.value})} 
                  className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" 
                />
              </div>
            </div>

            {/* Description Box */}
            <div className="space-y-2 pb-4">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <AlignLeft size={14} /> Full Description
              </label>
              <textarea 
                required 
                rows={5} 
                placeholder="Enter event details..." 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full p-6 bg-[#1f2937] border border-slate-700 rounded-[2rem] outline-none focus:border-blue-500 text-white text-sm resize-none min-h-[180px]" 
              />
            </div>
          </div>

          {/* FIXED FOOTER */}
          <div className="p-8 pt-4 border-t border-slate-800/50 bg-[#111827]">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base shadow-lg transition-all active:scale-95 disabled:bg-slate-700 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "PUBLISH EVENT"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </div>
  );
};

export default CreateEvent;