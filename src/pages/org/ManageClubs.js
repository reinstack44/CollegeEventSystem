import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Users, Plus, ArrowLeft, Building2, Zap, LayoutGrid,
  Search, X, UserPlus, CheckCircle, ShieldCheck, Loader2
} from 'lucide-react';

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "E-Sports", 
  "Social & Welfare", "Entrepreneurship", "Literature", "Arts & Media", "Other"
];

const ManageClubs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [orgDomain, setOrgDomain] = useState('');
  const [clubs, setClubs] = useState([]);
  const [clubHeads, setClubHeads] = useState({}); // Maps club_id -> head email
  
  // Create Club Form
  const [formData, setFormData] = useState({
    name: '', category: CATEGORIES[0], description: ''
  });

  // Assign Modal & Search Engine State
  const [assignModal, setAssignModal] = useState({ isOpen: false, club: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [assigningEmail, setAssigningEmail] = useState(null);

  useEffect(() => {
    const fetchOrgAndClubs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // 1. Verify role and get org_id
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('org_id')
          .eq('email', user.email)
          .eq('role', 'org_head')
          .single();

        if (roleError || !roleData) {
          toast.error("Unauthorized Access");
          return navigate('/');
        }

        setOrgId(roleData.org_id);

        // 2. Fetch the specific Org Domain for security filtering
        const { data: orgData } = await supabase
          .from('organizations')
          .select('domain')
          .eq('id', roleData.org_id)
          .single();
        
        if (orgData) setOrgDomain(orgData.domain);

        // 3. Fetch existing clubs
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('*')
          .eq('org_id', roleData.org_id)
          .order('created_at', { ascending: false });

        if (clubError) throw clubError;
        setClubs(clubData || []);

        // 4. Fetch currently assigned Club Heads
        const { data: headsData } = await supabase
          .from('user_roles')
          .select('email, club_id')
          .eq('role', 'club_head')
          .eq('org_id', roleData.org_id);

        if (headsData) {
          const headsMap = {};
          headsData.forEach(h => { if (h.club_id) headsMap[h.club_id] = h.email; });
          setClubHeads(headsMap);
        }

      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load ecosystem data.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrgAndClubs();
  }, [navigate]);

  // Real-time Search Engine Hook
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Search the students table for matches, STRICTLY limiting to the org's domain
        const { data, error } = await supabase
          .from('students')
          .select('name, surname, email')
          .ilike('email', `%${searchQuery}%`)
          .ilike('email', `%${orgDomain}%`) // Security lock: Only domain users
          .limit(5);

        if (!error && data) setSearchResults(data);
      } catch (err) {
        console.error("Search Error", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 400); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery, orgDomain]);

  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Club Name is required.");

    setSubmitting(true);
    const loadToast = toast.loading("Establishing new faction...");

    try {
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
      toast.success(`${formData.name} officially established!`, { id: loadToast });

    } catch (error) {
      console.error("Creation Error:", error);
      toast.error("Failed to create club.", { id: loadToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignHead = async (userEmail) => {
    if (!assignModal.club) return;
    setAssigningEmail(userEmail);
    const loadToast = toast.loading(`Promoting ${userEmail.split('@')[0]} to Club Head...`);

    try {
      // Upsert the user's role (Updates if exists, inserts if new)
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          email: userEmail, 
          role: 'club_head', 
          org_id: orgId, 
          club_id: assignModal.club.id 
        }, { onConflict: 'email' });

      if (error) throw error;

      // Update Local UI State
      setClubHeads(prev => ({ ...prev, [assignModal.club.id]: userEmail }));
      toast.success("Command Delegated Successfully!", { id: loadToast });
      closeModal();

    } catch (error) {
      console.error("Assignment Error:", error);
      toast.error("Failed to assign Club Head.", { id: loadToast });
    } finally {
      setAssigningEmail(null);
    }
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
      
      {/* --- SEARCH & ASSIGN MODAL --- */}
      {assignModal.isOpen && assignModal.club && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(147,51,234,0.15)] flex flex-col overflow-hidden relative">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1d]/50">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg flex items-center gap-2">
                  <ShieldCheck className="text-purple-500" size={20} /> Assign Commander
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">For: <span className="text-purple-400">{assignModal.club.name}</span></p>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Box */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  autoFocus
                  placeholder={`Search ${orgDomain} users...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none text-sm font-black tracking-widest uppercase focus:border-purple-500 transition-all text-white"
                />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 animate-spin" size={18} />}
              </div>

              {/* Search Results Box */}
              <div className="bg-[#0a0f1d] rounded-2xl border border-slate-800 h-64 overflow-y-auto custom-scrollbar p-2">
                {searchQuery.length < 2 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <Users size={32} className="opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">Begin typing to scan the <br/>organization database</p>
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
                <ShieldCheck size={12} className="text-purple-500" /> Security Locked to {orgDomain}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
          <div>
            <button onClick={() => navigate('/org/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to HQ
            </button>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Users className="text-purple-500" size={32} /> Organization Clubs
            </h1>
            <p className="text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold">Manage Factions and Delegate Leadership</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Create Club Form (Left Column) */}
          <div className="bg-[#111827] rounded-4xl border border-slate-800 shadow-2xl p-6 md:p-8 sticky top-24">
            <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Plus className="text-emerald-500" size={20} /> Establish Club
            </h2>
            
            <form onSubmit={handleCreateClub} className="space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Club Name <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Robotics Club" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-purple-500 text-white text-sm transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Category <span className="text-red-500">*</span></label>
                <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-purple-500 text-white text-sm transition-all appearance-none cursor-pointer">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Specification / Description</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Briefly describe the club's purpose..." className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-purple-500 text-white text-sm transition-all resize-none custom-scrollbar" />
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-95 flex justify-center mt-4">
                {submitting ? "Processing..." : "Create Club"}
              </button>
            </form>
          </div>

          {/* Existing Clubs Grid (Right Column) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <LayoutGrid size={16} /> Active Factions ({clubs.length})
            </h2>

            {clubs.length === 0 ? (
              <div className="bg-[#111827]/50 border border-slate-800 border-dashed rounded-4xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Building2 size={24} className="text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Clubs Established</h3>
                <p className="text-slate-500 text-sm max-w-sm">Use the form to create official clubs. Once created, you can assign Club Heads to manage them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {clubs.map((club) => {
                  const headEmail = clubHeads[club.id];
                  
                  return (
                    <div key={club.id} className="bg-[#111827] border border-slate-800 hover:border-purple-500/50 rounded-3xl p-6 transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                      {/* Sub-bg decoration */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            {club.category}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight mb-2 truncate pr-4">{club.name}</h3>
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-6">
                          {club.description || "No description provided."}
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-800/50 mt-auto relative z-10">
                        {headEmail ? (
                          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <div className="truncate pr-2">
                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><CheckCircle size={10}/> Active Head</p>
                              <p className="text-xs text-white font-mono truncate">{headEmail}</p>
                            </div>
                            <button onClick={() => openModal(club)} className="p-2 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors" title="Change Head">
                              <UserPlus size={16} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => openModal(club)} className="w-full py-3 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-2">
                            <UserPlus size={14} /> Assign Club Head
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