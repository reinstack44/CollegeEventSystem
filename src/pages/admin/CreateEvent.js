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
  Image as ImageIcon, ChevronLeft, ChevronRight, Timer, Globe, Lock, FileText, Repeat, Layers, Users, Gamepad2, Plus, Settings, Underline, List, Maximize2
} from 'lucide-react';

const DEFAULT_PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800"
];

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "E-Sports", 
  "Social & Welfare", "Entrepreneurship", "Literature", "Arts & Media", "Other"
];

const POPULAR_GAMES = ["BGMI", "Valorant", "Fall Guys", "FIFA", "CS:GO 2", "Free Fire", "Call of Duty"];

const PLATFORM_FEE = 25;

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  
  const [creatorContext, setCreatorContext] = useState({ role: null });
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');

  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const [customGame, setCustomGame] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', category: CATEGORIES[0], date: '', venue: '', description: '', 
    start_time: '', end_time: '', ticket_limit: '',
    reg_start_date: '', reg_start_time: '09:00',
    reg_end_date: '', reg_end_time: '23:59',
    event_type: 'free', price: '', merchant_upi: '',
    is_open_to_all: true,
    participation_type: 'Individual',
    team_size: '',
    games_list: [] 
  });

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isParticipationDropdownOpen, setIsParticipationDropdownOpen] = useState(false);
  
  const orgDropdownRef = useRef(null);
  const clubDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const participationDropdownRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) setIsOrgDropdownOpen(false);
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) setIsClubDropdownOpen(false);
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) setIsCategoryDropdownOpen(false);
      if (participationDropdownRef.current && !participationDropdownRef.current.contains(event.target)) setIsParticipationDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('students').select('role').eq('email', user.email).single();
      const { data: rolesData } = await supabase.from('user_roles').select('*').eq('email', user.email);

      const isSuperAdmin = profile?.role === 'super_admin' || rolesData?.some(r => r.role === 'super_admin');

      let currentRole = 'student';
      if (isSuperAdmin) {
        currentRole = 'super_admin';
      } else if (rolesData && rolesData.length > 0) {
        if (rolesData.some(r => r.role === 'org_head')) currentRole = 'org_head';
        else if (rolesData.some(r => r.role === 'club_head')) currentRole = 'club_head';
      }

      setCreatorContext({ role: currentRole });

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

  useEffect(() => {
    if (editId) {
      const fetchEventData = async () => {
        const { data, error } = await supabase.from('events').select('*').eq('id', editId).single();
        if (data && !error) {
          const start = new Date(data.reg_start_timestamp);
          const end = new Date(data.reg_end_timestamp);
          
          const safeGamesList = Array.isArray(data.games_list) 
            ? data.games_list.map(g => typeof g === 'string' ? { gameName: g, participation_type: 'Individual', team_size: '', ticket_type: 'free', ticket_price: '' } : g)
            : [];

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
            is_open_to_all: data.is_open_to_all ?? true,
             participation_type: data.participation_type || 'Individual',
            team_size: data.team_size || '',
            games_list: safeGamesList
          });
          
          if(editorRef.current) editorRef.current.innerHTML = data.description || '';
          
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

  // True WYSIWYG formatter
  const applyFormatting = (command) => {
    document.execCommand(command, false, null);
    if(editorRef.current) {
        setFormData({ ...formData, description: editorRef.current.innerHTML });
    }
  };

  const handleEditorInput = (e) => {
      setFormData({ ...formData, description: e.currentTarget.innerHTML });
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

  const isGameSelected = (gameName) => formData.games_list.some(g => g.gameName === gameName);

  const toggleGame = (gameName) => {
    setFormData(prev => {
      if (isGameSelected(gameName)) {
        return { ...prev, games_list: prev.games_list.filter(g => g.gameName !== gameName) };
      } else {
        return { ...prev, games_list: [...prev.games_list, { gameName, participation_type: 'Individual', team_size: '', ticket_type: 'free', ticket_price: '' }] };
      }
    });
  };

  const addCustomGame = () => {
    if (customGame.trim() && !isGameSelected(customGame.trim())) {
      setFormData(prev => ({
        ...prev,
        games_list: [...prev.games_list, { gameName: customGame.trim(), participation_type: 'Individual', team_size: '', ticket_type: 'free', ticket_price: '' }]
      }));
      setCustomGame('');
    }
  };

  const updateGameConfig = (gameName, field, value) => {
    setFormData(prev => ({
      ...prev,
      games_list: prev.games_list.map(g => 
        g.gameName === gameName ? { ...g, [field]: value } : g
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrgId) return toast.error("Organization selection is strictly required.");
    
    if (formData.category === 'E-Sports') {
      if (formData.games_list.length === 0) {
        return toast.error("Please select at least one game for this E-Sports tournament.");
      }
      for (const game of formData.games_list) {
        if ((game.participation_type === 'Team' || game.participation_type === 'Both') && (!game.team_size || game.team_size < 2)) {
          return toast.error(`Please enter a valid Team Size (min 2) for ${game.gameName}.`);
        }
        if (game.ticket_type === 'paid' && (!game.ticket_price || game.ticket_price < 1)) {
            return toast.error(`Please enter a valid Ticket Price for ${game.gameName}.`);
        }
      }
    } else {
      if ((formData.participation_type === 'Team' || formData.participation_type === 'Both') && (!formData.team_size || formData.team_size < 2)) {
        return toast.error("Please enter a valid Team Size (minimum 2 members).");
      }
    }

    setLoading(true);
    const loadToast = toast.loading(editId ? "Updating Event..." : "Publishing Event...");
    
    try {
      let finalImageUrls = [];
      for (const img of selectedImages) {
        if (img.file) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, img.file);
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
        event_type: formData.category === 'E-Sports' ? 'mixed' : formData.event_type,
        price: formData.event_type === 'paid' ? Number(formData.price) : 0,
        merchant_upi: formData.merchant_upi || null,
        is_open_to_all: formData.is_open_to_all,
        org_id: selectedOrgId,
        club_id: selectedClubId || null,
        participation_type: formData.category === 'E-Sports' ? null : formData.participation_type, 
        team_size: formData.category === 'E-Sports' ? null : ((formData.participation_type === 'Team' || formData.participation_type === 'Both') ? parseInt(formData.team_size) : null),
        games_list: formData.category === 'E-Sports' ? formData.games_list : [] 
      };

      const { error } = editId 
        ? await supabase.from('events').update(submissionData).eq('id', editId)
        : await supabase.from('events').insert([submissionData]);
      
      if (error) throw error; 

      toast.success(editId ? "Event Updated Successfully!" : "Event Published Successfully!", { id: loadToast });
      navigate(-1);
    } catch (error) {
      console.error("Event Creation Error:", error);
      toast.error(error.message || "Operation Failed. Please verify inputs.", { id: loadToast, duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const previewImages = selectedImages.length > 0 ? selectedImages.map(img => img.url) : DEFAULT_PREVIEW_IMAGES;

  // Calculate Display Price for UI Preview (+25 Platform Fee)
  const getPreviewPrice = () => {
      if(formData.category === 'E-Sports') return "Varies per Game";
      if(formData.event_type === 'free') return "FREE";
      const base = Number(formData.price) || 0;
      return `₹${base + PLATFORM_FEE}`;
  };

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
            <div className="grow overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
              
              <div className="space-y-4 text-left p-5 bg-purple-900/10 border border-purple-500/20 rounded-3xl transition-all">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Globe size={14} /> Who can see this event?
                  </label>
                  <div className="flex bg-[#1f2937] rounded-xl p-1">
                    <button type="button" onClick={() => setFormData({ ...formData, is_open_to_all: true })} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${formData.is_open_to_all ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      <Globe size={12}/> Everyone
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, is_open_to_all: false })} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${!formData.is_open_to_all ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      <Lock size={12}/> College Only
                    </button>
                  </div>
                </div>
                {!formData.is_open_to_all && (
                  <p className="text-[10px] text-rose-400 font-bold px-2 animate-in fade-in slide-in-from-top-1">
                    * This event will be hidden from the public feed. Only users verified with your College's domain can discover and book this event.
                  </p>
                )}
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><AlignLeft size={14} /> Event Name</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="What is your event called?" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Layers size={14} /> Category</label>
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Building size={14} /> Host Details</label>
                  
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

                  {creatorContext.role === 'club_head' && (
                    <div className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 font-bold uppercase text-[10px] tracking-widest truncate cursor-not-allowed">
                       {eventBadge}
                    </div>
                  )}
                </div>
              </div>

              {/* NON-ESPORTS PARTICIPATION */}
              {formData.category !== 'E-Sports' && (
                <div className="space-y-4 text-left p-5 bg-indigo-900/10 border border-indigo-500/20 rounded-3xl transition-all">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Users size={14} /> Participation Details
                      </label>
                      <div className="relative w-48" ref={participationDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsParticipationDropdownOpen(!isParticipationDropdownOpen)}
                            className="flex items-center justify-between w-full p-2.5 bg-[#1f2937] border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl outline-none text-white text-xs transition-all shadow-sm cursor-pointer"
                          >
                            <span className="truncate pr-4 font-bold">{formData.participation_type}</span>
                            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isParticipationDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                          </button>
                          {isParticipationDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                              <div className="flex flex-col p-1.5">
                                {['Individual', 'Team', 'Both'].map(type => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => { setFormData({...formData, participation_type: type}); setIsParticipationDropdownOpen(false); }}
                                    className={`text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors ${formData.participation_type === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    {(formData.participation_type === 'Team' || formData.participation_type === 'Both') && (
                      <div className="flex justify-between items-center pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Team Size Limit</label>
                          <input 
                            type="number" min="2" max="20"
                            value={formData.team_size} 
                            onChange={e => setFormData({...formData, team_size: e.target.value})} 
                            placeholder="e.g. 4" 
                            className="w-48 p-2.5 bg-[#1f2937] border border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-white text-xs font-bold" 
                          />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ESPORTS SPECIFIC SECTION */}
              {formData.category === 'E-Sports' && (
                <div className="space-y-4 text-left p-5 bg-cyan-900/10 border border-cyan-500/20 rounded-3xl transition-all animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Gamepad2 size={14} /> Select Games & Rules
                  </label>
                  <p className="text-[10px] text-slate-400 ml-2">Tap games to add them, then set entry rules and prices for each.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...POPULAR_GAMES, ...formData.games_list.map(g => g.gameName)])).map(gameName => (
                      <button
                        key={gameName} 
                        type="button"
                        onClick={() => toggleGame(gameName)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isGameSelected(gameName) ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/20' : 'bg-[#1f2937] text-slate-400 border-slate-700 hover:border-cyan-500/50'}`}
                      >
                        {gameName}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cyan-500/10">
                    <input
                      type="text"
                      value={customGame}
                      onChange={(e) => setCustomGame(e.target.value)}
                      placeholder="Type custom game..."
                      className="grow p-3 bg-[#1f2937] border border-slate-700 rounded-xl outline-none focus:border-cyan-500 text-white text-xs font-bold"
                    />
                    <button 
                      type="button" 
                      onClick={addCustomGame} 
                      className="px-4 py-3 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-1 border border-cyan-500/30"
                    >
                      <Plus size={14}/> Add
                    </button>
                  </div>

                  {formData.games_list.length > 0 && (
                    <div className="mt-6 space-y-4 border-t border-cyan-500/20 pt-6">
                      <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2 flex items-center gap-2 mb-2">
                        <Settings size={14} /> Configure Specific Games
                      </label>
                      {formData.games_list.map((gameObj, idx) => (
                        <div key={idx} className="p-4 sm:p-5 bg-[#111827] rounded-xl border border-cyan-500/30 flex flex-col gap-4 animate-in fade-in zoom-in-95">
                          <h4 className="font-black text-cyan-400 uppercase tracking-wider text-sm border-b border-white/5 pb-2">
                            {gameObj.gameName}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Participation Rules */}
                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entry Format</p>
                               <div className="flex bg-[#1f2937] rounded-lg p-1 border border-slate-700">
                                 {['Individual', 'Team', 'Both'].map(type => (
                                   <button
                                     key={type}
                                     type="button"
                                     onClick={() => updateGameConfig(gameObj.gameName, 'participation_type', type)}
                                     className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex-1 ${gameObj.participation_type === type ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                                   >
                                     {type}
                                   </button>
                                 ))}
                               </div>
                               {(gameObj.participation_type === 'Team' || gameObj.participation_type === 'Both') && (
                                 <div className="flex items-center justify-between bg-[#1f2937] p-2 rounded-lg border border-slate-700 mt-2">
                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-2">Team Size:</span>
                                   <input 
                                     type="number" min="2" max="20"
                                     value={gameObj.team_size} 
                                     onChange={e => updateGameConfig(gameObj.gameName, 'team_size', e.target.value)} 
                                     placeholder="e.g. 5" 
                                     className="w-16 p-1.5 bg-[#111827] border border-slate-700 rounded-md outline-none focus:border-cyan-500 text-white text-xs font-bold text-center" 
                                   />
                                 </div>
                               )}
                            </div>

                            {/* Ticket Rules */}
                            <div className="space-y-3">
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pricing</p>
                               <div className="flex bg-[#1f2937] rounded-lg p-1 border border-slate-700">
                                 {['free', 'paid'].map(type => (
                                   <button
                                     key={type}
                                     type="button"
                                     onClick={() => updateGameConfig(gameObj.gameName, 'ticket_type', type)}
                                     className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex-1 ${gameObj.ticket_type === type ? (type==='paid'?'bg-emerald-600':'bg-slate-600') + ' text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                                   >
                                     {type}
                                   </button>
                                 ))}
                               </div>
                               {gameObj.ticket_type === 'paid' && (
                                 <div className="flex items-center justify-between bg-[#1f2937] p-2 rounded-lg border border-slate-700 mt-2">
                                   <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest pl-2">Entry Fee:</span>
                                   <div className="flex items-center gap-1">
                                      <span className="text-slate-400 text-xs font-bold">₹</span>
                                      <input 
                                        type="number" min="1"
                                        value={gameObj.ticket_price} 
                                        onChange={e => updateGameConfig(gameObj.gameName, 'ticket_price', e.target.value)} 
                                        placeholder="Base" 
                                        className="w-20 p-1.5 bg-[#111827] border border-slate-700 rounded-md outline-none focus:border-emerald-500 text-white text-xs font-bold text-center" 
                                      />
                                   </div>
                                 </div>
                               )}
                            </div>
                          </div>

                        </div>
                      ))}
                      {/* Show Global Merchant UPI Input if at least one game is paid */}
                      {formData.games_list.some(g => g.ticket_type === 'paid') && (
                         <div className="mt-4 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                               Your UPI ID to receive payments
                            </label>
                            <input 
                              required 
                              type="text" 
                              value={formData.merchant_upi} 
                              onChange={e => setFormData({...formData, merchant_upi: e.target.value})} 
                              placeholder="name@bank" 
                              className="w-full p-3 bg-[#1f2937] border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-white text-sm" 
                            />
                         </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><MapPin size={14} /> Location</label>
                  <input required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} placeholder="Where is this happening?" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Ticket size={14} /> Max Tickets Available</label>
                  <input type="number" min="1" value={formData.ticket_limit} onChange={e => setFormData({...formData, ticket_limit: e.target.value})} placeholder="Leave blank for unlimited" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left p-4 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
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
                  <Clock size={14} /> Ticket Booking Window
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-[#1f2937]/50 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">When does booking start?</p>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">When does booking end?</p>
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

              {/* ONLY SHOW GLOBAL TICKET RULES IF NOT E-SPORTS */}
              {formData.category !== 'E-Sports' && (
                <div className="space-y-4 text-left p-5 bg-emerald-900/10 border border-emerald-500/20 rounded-3xl transition-all">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Ticket size={14} /> Entry Type
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Base Ticket Price (₹)</p>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your UPI ID to receive payments</p>
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
              )}

              <div className="space-y-3 text-left p-5 bg-[#1f2937]/30 border border-slate-700/50 rounded-3xl">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <ImageIcon size={14} /> Upload Banner Images (Max 10)
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
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tap or Drop Images Here</p>
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

              {/* PROFESSIONAL WYSIWYG EDITOR */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Type size={14} /> Event Description Details</label>
                <div className="bg-[#1f2937] rounded-3xl border border-slate-700 overflow-hidden focus-within:border-blue-500 transition-all flex flex-col">
                  
                  {/* Editor Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-3 px-3 py-3 border-b border-slate-700/50 bg-slate-900/80">
                    <button type="button" onClick={() => applyFormatting('bold')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Bold"><Bold size={16}/></button>
                    <button type="button" onClick={() => applyFormatting('italic')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Italic"><Italic size={16}/></button>
                    <button type="button" onClick={() => applyFormatting('underline')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Underline"><Underline size={16}/></button>
                    
                    <div className="w-px h-5 bg-slate-700 mx-1"></div>
                    
                    <button type="button" onClick={() => applyFormatting('justifyLeft')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Align Left"><AlignLeft size={16}/></button>
                    <button type="button" onClick={() => applyFormatting('justifyCenter')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Align Center"><AlignJustify size={16}/></button>
                    
                    <div className="w-px h-5 bg-slate-700 mx-1"></div>
                    
                    <button type="button" onClick={() => applyFormatting('insertUnorderedList')} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Bullet List"><List size={16}/></button>
                  </div>
                  
                  {/* Visual Editable Area */}
                  <div 
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorInput}
                    className="w-full p-6 min-h-37.5 bg-transparent outline-none text-white text-sm resize-y custom-scrollbar event-description-editor cursor-text" 
                    data-placeholder="Highlight text and click the tools above to format..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-8 pt-4 border-t border-slate-800/50 bg-[#111827] shrink-0">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                {loading ? <Zap className="animate-pulse" size={20} /> : editId ? <><Save size={20}/> UPDATE EVENT</> : "PUBLISH EVENT"}
              </button>
            </div>
          </form>
        </div>

        {/* --- TICKET PREVIEW SECTION (FLIPPABLE) --- */}
        <div className="space-y-4 lg:sticky lg:top-24">
            
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-blue-500">
               <Eye size={20}/>
               <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-left">Live Ticket Preview</h3>
             </div>
             <button 
               type="button" 
               onClick={() => setIsFlipped(!isFlipped)} 
               className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg border border-blue-500/30 text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
             >
               <Repeat size={12}/> View {isFlipped ? 'Front' : 'Details'}
             </button>
           </div>
           
           {/* Card Container resized for full responsiveness */}
           <div className="perspective-2000 w-full min-h-125 h-auto aspect-4/5 max-w-sm mx-auto lg:max-w-none">
             <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
               
               {/* --- FRONT OF CARD --- */}
               <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-blue-500/40 p-6 md:p-7 shadow-[0_0_30px_rgba(59,130,246,0.1)] text-left flex flex-col">
                 
                 <div className="flex justify-between items-start mb-4 shrink-0">
                   <div className="flex flex-col gap-1">
                     <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-45">
                       {eventBadge}
                     </span>
                     {!formData.is_open_to_all && <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 w-fit flex items-center gap-1"><Lock size={8}/> College Only</span>}
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
                     {formData.title || 'Your Awesome Event'}
                   </h4>

                   <div className="space-y-1 shrink-0">
                     <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                       <Calendar size={12} className="text-blue-500"/> {formData.date || 'YYYY-MM-DD'}
                     </div>
                     <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                       <Clock size={12} className="text-blue-500"/> {formData.start_time || '--:--'} - {formData.end_time || '--:--'}
                     </div>
                     <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest truncate">
                       <MapPin size={12} className="text-blue-500"/> {formData.venue || 'Location TBA'}
                     </div>
                   </div>

                   <div className="pt-3 border-t border-slate-700/50 space-y-2 shrink-0">
                     <div className="flex items-center justify-between gap-2 text-blue-500 text-[9px] font-black uppercase tracking-widest">
                       <span className="flex items-center gap-2"><Timer size={12}/> Registration Window</span>
                       
                       {/* Total Display Price (+ Platform Fee) */}
                       <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                           {getPreviewPrice()}
                       </span>

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
               <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#111827] rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-slate-700 p-6 md:p-8 flex flex-col shadow-2xl overflow-hidden group/back">
                 <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Full Description
                    </h4>
                    <div className="flex items-center gap-1.5 text-slate-500 font-black text-[8px] uppercase"><Layout size={12}/> BACK</div>
                 </div>

                 <div className="grow overflow-y-auto custom-scrollbar pr-2 relative">
                    {formData.description ? (
                      <div 
                        className="event-description text-slate-300 text-sm leading-relaxed pb-12"
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-3 opacity-50">
                        <Type size={32}/>
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Description is empty.<br/>Type in the editor to see it here.</p>
                      </div>
                    )}
                 </div>
                 
                 {/* ZOOM BUTTON FOR DESCRIPTION */}
                 {formData.description && (
                   <div className="absolute bottom-12 left-0 right-0 flex justify-center pb-2 bg-linear-to-t from-[#111827] via-[#111827] to-transparent pt-6">
                      <button 
                        type="button" 
                        onClick={() => setIsDescriptionExpanded(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-full font-black uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                      >
                         <Maximize2 size={12}/> Read Full Details
                      </button>
                   </div>
                 )}

                 <p className="mt-4 pt-4 border-t border-white/10 shrink-0 text-center text-slate-500 text-[10px] font-bold uppercase animate-pulse">Tap flip button above to return</p>
               </div>

             </div>
           </div>
        </div>

      </div>

      {/* --- FULL SCREEN DESCRIPTION MODAL --- */}
      {isDescriptionExpanded && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="w-full max-w-2xl bg-[#0f172a] border border-blue-500/30 rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#111827]">
                 <h3 className="font-black text-white uppercase tracking-wider flex items-center gap-2"><FileText size={18} className="text-blue-500"/> Full Description</h3>
                 <button onClick={() => setIsDescriptionExpanded(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20}/>
                 </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                 <div 
                    className="event-description text-slate-300 text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formData.description }}
                 />
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        /* WYSIWYG Output & Editor Styling */
        .event-description-editor:empty:before {
            content: attr(data-placeholder);
            color: #475569;
            pointer-events: none;
            font-style: italic;
        }
        .event-description-editor p, .event-description p { margin-bottom: 0.75rem; }
        .event-description-editor p:last-child, .event-description p:last-child { margin-bottom: 0; }
        .event-description-editor strong, .event-description-editor b,
        .event-description strong, .event-description b { font-weight: 700; color: #ffffff; }
        .event-description-editor em, .event-description-editor i,
        .event-description em, .event-description i { font-style: italic; }
        .event-description-editor ul, .event-description ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #94a3b8;}
        .event-description-editor ol, .event-description ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #94a3b8;}
      `}</style>
    </div>
  );
};

export default CreateEvent;