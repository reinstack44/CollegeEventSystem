import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Zap, ShieldCheck, AlignLeft, Ticket, 
  AlertCircle, ArrowLeft, Bold, Italic, 
  AlignJustify, Type, Save, Eye, Layout,
  Calendar, MapPin, Clock, Building, ChevronDown,
  UploadCloud, X, Image as ImageIcon, ChevronLeft, ChevronRight, Timer
} from 'lucide-react';

const ADYPU_SCHOOLS = [
  "ADYPU", "School of Engineering", "School of Management", 
  "School of Design", "School of Hospitality and Hotel Administration", 
  "School of Law", "School of Liberal Arts", "School of Architecture", 
  "School of Film and Media", "School of Science", "School of Allied Health Sciences", 
  "Center for Advanced Indian Science", "Center for Distance and Online Education"
];

// Placeholder images for the live preview if nothing is uploaded yet
const DEFAULT_PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800"
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  
  // Image State
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '', date: '', venue: '', description: '', 
    school: ADYPU_SCHOOLS[0],
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
          // Load existing images if editing
          if (data.images && data.images.length > 0) {
            setSelectedImages(data.images.map(url => ({ file: null, url })));
          }
        }
      };
      fetchEventData();
    }
  }, [editId]);

  // --- IMAGE UPLOAD HANDLERS ---
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed per event.");
      return;
    }
    const newImages = files.map(file => ({
      file: file,
      url: URL.createObjectURL(file)
    }));
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (currentImgIndex >= selectedImages.length - 1) {
      setCurrentImgIndex(Math.max(0, selectedImages.length - 2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadToast = toast.loading(editId ? "Updating Mission..." : "Uploading Assets & Publishing...");
    
    try {
      let finalImageUrls = [];

      // 1. Upload new image files
      for (const img of selectedImages) {
        if (img.file) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(fileName, img.file);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
          finalImageUrls.push(data.publicUrl);
        } else {
          finalImageUrls.push(img.url); // Existing image URL
        }
      }

      // 2. Prepare DB payload
      const startIso = new Date(`${formData.reg_start_date}T${formData.reg_start_time}`).toISOString();
      const endIso = new Date(`${formData.reg_end_date}T${formData.reg_end_time}`).toISOString();

      const submissionData = {
        title: formData.title, date: formData.date, venue: formData.venue,
        description: formData.description, school: formData.school,
        start_time: formData.start_time, end_time: formData.end_time,
        ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : null,
        reg_start_timestamp: startIso, reg_end_timestamp: endIso,
        images: finalImageUrls
      };

      const { error } = editId 
        ? await supabase.from('events').update(submissionData).eq('id', editId)
        : await supabase.from('events').insert([submissionData]);
      
      if (error) throw error;

      toast.success(editId ? "Transmission Updated!" : "Mission Published!", { id: loadToast });
      navigate('/admin');
    } catch (error) {
      toast.error(`Operation Failed: ${error.message}`, { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  const previewImages = selectedImages.length > 0 ? selectedImages.map(img => img.url) : DEFAULT_PREVIEW_IMAGES;

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center p-4">
      <div className="w-full max-w-7xl mb-4 flex justify-start">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* FORM SECTION */}
        <div className="bg-[#111827] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          <div className="p-8 pb-6 border-b border-slate-800/50 flex items-center gap-4 shrink-0">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><ShieldCheck className="text-white" size={28} /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{editId ? "Modify Specs" : "New Event"}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col grow overflow-hidden">
            <div className="grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
              
              {/* Row 1: Title & School */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Event Name" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Building size={14} /> School/Department</label>
                  <div className="relative">
                    <select 
                      required 
                      value={formData.school} 
                      onChange={e => setFormData({...formData, school: e.target.value})} 
                      className="w-full p-4 pr-10 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm appearance-none cursor-pointer truncate"
                    >
                      {ADYPU_SCHOOLS.map((school, index) => (
                        <option key={index} value={school}>{school}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              {/* Row 2: Venue & Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><MapPin size={14} /> Venue</label>
                  <input required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} placeholder="Location" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Ticket size={14} /> Ticket Limit</label>
                  <input type="number" min="1" value={formData.ticket_limit} onChange={e => setFormData({...formData, ticket_limit: e.target.value})} placeholder="Leave blank for unlimited" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
              </div>

              {/* Row 3: Event Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left p-4 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Calendar size={14} /> Event Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Clock size={14} /> Start Time</label>
                  <input required type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Clock size={14} /> End Time</label>
                  <input required type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                </div>
              </div>

              {/* Row 4: Registration Window */}
              <div className="space-y-4 text-left p-5 bg-blue-900/10 border border-blue-500/20 rounded-3xl">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Clock size={14} /> Registration Window
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opens</p>
                    <div className="grid grid-cols-3 gap-3">
                      <input required type="date" value={formData.reg_start_date} onChange={e => setFormData({...formData, reg_start_date: e.target.value})} className="col-span-2 w-full p-3 bg-[#111827] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                      <input required type="time" value={formData.reg_start_time} onChange={e => setFormData({...formData, reg_start_time: e.target.value})} className="col-span-1 w-full p-3 bg-[#111827] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                    </div>
                  </div>
                  <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closes</p>
                    <div className="grid grid-cols-3 gap-3">
                      <input required type="date" value={formData.reg_end_date} onChange={e => setFormData({...formData, reg_end_date: e.target.value})} className="col-span-2 w-full p-3 bg-[#111827] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                      <input required type="time" value={formData.reg_end_time} onChange={e => setFormData({...formData, reg_end_time: e.target.value})} className="col-span-1 w-full p-3 bg-[#111827] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-white text-sm scheme-dark" />
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW: IMAGE UPLOADER */}
              <div className="space-y-3 text-left p-5 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <ImageIcon size={14} /> Event Imagery (Max 10)
                </label>
                
                {/* Drag & Drop Box */}
                <div className="relative group bg-[#111827] border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 transition-all text-center cursor-pointer">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <UploadCloud className="mx-auto text-slate-500 group-hover:text-blue-500 transition-colors mb-2" size={28} />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tap or Drop Images</p>
                </div>

                {/* Image Thumbnails */}
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 shadow-md group">
                        <img src={img.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)} 
                          className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <X size={20} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 5: Description Shell */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Type size={14} /> Description Shell</label>
                <div className="bg-[#1f2937] rounded-3xl border border-slate-700 overflow-hidden focus-within:border-blue-500 transition-all">
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

            <div className="p-8 pt-4 border-t border-slate-800/50 bg-[#111827] shrink-0">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                {loading ? <Zap className="animate-pulse" size={20} /> : editId ? <><Save size={20}/> UPDATE SPECS</> : "PUBLISH MISSION"}
              </button>
            </div>
          </form>
        </div>

        {/* PREVIEW SECTION (Mirrors the compact EventList card) */}
        <div className="space-y-6 lg:sticky lg:top-24">
           <div className="flex items-center gap-3 text-blue-500 mb-2">
             <Eye size={20}/>
             <h3 className="font-black uppercase tracking-[0.3em] text-xs text-left">Event Listing Preview</h3>
           </div>
           
           <div className="bg-[#0f172a] rounded-[2.5rem] border-2 border-blue-500/40 p-6 md:p-7 shadow-[0_0_30px_rgba(59,130,246,0.1)] text-left flex flex-col h-132.5">
              
              {/* Preview Top Bar */}
              <div className="flex justify-between items-start mb-4 shrink-0">
                 <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-35">{formData.school || 'SCHOOL'}</span>
                 <div className="flex items-center gap-1.5 text-blue-400/40 font-black text-[8px] uppercase shrink-0"><Layout size={12}/> LIVE PREVIEW</div>
              </div>
              
              {/* Preview Image Slider */}
              <div className="relative w-full h-40 rounded-2xl overflow-hidden shrink-0 mb-4 group/slider border border-white/10 shadow-inner bg-slate-900">
                <img 
                  src={previewImages[currentImgIndex]} 
                  alt="Preview Visualization" 
                  className="w-full h-full object-cover transition-opacity duration-500 ease-in-out"
                />
                
                <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-transparent to-transparent opacity-80 pointer-events-none"></div>
                
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                  {currentImgIndex + 1} / {previewImages.length} IMAGES
                </div>

                {previewImages.length > 1 && (
                  <>
                    <button type="button" onClick={() => setCurrentImgIndex(p => p === 0 ? previewImages.length - 1 : p - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm z-20 hover:bg-blue-600 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={() => setCurrentImgIndex(p => p === previewImages.length - 1 ? 0 : p + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm z-20 hover:bg-blue-600 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>

              {/* Preview Details */}
              <div className="grow flex flex-col justify-start text-left gap-3">
                <h4 className="text-2xl font-black uppercase italic text-white leading-[0.9] line-clamp-2 overflow-hidden shrink-0">
                  {formData.title || 'Event Title'}
                </h4>

                <div className="space-y-1 shrink-0">
                  <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                    <Calendar size={12} className="text-blue-500"/> {formData.date || 'YYYY-MM-DD'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                    <Clock size={12} className="text-blue-500"/> {formData.start_time || '--:--'} - {formData.end_time || '--:--'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                    <MapPin size={12} className="text-blue-500"/> {formData.venue || 'Location'}
                  </div>
                </div>

                {/* Preview Reg Window */}
                <div className="pt-3 border-t border-slate-700/50 space-y-2 shrink-0">
                  <div className="flex items-center gap-2 text-blue-500 text-[9px] font-black uppercase tracking-widest">
                    <Timer size={12}/> Registration Window
                  </div>
                  <div className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex justify-between bg-[#111827] px-3 py-2 rounded-lg border border-white/5">
                      <span className="text-slate-500">Opens</span>
                      <span className="text-white">{formData.reg_start_date || 'TBA'}</span>
                    </div>
                    <div className="flex justify-between bg-[#111827] px-3 py-2 rounded-lg border border-white/5">
                      <span className="text-slate-500">Closes</span>
                      <span className="text-white">{formData.reg_end_date || 'TBA'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Fake Button */}
                <div className="w-full py-3.5 mt-auto rounded-2xl font-black uppercase text-[9px] tracking-widest shrink-0 bg-blue-600/50 text-white text-center border border-blue-500/50 cursor-not-allowed">
                  Simulated Button
                </div>
              </div>
           </div>
           
           <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
                <AlertCircle size={10} className="inline mr-1 mb-0.5 text-blue-400"/>
                NOTE: Images uploaded here will be beamed directly to your storage bucket and linked to the event payload.
              </p>
           </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
      `}</style>
    </div>
  );
};

export default CreateEvent;