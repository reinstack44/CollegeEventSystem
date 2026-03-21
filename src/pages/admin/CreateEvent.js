import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Zap, ShieldCheck, AlignLeft, Ticket, 
  AlertCircle, ArrowLeft, Bold, Italic, 
  AlignJustify, Type, Save, Eye, Layout
} from 'lucide-react';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', date: '', venue: '', description: '', school: 'ADYPU', 
    start_time: '', end_time: '', ticket_limit: '',
    reg_start_date: '', reg_start_time: '09:00',
    reg_end_date: '', reg_end_time: '23:59'
  });

  const applyFormatting = (tag) => {
    const textarea = document.getElementById('desc-area');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.description;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let newText;
    if (tag === 'left' || tag === 'center' || tag === 'right') {
      newText = `${before}<div style="text-align: ${tag}">${selected || 'Text'}</div>${after}`;
    } else {
      const htmlTag = tag === 'bold' ? 'b' : 'i';
      newText = `${before}<${htmlTag}>${selected || 'Text'}</${htmlTag}>${after}`;
    }
    
    setFormData({ ...formData, description: newText });
  };

  useEffect(() => {
    if (editId) {
      const fetchEventData = async () => {
        const { data, error } = await supabase.from('events').select('*').eq('id', editId).single();
        if (data && !error) {
          const start = new Date(data.reg_start_timestamp);
          const end = new Date(data.reg_end_timestamp);
          setFormData({
            ...data,
            reg_start_date: start.toISOString().split('T')[0],
            reg_start_time: start.toTimeString().slice(0, 5),
            reg_end_date: end.toISOString().split('T')[0],
            reg_end_time: end.toTimeString().slice(0, 5)
          });
        }
      };
      fetchEventData();
    }
  }, [editId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const startIso = new Date(`${formData.reg_start_date}T${formData.reg_start_time}`).toISOString();
    const endIso = new Date(`${formData.reg_end_date}T${formData.reg_end_time}`).toISOString();

    const submissionData = {
      title: formData.title, date: formData.date, venue: formData.venue,
      description: formData.description, school: formData.school,
      start_time: formData.start_time, end_time: formData.end_time,
      ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : null,
      reg_start_timestamp: startIso, reg_end_timestamp: endIso
    };

    const { error } = editId 
      ? await supabase.from('events').update(submissionData).eq('id', editId)
      : await supabase.from('events').insert([submissionData]);
    
    if (error) toast.error(`Operation Failed: ${error.message}`);
    else {
      toast.success(editId ? "Transmission Updated" : "Mission Published");
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center p-4">
      <div className="w-full max-w-6xl mb-4 flex justify-start">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        <div className="bg-[#111827] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          <div className="p-8 pb-6 border-b border-slate-800/50 flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><ShieldCheck className="text-white" size={28} /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{editId ? "Modify Specs" : "New Event"}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col grow overflow-hidden">
            <div className="grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Ticket size={14} /> Limit</label>
                  <input type="number" value={formData.ticket_limit} onChange={e => setFormData({...formData, ticket_limit: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Type size={14} /> Description Shell</label>
                <div className="bg-[#1f2937] rounded-4xl border border-slate-700 overflow-hidden focus-within:border-blue-500 transition-all">
                  <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-700/50 bg-slate-900/50">
                    <button type="button" onClick={() => applyFormatting('bold')} className="text-slate-500 hover:text-blue-500"><Bold size={16}/></button>
                    <button type="button" onClick={() => applyFormatting('italic')} className="text-slate-500 hover:text-blue-500"><Italic size={16}/></button>
                    <div className="w-px h-4 bg-slate-700 mx-2"></div>
                    <button type="button" onClick={() => applyFormatting('left')} className="text-slate-500 hover:text-blue-500"><AlignLeft size={16}/></button>
                    <button type="button" onClick={() => applyFormatting('center')} className="text-slate-500 hover:text-blue-500"><AlignJustify size={16}/></button>
                  </div>
                  <textarea 
                    id="desc-area"
                    required rows={6} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-6 bg-transparent outline-none text-white text-sm resize-none font-mono" 
                    placeholder="Use tools above or type <b>bold</b>, <i>italic</i>, etc."
                  />
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 border-t border-slate-800/50 bg-[#111827]">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                {loading ? <Zap className="animate-pulse" size={20} /> : editId ? <><Save size={20}/> UPDATE SPECS</> : "PUBLISH MISSION"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
           <div className="flex items-center gap-3 text-blue-500 mb-2">
             <Eye size={20}/>
             <h3 className="font-black uppercase tracking-[0.3em] text-xs text-left">Transmission Preview</h3>
           </div>
           
           <div className="bg-[#0f172a] rounded-[2.5rem] border-2 border-blue-500/40 p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)] text-left min-h-100 flex flex-col">
              <div className="flex justify-between mb-8">
                 <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">{formData.school || 'SCHOOL'}</span>
                 <div className="flex items-center gap-1.5 text-blue-400/40 font-black text-[8px] uppercase"><Layout size={12}/> LIVE PREVIEW</div>
              </div>
              
              <h4 className="text-2xl font-black uppercase italic text-white mb-6 leading-tight truncate">{formData.title || 'Event Title'}</h4>
              
              <div className="grow border-t border-white/5 pt-6">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Technical Specs:</p>
                <div 
                  className="text-slate-300 text-sm leading-relaxed whitespace-pre-line overflow-y-auto max-h-62.5 custom-scrollbar"
                  dangerouslySetInnerHTML={{ __html: formData.description || '<i>Awaiting description input...</i>' }}
                />
              </div>
              
              <p className="mt-8 text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] text-center italic">End of Transmission</p>
           </div>
           
           <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
                <AlertCircle size={10} className="inline mr-1 mb-0.5 text-blue-400"/>
                NOTE: You can use standard HTML tags manually in the editor for more control. The preview updates instantly as you type.
              </p>
           </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CreateEvent;