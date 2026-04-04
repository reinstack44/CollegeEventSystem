import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Users, Plus, ArrowLeft, Building2, Zap, LayoutGrid,
  Search, X, UserPlus, CheckCircle, ShieldCheck, Loader2, 
  UserMinus, Edit3, ChevronDown, AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "E-Sports", 
  "Social & Welfare", "Entrepreneurship", "Literature", "Arts & Media", "Other"
];

const ManageClubs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // ROLE CONTEXT
  const [isOrgHead, setIsOrgHead] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [orgDomain, setOrgDomain] = useState('');
  
  const [clubs, setClubs] = useState([]);
  const [clubHeads, setClubHeads] = useState({}); 
  
  // WORKSPACE CONTEXT (For Club Heads)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(localStorage.getItem('active_club_id'));

  // FORM & EDIT STATE
  const [formData, setFormData] = useState({
    name: '', category: CATEGORIES[0], description: ''
  });
  const [editClubId, setEditClubId] = useState(null);

  const [assignModal, setAssignModal] = useState({ isOpen: false, club: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, clubId: null, headEmail: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [assigningEmail, setAssigningEmail] = useState(null);

  // CUSTOM DROPDOWN STATE
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Handle click outside for Custom Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchOrgAndClubs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // 1. Fetch ALL roles for the user (supports multi-club)
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('email', user.email);

        if (rolesError || !userRoles || userRoles.length === 0) {
          toast.error("Unauthorized Access");
          return navigate('/');
        }

        const orgRole = userRoles.find(r => r.role === 'org_head');
        const clubRoles = userRoles.filter(r => r.role === 'club_head');

        const isOH = !!orgRole;
        const isCH = clubRoles.length > 0;
        
        setIsOrgHead(isOH);

        if (!isOH && !isCH) {
          toast.error("Access Restricted.");
          return navigate('/');
        }

        const currentOrgId = isOH ? orgRole.org_id : clubRoles[0].org_id;
        setOrgId(currentOrgId);

        // 2. Fetch Domain
        const { data: orgData } = await supabase.from('organizations').select('domain').eq('id', currentOrgId).single();
        if (orgData) setOrgDomain(orgData.domain);

        // 3. Fetch Clubs based on Role
        let clubQuery = supabase.from('clubs').select('*').eq('org_id', currentOrgId).order('created_at', { ascending: false });
        
        if (!isOH && isCH) {
          // If purely a club head, ONLY show the clubs they manage
          const allowedClubIds = clubRoles.map(r => r.club_id);
          clubQuery = clubQuery.in('id', allowedClubIds);
        }

        const { data: clubData, error: clubError } = await clubQuery;
        if (clubError) throw clubError;
        setClubs(clubData || []);

        // 4. Map Club Heads
        const { data: headsData } = await supabase.from('user_roles').select('email, club_id').eq('role', 'club_head').eq('org_id', currentOrgId);
        if (headsData) {
          const headsMap = {};
          headsData.forEach(h => { if (h.club_id) headsMap[h.club_id] = h.email; });
          setClubHeads(headsMap);
        }

      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load organization data.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrgAndClubs();
  }, [navigate]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('name, surname, email')
          .ilike('email', `%${searchQuery}%`)
          .ilike('email', `%${orgDomain}%`) 
          .limit(5);

        if (!error && data) setSearchResults(data);
      } catch (err) {
        console.error("Search Error", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 400); 
    return () => clearTimeout(timeoutId);
  }, [searchQuery, orgDomain]);

  // --- DUAL PURPOSE: CREATE OR UPDATE CLUB ---
  const handleSaveClub = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Club Name is required.");

    setSubmitting(true);
    const isEditing = !!editClubId;
    const loadToast = toast.loading(isEditing ? "Updating club details..." : "Creating new club...");

    try {
      if (isEditing) {
        // UPDATE EXISTING
        const { data, error } = await supabase
          .from('clubs')
          .update({
            name: formData.name,
            category: formData.category,
            description: formData.description
          })
          .eq('id', editClubId)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setClubs(prev => prev.map(c => c.id === editClubId ? data : c));
        toast.success(`Club updated successfully!`, { id: loadToast });
        handleCancelEdit(); 
      } else {
        // CREATE NEW
        const { data, error } = await supabase
          .from('clubs')
          .insert([{
            org_id: orgId,
            name: formData.name,
            category: formData.category,
            description: formData.description
          }])
          .select()
          .single();

        if (error) throw error;

        setClubs([data, ...clubs]); 
        setFormData({ name: '', category: CATEGORIES[0], description: '' }); 
        toast.success(`${formData.name} created successfully!`, { id: loadToast });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} club.`, { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (club) => {
    setEditClubId(club.id);
    setFormData({
      name: club.name,
      category: club.category || CATEGORIES[0],
      description: club.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleCancelEdit = () => {
    setEditClubId(null);
    setFormData({ name: '', category: CATEGORIES[0], description: '' });
  };

  const handleAssignHead = async (userEmail) => {
    if (!assignModal.club) return;
    setAssigningEmail(userEmail);
    const loadToast = toast.loading(`Assigning ${userEmail.split('@')[0]} as Club Head...`);

    try {
      await supabase.from('user_roles').delete().eq('club_id', assignModal.club.id);

      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          email: userEmail, 
          role: 'club_head', 
          org_id: orgId, 
          club_id: assignModal.club.id 
        });

      if (error) {
        if (error.message.includes('unique constraint')) throw new Error("This student is already managing this exact club.");
        throw error;
      }

      setClubHeads(prev => ({ ...prev, [assignModal.club.id]: userEmail }));
      toast.success("Club Head Assigned Successfully!", { id: loadToast });
      closeModal();
    } catch (error) {
      console.error("Assignment Error:", error);
      toast.error(error.message || "Failed to assign Club Head.", { id: loadToast });
    } finally {
      setAssigningEmail(null);
    }
  };

  // PROFESSIONAL CUSTOM CONFIRMATION TRIGGER
  const handleRemoveHeadClick = (clubId, headEmail) => {
    setConfirmModal({ isOpen: true, clubId, headEmail });
  };

  // ACTUAL DELETION LOGIC
  const confirmRemoveHead = async () => {
    const { clubId, headEmail } = confirmModal;
    const loadToast = toast.loading(`Removing access for ${headEmail}...`);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .match({ club_id: clubId, role: 'club_head' });

      if (error) throw error;

      setClubHeads(prev => {
        const newHeads = { ...prev };
        delete newHeads[clubId];
        return newHeads;
      });

      toast.success("Club Head removed successfully.", { id: loadToast });
    } catch (error) {
      console.error("Removal Error:", error);
      toast.error("Failed to remove Club Head.", { id: loadToast });
    } finally {
      setConfirmModal({ isOpen: false, clubId: null, headEmail: null });
    }
  };

  const handleSetWorkspace = (club) => {
    localStorage.setItem('active_club_id', club.id);
    localStorage.setItem('active_club_name', club.name);
    setActiveWorkspaceId(club.id);
    toast.success(`Active Dashboard set to: ${club.name}`);
  };

  const openModal = (club) => {
    setAssignModal({ isOpen: true, club });
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeModal = () => {
    setAssignModal({ isOpen: false, club: null });
    setSearchQuery('');
  };

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-4 md:p-8 relative">
      
      {/* --- CUSTOM CONFIRMATION MODAL (No HTML Window.Confirm) --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1d]/50">
              <h3 className="text-white font-black uppercase tracking-widest text-base flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} /> Remove Club Head
              </h3>
              <button onClick={() => setConfirmModal({ isOpen: false, clubId: null, headEmail: null })} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-center">
              <p className="text-sm font-bold text-slate-300 leading-relaxed">
                Are you sure you want to remove <br/>
                <span className="inline-block text-white bg-slate-800 px-3 py-1.5 rounded-lg my-2 border border-slate-700">{confirmModal.headEmail}</span><br/> 
                from managing this club?
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">This action revokes their dashboard access immediately.</p>
              
              <div className="flex gap-3 mt-6 pt-2 border-t border-slate-800">
                <button onClick={() => setConfirmModal({ isOpen: false, clubId: null, headEmail: null })} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                  Cancel
                </button>
                <button onClick={confirmRemoveHead} className="flex-1 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg">
                  Confirm Removal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SEARCH & ASSIGN MODAL (Org Head Only) --- */}
      {assignModal.isOpen && assignModal.club && isOrgHead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(147,51,234,0.15)] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1d]/50">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg flex items-center gap-2">
                  <ShieldCheck className="text-purple-500" size={20} /> Assign Club Head
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">For: <span className="text-purple-400">{assignModal.club.name}</span></p>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" autoFocus placeholder={`Search ${orgDomain} users...`}
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none text-sm font-black tracking-widest uppercase focus:border-purple-500 transition-all text-white"
                />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 animate-spin" size={18} />}
              </div>

              <div className="bg-[#0a0f1d] rounded-2xl border border-slate-800 h-64 overflow-y-auto custom-scrollbar p-2">
                {searchQuery.length < 2 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <Users size={32} className="opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Begin typing to search the <br/>university database</p>
                  </div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    No authorized users found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((student) => (
                      <div key={student.email} className="flex items-center justify-between p-3 bg-[#111827] hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-xl transition-all group">
                        <div className="truncate pr-4">
                          <p className="text-white font-bold text-sm truncate">{student.name} {student.surname}</p>
                          <p className="text-slate-500 text-[10px] font-mono truncate">{student.email}</p>
                        </div>
                        <button 
                          disabled={assigningEmail === student.email}
                          onClick={() => handleAssignHead(student.email)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white border border-purple-500/20 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shrink-0 disabled:opacity-50"
                        >
                          {assigningEmail === student.email ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0a0f1d]/50 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-purple-500" /> Securely locked to {orgDomain}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
          <div>
            <button onClick={() => navigate(isOrgHead ? '/org/dashboard' : '/')} className="flex items-center gap-2 text-slate-500 hover:text-purple-500 transition-all font-black text-[10px] uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Users className="text-purple-500" size={32} /> {isOrgHead ? 'Organization Clubs' : 'My Assigned Clubs'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold">
              {isOrgHead ? 'Manage Clubs and Assign Leadership' : 'Manage your assigned clubs.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create/Edit Club Form (Only for Org Heads) */}
          {isOrgHead && (
            <div className={`bg-[#111827] rounded-4xl border ${editClubId ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-slate-800 shadow-2xl'} p-6 md:p-8 sticky top-24 transition-all z-20`}>
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                  {editClubId ? <Edit3 className="text-blue-500" size={20} /> : <Plus className="text-emerald-500" size={20} />} 
                  {editClubId ? 'Update Club' : 'Create Club'}
                </h2>
                {editClubId && (
                  <button onClick={handleCancelEdit} className="text-slate-500 hover:text-red-400 transition-colors" title="Cancel Edit">
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveClub} className="space-y-5 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Club Name <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Robotics Club" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-purple-500 text-white text-sm transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Category <span className="text-red-500">*</span></label>
                  
                  {/* CUSTOM DROPDOWN FOR CATEGORY */}
                  <div className="relative w-full" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="flex items-center justify-between w-full p-4 bg-[#1f2937] border border-slate-700 focus:border-purple-500 hover:border-slate-600 rounded-2xl outline-none text-white text-sm transition-all shadow-sm cursor-pointer"
                    >
                      <span className="truncate pr-4">{formData.category}</span>
                      <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-purple-500' : ''}`} />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1.5">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, category: cat});
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors ${formData.category === cat ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-300 hover:bg-slate-800'}`}
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Club Description</label>
                  <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Briefly describe the club's purpose..." className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-purple-500 text-white text-sm transition-all resize-none custom-scrollbar" />
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={submitting} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 flex justify-center text-white ${editClubId ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:bg-blue-900' : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:bg-purple-900'} disabled:cursor-not-allowed`}>
                    {submitting ? "Processing..." : editClubId ? "Save Changes" : "Create Club"}
                  </button>
                  {editClubId && (
                    <button type="button" onClick={handleCancelEdit} disabled={submitting} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Existing Clubs Grid */}
          <div className={isOrgHead ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <LayoutGrid size={16} /> Active Clubs ({clubs.length})
            </h2>

            {clubs.length === 0 ? (
              <div className="bg-[#111827]/50 border border-slate-800 border-dashed rounded-4xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Building2 size={24} className="text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Clubs Found</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  {isOrgHead ? "Use the form to create official clubs. Once created, you can assign Club Heads to manage them." : "You have not been assigned to manage any clubs yet."}
                </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${!isOrgHead && 'lg:grid-cols-3'}`}>
                {clubs.map((club) => {
                  const headEmail = clubHeads[club.id];
                  const isCurrentActive = activeWorkspaceId === club.id;
                  const isBeingEdited = editClubId === club.id;
                  
                  return (
                    <div key={club.id} className={`bg-[#111827] border ${isCurrentActive ? 'border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.15)]' : isBeingEdited ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-slate-800 hover:border-purple-500/50'} rounded-3xl p-6 transition-all group flex flex-col justify-between h-full relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-24 h-24 ${isBeingEdited ? 'bg-blue-500/10' : 'bg-purple-500/5'} rounded-bl-full pointer-events-none transition-colors`}></div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 border rounded-lg text-[9px] font-black uppercase tracking-widest ${isCurrentActive ? 'bg-purple-600 text-white border-purple-500' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                            {club.category}
                          </span>
                          {/* EDIT BUTTON */}
                          {isOrgHead && (
                            <button onClick={() => handleEditClick(club)} className={`p-1.5 rounded-md transition-colors ${isBeingEdited ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`} title="Edit Club Details">
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight mb-2 truncate pr-4">{club.name}</h3>
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-6">
                          {club.description || "No description provided."}
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-800/50 mt-auto relative z-10">
                        {isOrgHead ? (
                          headEmail ? (
                            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <div className="truncate pr-2">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><CheckCircle size={10}/> Active Head</p>
                                <p className="text-xs text-white font-mono truncate">{headEmail}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openModal(club)} className="p-2 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors" title="Change Head">
                                  <UserPlus size={16} />
                                </button>
                                <button onClick={() => handleRemoveHeadClick(club.id, headEmail)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove Head">
                                  <UserMinus size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => openModal(club)} className="w-full py-3 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-2">
                              <UserPlus size={14} /> Assign Club Head
                            </button>
                          )
                        ) : (
                          // CLUB HEAD CONTEXT SWITCHER
                          <button 
                            onClick={() => handleSetWorkspace(club)} 
                            className={`w-full py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-2 ${isCurrentActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                          >
                            <Zap size={14} /> {isCurrentActive ? 'Active Club' : 'Set as Active Club'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.6); }
      `}</style>
    </div>
  );
};

export default ManageClubs;