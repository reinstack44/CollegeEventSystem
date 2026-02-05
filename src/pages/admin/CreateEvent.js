import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { 
  Loader2, ShieldCheck, AlignLeft, MapPin, 
 Ticket, AlertCircle, PlayCircle 
} from 'lucide-react';

const CreateEvent = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: '', venue: '', description: '', school: 'ADYPU', 
    start_time: '', end_time: '', ticket_limit: '',
    reg_start_date: '', reg_start_time: '09:00',
    reg_end_date: '', reg_end_time: '23:59'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Combine Date and Time inputs into ISO Timestamps
    const reg_start_timestamp = new Date(`${formData.reg_start_date}T${formData.reg_start_time}`).toISOString();
    const reg_end_timestamp = new Date(`${formData.reg_end_date}T${formData.reg_end_time}`).toISOString();

    const submissionData = {
      title: formData.title,
      date: formData.date,
      venue: formData.venue,
      description: formData.description,
      school: formData.school,
      start_time: formData.start_time,
      end_time: formData.end_time,
      ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : null,
      reg_start_timestamp,
      reg_end_timestamp
    };

    const { error } = await supabase.from('events').insert([submissionData]);
    
    if (error) {
      toast.error(`Publishing Failed: ${error.message}`);
    } else {
      toast.success("Event Scheduled with Precision Window!");
      setFormData({ 
        title: '', date: '', venue: '', description: '', school: 'ADYPU', 
        start_time: '', end_time: '', ticket_limit: '',
        reg_start_date: '', reg_start_time: '09:00', reg_end_date: '', reg_end_time: '23:59'
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1d] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#111827] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="p-8 pb-6 border-b border-slate-800/50 flex items-center gap-4 bg-[#111827]">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Schedule Event</h2>
            <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Precision Command Center</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Event Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Ticket size={14} /> Ticket Limit</label>
                <input type="number" value={formData.ticket_limit} onChange={e => setFormData({...formData, ticket_limit: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
              </div>
            </div>

            <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-[2.5rem] space-y-4">
              <label className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <PlayCircle size={16}/> Registration Opening Window
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="date" value={formData.reg_start_date} onChange={e => setFormData({...formData, reg_start_date: e.target.value})} className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl text-white text-sm [color-scheme:dark]" />
                <input required type="time" value={formData.reg_start_time} onChange={e => setFormData({...formData, reg_start_time: e.target.value})} className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl text-white text-sm [color-scheme:dark]" />
              </div>
            </div>

            <div className="p-6 bg-red-600/5 border border-red-500/20 rounded-[2.5rem] space-y-4">
              <label className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertCircle size={16}/> Registration Deadline
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="date" value={formData.reg_end_date} onChange={e => setFormData({...formData, reg_end_date: e.target.value})} className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl text-white text-sm [color-scheme:dark]" />
                <input required type="time" value={formData.reg_end_time} onChange={e => setFormData({...formData, reg_end_time: e.target.value})} className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl text-white text-sm [color-scheme:dark]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Event Date</label><input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl text-white text-sm [color-scheme:dark]" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Show Start</label><input required placeholder="10:00 AM" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl text-white text-sm" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Show End</label><input required placeholder="04:00 PM" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl text-white text-sm" /></div>
            </div>

            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><MapPin size={14}/> Venue</label><input required placeholder="Seminar Hall" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl text-white text-sm" /></div>

            <div className="space-y-2 pb-4">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Full Description</label>
              <textarea required rows={3} placeholder="Event details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-6 bg-[#1f2937] border border-slate-700 rounded-[2rem] outline-none focus:border-blue-500 text-white text-sm resize-none" />
            </div>
          </div>

          <div className="p-8 pt-4 border-t border-slate-800/50 bg-[#111827]">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base shadow-lg transition-all active:scale-95 disabled:bg-slate-700 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "PUBLISH MISSION"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;