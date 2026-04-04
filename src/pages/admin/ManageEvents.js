import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Search, Edit3, Trash2, Zap, ArrowLeft, Activity, CalendarX,
  ShieldAlert, Globe, Lock, Building2, Flag, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageEvents = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ROLE & CONTEXT STATE
  const [userRole, setUserRole] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userClubIds, setUserClubIds] = useState([]); // For multi-club heads
  
  // SLICER STATE
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('all');

  // CUSTOM DROPDOWN STATES
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const orgDropdownRef = useRef(null);
  const clubDropdownRef = useRef(null);

  // Handle clicking outside custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) setIsOrgDropdownOpen(false);
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) setIsClubDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. INITIALIZATION: Fetch Roles & Slicer Context
  useEffect(() => {
    const initializeManagement = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // Fetch ALL roles (Supports Multi-Club Head)
        const { data: roles } = await supabase.from('user_roles').select('*').eq('email', user.email);
        
        const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
        const isSuperAdmin = adminEmails.includes(user.email);
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

        // Pre-load top level slicer data based on role
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
          
          // Let them switch between their assigned clubs
          const { data } = await supabase.from('clubs').select('id, name').in('id', myClubIds).order('name');
          setClubs(data || []);
        }
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    initializeManagement();
  }, [navigate]);

  // 2. CASCADING SLICER: Org -> Clubs (Super Admin Only)
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

  // 3. FETCH EVENTS: Strictly scoped based on Role & Slicers
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
          // STRICT SECURITY LOCK: Can only see events in their assigned clubs
          if (selectedClubId !== 'all') {
             // Verify the requested club is actually one they own before querying
             if (userClubIds.includes(selectedClubId)) {
               q = q.eq('club_id', selectedClubId);
             } else {
               q = q.eq('club_id', '00000000-0000-0000-0000-000000000000'); // Force fail
             }
          } else {
            if (userClubIds.length > 0) q = q.in('club_id', userClubIds);
            else q = q.eq('club_id', '00000000-0000-0000-0000-000000000000'); // Force fail if no clubs
          }
        }

        const { data, error } = await q;
        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Event Fetch Error:", error);
        toast.error("Failed to load events database.");
      } finally {
        setLoading(false);
      }
    };

    if (userRole) fetchScopedEvents();
  }, [selectedOrgId, selectedClubId, userRole, userClubIds]);

  const handleDeleteEvent = async (id, title) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 text-left">
        <p className="text-xs font-black uppercase text-white tracking-widest leading-relaxed">
          Wipe all data for <span className="text-red-500">"{title}"</span>?
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">This will permanently delete the event and all associated data.</p>
        <div className="flex gap-2 mt-2">
          <button 
            className="bg-red-600 px-4 py-3 rounded-xl text-[10px] font-black w-full shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('events').delete().eq('id', id);
              if (error) toast.error("Wipe Failed");
              else {
                toast.success("Event Purged");
                setEvents(events.filter(event => event.id !== id));
              }
            }}
          >CONFIRM WIPE</button>
          <button className="bg-slate-700 px-4 py-3 rounded-xl text-[10px] font-black w-full active:scale-95 transition-all" onClick={() => toast.dismiss(t.id)}>CANCEL</button>
        </div>
      </div>
    ), { duration: 5000, style: { background: '#111827', border: '1px solid #ef4444', minWidth: '320px' }});
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showOrgSelect = userRole === 'super_admin';
  const showClubSelect = userRole === 'super_admin' || userRole === 'org_head' || (userRole === 'club_head' && clubs.length > 1);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 sm:p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3 text-blue-500 mb-4">
              <Activity size={28} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Modification Center</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Manage Events</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold flex items-center gap-2">
              <ShieldAlert size={14} className="text-blue-500"/> Managing Authorized Deployments Only
            </p>
          </div>
        </header>

        {/* --- CUSTOM CASCADING SLICER FILTERS --- */}
        <div className="flex flex-col lg:flex-row flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-3xl border border-white/5 shadow-xl relative z-40">
          
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Search events or banners..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-xs font-bold tracking-wider text-white transition-colors shadow-inner focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto ml-auto">
            {/* CUSTOM ORG DROPDOWN */}
            {showOrgSelect && (
              <div className="relative w-full sm:w-64 z-50" ref={orgDropdownRef}>
                <button 
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                  className="flex items-center justify-between w-full px-5 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-[10px] font-black tracking-widest uppercase transition-all text-white shadow-sm"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Building2 size={16} className="text-slate-500 shrink-0"/>
                    <span className="truncate">
                      {selectedOrgId === 'all' ? 'All Organizations' : orgs.find(o => o.id === selectedOrgId)?.name}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isOrgDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>

                {isOrgDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                      <button
                        onClick={() => { setSelectedOrgId('all'); setIsOrgDropdownOpen(false); }}
                        className={`text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 ${selectedOrgId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        All Organizations
                      </button>
                      {orgs.map(o => (
                        <button
                          key={o.id}
                          onClick={() => { setSelectedOrgId(o.id); setIsOrgDropdownOpen(false); }}
                          className={`text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 ${selectedOrgId === o.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOM CLUB DROPDOWN */}
            {showClubSelect && (
              <div className="relative w-full sm:w-64 z-40" ref={clubDropdownRef}>
                <button 
                  onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                  disabled={selectedOrgId === 'all' && userRole === 'super_admin'}
                  className="flex items-center justify-between w-full px-5 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-[10px] font-black tracking-widest uppercase transition-all text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Flag size={16} className="text-slate-500 shrink-0"/>
                    <span className="truncate">
                      {selectedClubId === 'all' ? 'All Factions / Clubs' : clubs.find(c => c.id === selectedClubId)?.name}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isClubDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>

                {isClubDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                      <button
                        onClick={() => { setSelectedClubId('all'); setIsClubDropdownOpen(false); }}
                        className={`text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 ${selectedClubId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        All Factions / Clubs
                      </button>
                      {clubs.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedClubId(c.id); setIsClubDropdownOpen(false); }}
                          className={`text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 ${selectedClubId === c.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">{event.school}</span>
                      
                      {event.is_open_to_all !== undefined && (
                        event.is_open_to_all ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase tracking-widest"><Globe size={10}/> Public</span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[8px] font-black uppercase tracking-widest"><Lock size={10}/> Internal</span>
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
                      onClick={() => handleDeleteEvent(event.id, event.title)} 
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