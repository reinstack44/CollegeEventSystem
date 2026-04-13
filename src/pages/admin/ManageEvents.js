import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Search, Edit3, Trash2, Zap, ArrowLeft, Activity, CalendarX,
  ShieldAlert, Globe, Lock, AlertTriangle, X, Filter, ChevronDown, Gamepad2
} from 'lucide-react';
import toast from 'react-hot-toast';

// IMPORT SMART BACK HOOK FOR NATIVE iOS ROUTING
import { useSmartBack } from '../../App';

const ManageEvents = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack(); // Initialize the smart back hook
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [userRole, setUserRole] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userClubIds, setUserClubIds] = useState([]); 
  
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('all');

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, eventId: null, eventTitle: '' });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setIsFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initializeManagement = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        const { data: profile } = await supabase.from('students').select('role').eq('email', user.email).single();
        const { data: roles } = await supabase.from('user_roles').select('*').eq('email', user.email);
        
        const isSuperAdmin = profile?.role === 'super_admin' || roles?.some(r => r.role === 'super_admin');
        const isOrgHead = roles?.some(r => r.role === 'org_head');
        const isClubHead = roles?.some(r => r.role === 'club_head');

        let highestRole = 'student';
        if (isSuperAdmin) highestRole = 'super_admin';
        else if (isOrgHead) highestRole = 'org_head';
        else if (isClubHead) highestRole = 'club_head';

        if (highestRole === 'student') {
          toast.error("Unauthorized Access");
          return navigate('/');
        }

        setUserRole(highestRole);

        if (highestRole === 'super_admin') {
          const { data } = await supabase.from('organizations').select('id, name').eq('status', 'approved').order('name');
          setOrgs(data || []);
        } else if (highestRole === 'org_head') {
          const myOrgId = roles.find(r => r.role === 'org_head').org_id;
          setSelectedOrgId(myOrgId);
          const { data } = await supabase.from('clubs').select('id, name').eq('org_id', myOrgId).order('name');
          setClubs(data || []);
        } else if (highestRole === 'club_head') {
          const myOrgId = roles.find(r => r.role === 'club_head').org_id;
          const myClubIds = roles.filter(r => r.role === 'club_head').map(r => r.club_id);
          setUserClubIds(myClubIds);
          setSelectedOrgId(myOrgId);
          
          const { data } = await supabase.from('clubs').select('id, name').in('id', myClubIds).order('name');
          setClubs(data || []);
        }
      } catch (err) {
        console.error("Init Error:", err);
        toast.error("Session verification failed. Please log in again.");
      }
    };
    initializeManagement();
  }, [navigate]);

  useEffect(() => {
    if (userRole === 'super_admin') {
      if (selectedOrgId !== 'all') {
        supabase.from('clubs').select('id, name').eq('org_id', selectedOrgId).order('name').then(({ data }) => {
          setClubs(data || []);
        });
        setSelectedClubId('all');
      } else {
        setClubs([]);
        setSelectedClubId('all');
      }
    }
  }, [selectedOrgId, userRole]);

  useEffect(() => {
    const fetchScopedEvents = async () => {
      setLoading(true);
      try {
        let q = supabase.from('events').select('*').order('date', { ascending: false });

        if (userRole === 'super_admin') {
          if (selectedOrgId !== 'all') q = q.eq('org_id', selectedOrgId);
          if (selectedClubId !== 'all') q = q.eq('club_id', selectedClubId);
        } else if (userRole === 'org_head') {
          q = q.eq('org_id', selectedOrgId);
          if (selectedClubId !== 'all') q = q.eq('club_id', selectedClubId);
        } else if (userRole === 'club_head') {
          if (selectedClubId !== 'all') {
             if (userClubIds.includes(selectedClubId)) {
               q = q.eq('club_id', selectedClubId);
             } else {
               q = q.eq('club_id', '00000000-0000-0000-0000-000000000000'); 
             }
          } else {
            if (userClubIds.length > 0) q = q.in('club_id', userClubIds);
            else q = q.eq('club_id', '00000000-0000-0000-0000-000000000000'); 
          }
        }

        const { data, error } = await q;
        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Event Fetch Error:", error);
        toast.error("Unable to load event database. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    if (userRole) fetchScopedEvents();
  }, [selectedOrgId, selectedClubId, userRole, userClubIds]);

  const handleDeleteEventClick = (id, title) => {
    setConfirmModal({ isOpen: true, eventId: id, eventTitle: title });
  };

  const confirmDeleteEvent = async () => {
    const { eventId } = confirmModal;
    const loadToast = toast.loading("Deleting event...");
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      toast.success("Event deleted successfully.", { id: loadToast });
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Unable to delete event right now.", { id: loadToast });
    } finally {
      setConfirmModal({ isOpen: false, eventId: null, eventTitle: '' });
    }
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.category && event.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const showOrgSelect = userRole === 'super_admin';
  const showClubSelect = userRole === 'super_admin' || userRole === 'org_head' || (userRole === 'club_head' && clubs.length > 1);
  const isFilterActive = selectedOrgId !== 'all' || selectedClubId !== 'all';

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 sm:p-6 md:p-12 selection:bg-blue-500/30">
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1d]/50">
              <h3 className="text-white font-black uppercase tracking-widest text-base flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} /> Delete Event
              </h3>
              <button onClick={() => setConfirmModal({ isOpen: false, eventId: null, eventTitle: '' })} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-sm font-bold text-slate-300 leading-relaxed">
                Are you sure you want to delete <br/>
                <span className="inline-block text-white bg-slate-800 px-3 py-1.5 rounded-lg my-2 border border-slate-700">{confirmModal.eventTitle}</span>?
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                This will permanently delete the event and all associated data. This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-6 pt-2 border-t border-slate-800">
                <button onClick={() => setConfirmModal({ isOpen: false, eventId: null, eventTitle: '' })} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                  Cancel
                </button>
                <button onClick={confirmDeleteEvent} className="flex-1 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg">
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* USE SMART BACK HOOK FOR iOS COMPATIBILITY */}
        <button onClick={() => smartBack('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3 text-blue-500 mb-4">
              <Activity size={28} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Event Management</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Manage Events</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold flex items-center gap-2">
              <ShieldAlert size={14} className="text-blue-500"/> Managing Your Authorized Events
            </p>
          </div>
        </header>

        {/* --- CONDENSED FILTER BAR --- */}
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-3xl border border-white/5 shadow-xl relative z-40">
          <div className="flex items-center gap-3 relative w-full z-40" ref={filterMenuRef}>
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-xs font-bold tracking-wider text-white transition-colors shadow-inner focus:border-blue-500"
              />
            </div>

            {(showOrgSelect || showClubSelect) && (
              <button 
                 onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                 className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all border shrink-0 ${isFilterActive || isFilterMenuOpen ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
              >
                 <Filter size={18} />
                 <span className="hidden sm:inline">Filter</span>
                 {isFilterActive && (
                   <span className="w-2 h-2 rounded-full bg-white ml-1 animate-pulse"></span>
                 )}
              </button>
            )}

            {isFilterMenuOpen && (
              <div className="absolute top-full right-0 mt-3 w-full sm:w-85 bg-[#111827] border border-white/10 rounded-3xl shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95">
                 <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                       <Filter size={14} className="text-blue-500"/> Search Filters
                    </h3>
                    <button 
                       onClick={() => { setSelectedOrgId('all'); setSelectedClubId('all'); }} 
                       className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors"
                    >
                       Reset All
                    </button>
                 </div>

                 <div className="space-y-4">
                   {showOrgSelect && (
                     <div>
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Organization</span>
                       <div className="relative">
                          <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer">
                             <option value="all">All Organizations</option>
                             {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                       </div>
                     </div>
                   )}

                   {showClubSelect && (
                     <div>
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Club / Faction</span>
                       <div className="relative">
                          <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} disabled={selectedOrgId === 'all' && userRole === 'super_admin'} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer disabled:opacity-50">
                             <option value="all">All Clubs</option>
                             {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* --- EVENTS LIST --- */}
        <div className="bg-[#111827] p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl">
          {loading ? (
            <div className="py-20 flex justify-center"><Zap className="animate-pulse text-blue-500" size={40} /></div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-20 flex flex-col items-center opacity-40">
              <CalendarX size={48} className="mb-4 text-slate-500" />
              <p className="font-black uppercase text-xs tracking-widest italic">No events found in scope.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all gap-4 group">
                  <div className="w-full text-left">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">{event.school}</span>
                      
                      {event.category === 'E-Sports' && (
                         <span className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md text-[8px] font-black uppercase tracking-widest"><Gamepad2 size={10}/> E-Sports</span>
                      )}

                      {event.is_open_to_all !== undefined && (
                        event.is_open_to_all ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase tracking-widest"><Globe size={10}/> Public</span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[8px] font-black uppercase tracking-widest"><Lock size={10}/> College Only</span>
                        )
                      )}
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-white uppercase italic leading-tight mt-1 group-hover:text-blue-400 transition-colors">{event.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end border-t border-white/5 sm:border-none pt-4 sm:pt-0">
                    <button 
                      onClick={() => navigate(`/admin/create?edit=${event.id}`)} 
                      className="flex-1 sm:flex-none flex justify-center items-center p-3 sm:p-4 bg-blue-500/10 text-blue-500 rounded-xl sm:rounded-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                    >
                      <Edit3 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEventClick(event.id, event.title)} 
                      className="flex-1 sm:flex-none flex justify-center items-center p-3 sm:p-4 bg-red-500/10 text-red-500 rounded-xl sm:rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                      <Trash2 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageEvents;