import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomTimePicker from '../../components/CustomTimePicker';
import CustomDatePicker from '../../components/CustomDatePicker';
import toast from 'react-hot-toast';
import { 
  Zap, ShieldCheck, AlignLeft, Ticket, 
  ArrowLeft, Bold, Italic, AlignJustify, Type, 
  Save, Eye, Layout, Calendar, MapPin, Clock, 
  Building, ChevronDown, UploadCloud, X, 
  Image as ImageIcon, ChevronLeft, ChevronRight, Timer, Globe, Lock, FileText, Repeat, Layers
} from 'lucide-react';

const DEFAULT_PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800"
];

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "E-Sports", 
  "Social & Welfare", "Entrepreneurship", "Literature", "Arts & Media", "Other"
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  
  // ROLE & CONTEXT LOGIC
  const [creatorContext, setCreatorContext] = useState({ role: null });
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');

  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', category: CATEGORIES[0], date: '', venue: '', description: '', 
    start_time: '', end_time: '', ticket_limit: '',
    reg_start_date: '', reg_start_time: '09:00',
    reg_end_date: '', reg_end_time: '23:59',
    event_type: 'free', price: '', merchant_upi: '',
    is_open_to_all: true 
  });

  // CUSTOM DROPDOWN STATE
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const orgDropdownRef = useRef(null);
  const clubDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // Handle click outside for Custom Dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) setIsOrgDropdownOpen(false);
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) setIsClubDropdownOpen(false);
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) setIsCategoryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch User Context (Multi-Role Supported)
  useEffect(() => {
    const fetchContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
      const isSuperAdmin = adminEmails.includes(user.email);

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', user.email);

      let currentRole = 'student';
      if (isSuperAdmin) {
        currentRole = 'super_admin';
      } else if (rolesData && rolesData.length > 0) {
        if (rolesData.some(r => r.role === 'org_head')) currentRole = 'org_head';
        else if (rolesData.some(r => r.role === 'club_head')) currentRole = 'club_head';
      }

      setCreatorContext({ role: currentRole });

      // Pre-fill dropdowns based on role
      if (currentRole === 'super_admin') {
        const { data: orgData } = await supabase.from('organizations').select('id, name').eq('status', 'approved');
        setOrgs(orgData || []);
      } 
      else if (currentRole === 'org_head') {
        const orgRole = rolesData.find(r => r.role === 'org_head');
        setSelectedOrgId(orgRole.org_id);
        
        const { data: orgData } = await supabase.from('organizations').select('id, name').eq('id', orgRole.org_id);
        setOrgs(orgData || []);
        const { data: clubData } = await supabase.from('clubs').select('id, name').eq('org_id', orgRole.org_id);
        setClubs(clubData || []);
      } 
      else if (currentRole === 'club_head') {
        const clubRoles = rolesData.filter(r => r.role === 'club_head');
        
        const activeClubId = localStorage.getItem('active_club_id');
        let activeRole = clubRoles.find(r => r.club_id === activeClubId) || clubRoles[0];

        if (activeRole) {
          setSelectedOrgId(activeRole.org_id);
          setSelectedClubId(activeRole.club_id);
          
          const { data: orgData } = await supabase.from('organizations').select('id, name').eq('id', activeRole.org_id);
          setOrgs(orgData || []);
          const { data: clubData } = await supabase.from('clubs').select('id, name').eq('id', activeRole.club_id);
          setClubs(clubData || []);
        }
      }
    };
    fetchContext();
  }, []);

  // 2. Dynamic Club Loading for Super Admin
  useEffect(() => {
    if (creatorContext.role === 'super_admin' && selectedOrgId) {
      supabase.from('clubs').select('id, name').eq('org_id', selectedOrgId).then(({ data }) => {
        setClubs(data || []);
      });
    } else if (creatorContext.role === 'super_admin' && !selectedOrgId) {
      setClubs([]);
      setSelectedClubId('');
    }
  }, [selectedOrgId, creatorContext.role]);

  // 3. Edit Mode Pre-Loader
  useEffect(() => {
    if (editId) {
      const fetchEventData = async () => {
        const { data, error } = await supabase.from('events').select('*').eq('id', editId).single();
        if (data && !error) {
          const start = new Date(data.reg_start_timestamp);
          const end = new Date(data.reg_end_timestamp);
          setFormData({
            ...data,
            category: data.category || CATEGORIES[0],
            reg_start_date: start.toISOString().split('T')[0],
            reg_start_time: start.toTimeString().slice(0, 5),
            reg_end_date: end.toISOString().split('T')[0],
            reg_end_time: end.toTimeString().slice(0, 5),
            event_type: data.event_type || 'free',
            price: data.price || '',
            merchant_upi: data.merchant_upi || '',
            is_open_to_all: data.is_open_to_all ?? true
          });
          setSelectedOrgId(data.org_id || '');
          setSelectedClubId(data.club_id || '');
          if (data.images && data.images.length > 0) {
            setSelectedImages(data.images.map(url => ({ file: null, url })));
          }
        }
      };
      fetchEventData();
    }
  }, [editId]);

  const getEventBadge = () => {
    const o = orgs.find(org => org.id === selectedOrgId);
    const c = clubs.find(club => club.id === selectedClubId);
    if (c && o) return `${o.name} - ${c.name}`;
    if (o) return o.name;
    return 'HOSTING ORGANIZATION';
  };
  const eventBadge = getEventBadge();

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
    if (!selectedOrgId) return toast.error("Organization selection is strictly required.");
    
    setLoading(true);
    const loadToast = toast.loading(editId ? "Updating Event..." : "Publishing Event...");
    
    try {
      let finalImageUrls = [];

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
          finalImageUrls.push(img.url);
        }
      }

      const startIso = new Date(`${formData.reg_start_date}T${formData.reg_start_time}`).toISOString();
      const endIso = new Date(`${formData.reg_end_date}T${formData.reg_end_time}`).toISOString();

      const submissionData = {
        title: formData.title, category: formData.category, date: formData.date, venue: formData.venue,
        description: formData.description, 
        school: eventBadge, 
        start_time: formData.start_time, end_time: formData.end_time,
        ticket_limit: formData.ticket_limit ? parseInt(formData.ticket_limit) : null,
        reg_start_timestamp: startIso, reg_end_timestamp: endIso,
        images: finalImageUrls,
        event_type: formData.event_type,
        price: formData.event_type === 'paid' ? Number(formData.price) : 0,
        merchant_upi: formData.event_type === 'paid' ? formData.merchant_upi : null,
        is_open_to_all: formData.is_open_to_all,
        org_id: selectedOrgId,
        club_id: selectedClubId || null 
      };

      const { error } = editId 
        ? await supabase.from('events').update(submissionData).eq('id', editId)
        : await supabase.from('events').insert([submissionData]);
      
      if (error) throw error; // THIS CAPTURES THE ERROR FROM SUPABASE

      toast.success(editId ? "Event Updated Successfully!" : "Event Published Successfully!", { id: loadToast });
      navigate(-1);
    } catch (error) {
      console.error("Event Creation Error:", error);
      // DISPLAY THE EXACT SUPABASE ERROR MESSAGE NOW
      toast.error(error.message || "Operation Failed. Please verify inputs.", { id: loadToast, duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const previewImages = selectedImages.length > 0 ? selectedImages.map(img => img.url) : DEFAULT_PREVIEW_IMAGES;

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center p-4">
      <div className="w-full max-w-7xl mb-4 flex justify-start">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* --- FORM SECTION --- */}
        <div className="bg-[#111827] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          <div className="p-8 pb-6 border-b border-slate-800/50 flex items-center gap-4 shrink-0">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><ShieldCheck className="text-white" size={28} /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{editId ? "Edit Event" : "Create Event"}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col grow overflow-hidden">
            <div className="grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
              
              <div className="space-y-4 text-left p-5 bg-purple-900/10 border border-purple-500/20 rounded-3xl transition-all">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Globe size={14} /> Event Visibility
                  </label>
                  <div className="flex bg-[#1f2937] rounded-xl p-1">
                    <button type="button" onClick={() => setFormData({ ...formData, is_open_to_all: true })} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${formData.is_open_to_all ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      <Globe size={12}/> Public
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, is_open_to_all: false })} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${!formData.is_open_to_all ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      <Lock size={12}/> Internal Only
                    </button>
                  </div>
                </div>
                {!formData.is_open_to_all && (
                  <p className="text-[10px] text-rose-400 font-bold px-2 animate-in fade-in slide-in-from-top-1">
                    * This event will be hidden from the public feed. Only users verified with your Organization's domain can discover and book this event.
                  </p>
                )}
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Event Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Event Name" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Layers size={14} /> Event Category</label>
                  <div className="relative w-full" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="flex items-center justify-between w-full p-4 bg-[#1f2937] border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-2xl outline-none text-white text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <span className="truncate pr-4">{formData.category}</span>
                      <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </button>
                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => { setFormData({...formData, category: cat}); setIsCategoryDropdownOpen(false); }}
                              className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${formData.category === cat ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Building size={14} /> Hosting Club / Org</label>
                  
                  {/* SUPER ADMIN VIEW */}
                  {creatorContext.role === 'super_admin' && (
                    <div className="flex gap-2">
                      <div className="relative w-1/2" ref={orgDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                          className="flex items-center justify-between w-full p-4 bg-[#1f2937] border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-2xl outline-none text-white text-xs transition-all shadow-sm cursor-pointer"
                        >
                          <span className="truncate pr-4">
                            {selectedOrgId ? orgs.find(o => o.id === selectedOrgId)?.name : 'Select Org'}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOrgDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                        </button>
                        {isOrgDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                              {orgs.map(o => (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => { setSelectedOrgId(o.id); setSelectedClubId(''); setIsOrgDropdownOpen(false); }}
                                  className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${selectedOrgId === o.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                  {o.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative w-1/2" ref={clubDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                          disabled={!selectedOrgId}
                          className="flex items-center justify-between w-full p-4 bg-[#1f2937] border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-2xl outline-none text-white text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="truncate pr-4">
                            {selectedClubId ? clubs.find(c => c.id === selectedClubId)?.name : 'Org Only'}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                        </button>
                        {isClubDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                              <button
                                type="button"
                                onClick={() => { setSelectedClubId(''); setIsClubDropdownOpen(false); }}
                                className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${!selectedClubId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                              >
                                Org Only
                              </button>
                              {clubs.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => { setSelectedClubId(c.id); setIsClubDropdownOpen(false); }}
                                  className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${selectedClubId === c.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ORG HEAD VIEW */}
                  {creatorContext.role === 'org_head' && (
                    <div className="flex gap-2">
                      <div className="w-1/2 p-4 bg-[#1f2937]/50 border border-slate-700/50 rounded-2xl text-slate-400 text-xs truncate cursor-not-allowed border-dashed">
                         {orgs[0]?.name || 'Loading Org...'}
                      </div>
                      <div className="relative w-1/2" ref={clubDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                          className="flex items-center justify-between w-full p-4 bg-[#1f2937] border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-2xl outline-none text-white text-xs transition-all shadow-sm cursor-pointer"
                        >
                          <span className="truncate pr-4">
                            {selectedClubId ? clubs.find(c => c.id === selectedClubId)?.name : 'Org Only'}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                        </button>
                        {isClubDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                              <button
                                type="button"
                                onClick={() => { setSelectedClubId(''); setIsClubDropdownOpen(false); }}
                                className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${!selectedClubId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                              >
                                Org Only
                              </button>
                              {clubs.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => { setSelectedClubId(c.id); setIsClubDropdownOpen(false); }}
                                  className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${selectedClubId === c.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CLUB HEAD VIEW */}
                  {creatorContext.role === 'club_head' && (
                    <div className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 font-bold uppercase text-[10px] tracking-widest truncate cursor-not-allowed">
                       {eventBadge}
                    </div>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left p-4 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Calendar size={14} /> Event Date</label>
                  <CustomDatePicker value={formData.date} onChange={val => setFormData({...formData, date: val})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Clock size={14} /> Start Time</label>
                  <CustomTimePicker value={formData.start_time} onChange={val => setFormData({...formData, start_time: val})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Clock size={14} /> End Time</label>
                  <CustomTimePicker value={formData.end_time} onChange={val => setFormData({...formData, end_time: val})} />
                </div>
              </div>

              <div className="space-y-4 text-left p-5 bg-blue-900/10 border border-blue-500/20 rounded-3xl">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Clock size={14} /> Registration Window
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opens</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <CustomDatePicker value={formData.reg_start_date} onChange={val => setFormData({...formData, reg_start_date: val})} />
                      </div>
                      <div className="sm:col-span-1">
                        <CustomTimePicker value={formData.reg_start_time} onChange={val => setFormData({...formData, reg_start_time: val})} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closes</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <CustomDatePicker value={formData.reg_end_date} onChange={val => setFormData({...formData, reg_end_date: val})} />
                      </div>
                      <div className="sm:col-span-1">
                        <CustomTimePicker value={formData.reg_end_time} onChange={val => setFormData({...formData, reg_end_time: val})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-left p-5 bg-emerald-900/10 border border-emerald-500/20 rounded-3xl transition-all">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Ticket size={14} /> Ticket Type
                  </label>
                  <div className="flex bg-[#1f2937] rounded-xl p-1">
                    {['free', 'paid'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: type })}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.event_type === type ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.event_type === 'paid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ticket Price (₹)</p>
                      <input 
                        required 
                        type="number" min="1"
                        value={formData.price} 
                        onChange={e => setFormData({...formData, price: e.target.value})} 
                        placeholder="e.g. 199" 
                        className="w-full p-4 bg-[#111827] border border-slate-700 rounded-2xl outline-none focus:border-emerald-500 text-white text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Receiving UPI ID</p>
                      <input 
                        required 
                        type="text" 
                        value={formData.merchant_upi} 
                        onChange={e => setFormData({...formData, merchant_upi: e.target.value})} 
                        placeholder="name@okaxis" 
                        className="w-full p-4 bg-[#111827] border border-slate-700 rounded-2xl outline-none focus:border-emerald-500 text-white text-sm" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-left p-5 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <ImageIcon size={14} /> Event Images (Max 10)
                </label>
                
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

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Type size={14} /> Event Description</label>
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
                    className="w-full p-6 bg-transparent outline-none text-white text-sm resize-none font-mono custom-scrollbar" 
                    placeholder="Use tools above or type <b>bold</b>, <i>italic</i>, etc."
                  />
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 border-t border-slate-800/50 bg-[#111827] shrink-0">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                {loading ? <Zap className="animate-pulse" size={20} /> : editId ? <><Save size={20}/> UPDATE EVENT</> : "PUBLISH EVENT"}
              </button>
            </div>
          </form>
        </div>

        {/* --- PREVIEW SECTION (FLIPPABLE) --- */}
        <div className="space-y-4 lg:sticky lg:top-24">
           
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-blue-500">
               <Eye size={20}/>
               <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-left">Ticket Preview</h3>
             </div>
             <button 
               type="button" 
               onClick={() => setIsFlipped(!isFlipped)} 
               className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg border border-blue-500/30 text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
             >
               <Repeat size={12}/> View {isFlipped ? 'Front' : 'Details'}
             </button>
           </div>
           
           <div className="perspective-2000 w-full h-132.5">
             <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* --- FRONT OF CARD --- */}
                <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-blue-500/40 p-6 md:p-7 shadow-[0_0_30px_rgba(59,130,246,0.1)] text-left flex flex-col">
                  
                  <div className="flex justify-between items-start mb-4 shrink-0">
                    <div className="flex flex-col gap-1">
                      <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-45">
                        {eventBadge}
                      </span>
                      {!formData.is_open_to_all && <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 w-fit flex items-center gap-1"><Lock size={8}/> Internal Only</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400/40 font-black text-[8px] uppercase shrink-0"><Layout size={12}/> FRONT</div>
                  </div>
                  
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
                      <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest truncate">
                        <MapPin size={12} className="text-blue-500"/> {formData.venue || 'Location'}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-700/50 space-y-2 shrink-0">
                      <div className="flex items-center justify-between gap-2 text-blue-500 text-[9px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Timer size={12}/> Registration Window</span>
                        {formData.event_type === 'paid' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">₹{formData.price || '0'}</span>}
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
                    
                    <div className="w-full py-3.5 mt-auto rounded-2xl font-black uppercase text-[9px] tracking-widest shrink-0 bg-blue-600/50 text-white text-center border border-blue-500/50 cursor-not-allowed">
                      Get Ticket (Preview)
                    </div>
                  </div>
                </div>

                {/* --- BACK OF CARD (SPECS) --- */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#111827] rounded-[2.5rem] border-2 border-slate-700 p-6 md:p-8 flex flex-col shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                     <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={14} /> Event Description
                     </h4>
                     <div className="flex items-center gap-1.5 text-slate-500 font-black text-[8px] uppercase"><Layout size={12}/> BACK</div>
                  </div>

                  <div className="grow overflow-y-auto custom-scrollbar pr-2">
                     {formData.description ? (
                       <div 
                         className="event-description text-slate-300 text-sm leading-relaxed"
                         dangerouslySetInnerHTML={{ __html: formData.description }}
                       />
                     ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-3 opacity-50">
                         <Type size={32}/>
                         <p className="text-[10px] font-black uppercase tracking-widest text-center">Description is currently empty.<br/>Type in the editor to preview.</p>
                       </div>
                     )}
                  </div>
                </div>

             </div>
           </div>
           
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        .event-description p { margin-bottom: 0.75rem; }
        .event-description p:last-child { margin-bottom: 0; }
        .event-description strong, .event-description b { font-weight: 700; color: #ffffff; }
        .event-description em, .event-description i { font-style: italic; }
      `}</style>
    </div>
  );
};

export default CreateEvent;