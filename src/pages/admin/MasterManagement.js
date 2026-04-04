import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { 
  Search, Zap, Filter, ShieldAlert, Fingerprint, Download, 
  ArrowLeft, CheckCircle, XCircle, Trash2, UserX, ChevronDown, 
  Eye, X, Phone, Mail, IndianRupee, Lock, Building2, Flag, Layers, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const MasterManagement = () => {
  const navigate = useNavigate(); 
  
  // ROLE & CONTEXT STATE
  const [userRole, setUserRole] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userClubIds, setUserClubIds] = useState([]);
  
  // SLICER STATE
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState('all'); 
  
  // EVENT & ATTENDEE STATE
  const [allEvents, setAllEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // CUSTOM DROPDOWN STATES
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  
  const eventDropdownRef = useRef(null);
  const orgDropdownRef = useRef(null);
  const clubDropdownRef = useRef(null);
  
  // MODALS
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null, isReject: false });

  // 1. INITIALIZATION
  useEffect(() => {
    const initializeRegistry = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

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

        // Set role last so dependent useEffects don't fire prematurely
        setUserRole(highestRole);
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    initializeRegistry();
  }, [navigate]);

  // 2. CASCADING SLICER: Org -> Clubs
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

  // 3. CASCADING SLICER: Clubs -> Events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!userRole) return; // Guard against premature execution

      let q = supabase.from('events').select('id, title, date, org_id, club_id').order('date', { ascending: false });

      if (userRole === 'super_admin') {
        if (selectedOrgId !== 'all') q = q.eq('org_id', selectedOrgId);
        if (selectedClubId !== 'all') q = q.eq('club_id', selectedClubId);
      } else if (userRole === 'org_head') {
        if (selectedOrgId === 'all') return; // State guard: Wait for org ID to populate
        q = q.eq('org_id', selectedOrgId);
        if (selectedClubId !== 'all') q = q.eq('club_id', selectedClubId);
      } else if (userRole === 'club_head') {
        if (selectedClubId !== 'all') {
          q = q.eq('club_id', selectedClubId);
        } else {
          const clubIds = clubs.map(c => c.id);
          if (clubIds.length > 0) q = q.in('club_id', clubIds);
          else q = q.eq('club_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { data, error } = await q;
      if (!error && data) {
        setAllEvents(data);
      } else {
        setAllEvents([]);
      }
      setSelectedEventId('all'); 
    };

    if (userRole) fetchEvents();
  }, [selectedOrgId, selectedClubId, userRole, clubs]);

  // 4. DATA FETCH: Dynamic Attendee Aggregation
  const fetchAttendees = useCallback(async () => {
    if (!userRole) return; // Guard against premature execution

    setLoading(true);
    try {
      let q = supabase
        .from('bookings')
        .select(`
          *,
          students ( name, surname, email, phone, urn ),
          events!inner ( title, price, org_id, club_id )
        `)
        .order('created_at', { ascending: false });

      if (selectedEventId === 'all') {
        
        if (selectedOrgId !== 'all') {
          q = q.eq('events.org_id', selectedOrgId);
        } else if (userRole !== 'super_admin') {
          // State guard: If not a super admin, selectedOrgId MUST be a UUID. Wait for it.
          setLoading(false);
          return; 
        }

        if (selectedClubId !== 'all') {
          q = q.eq('events.club_id', selectedClubId);
        } else if (userRole === 'club_head') {
          if (userClubIds.length > 0) {
            q = q.in('events.club_id', userClubIds);
          } else {
            q = q.eq('events.club_id', '00000000-0000-0000-0000-000000000000');
          }
        }
      } else {
        q = q.eq('event_id', selectedEventId);
      }

      const { data, error } = await q;
      if (error) throw error;
      setAttendees(data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to retrieve database records.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, selectedOrgId, selectedClubId, userRole, userClubIds]);

  useEffect(() => {
    fetchAttendees();
    
    const config = { event: '*', schema: 'public', table: 'bookings' };
    if (selectedEventId !== 'all') config.filter = `event_id=eq.${selectedEventId}`;
    
    const channel = supabase.channel(`registry_sync`)
      .on('postgres_changes', config, fetchAttendees)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [selectedEventId, fetchAttendees]);

  // Dropdown dismiss logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target)) setIsEventDropdownOpen(false);
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) setIsOrgDropdownOpen(false);
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) setIsClubDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- ACTIONS ---
  const handleVerifyUTR = async (bookingId) => {
    const toastId = toast.loading("Verifying Payment...");
    try {
      const { error } = await supabase.from('bookings').update({ status: 'verified' }).eq('id', bookingId);
      if (error) throw error;
      toast.success("Payment Verified!", { id: toastId });
      setAttendees(prev => prev.map(a => a.id === bookingId ? { ...a, status: 'verified' } : a));
      if (selectedAttendee?.id === bookingId) setSelectedAttendee(prev => ({...prev, status: 'verified'}));
    } catch (error) {
      toast.error("Verification failed.", { id: toastId });
    }
  };

  const handleTerminateClick = (bookingId, isReject = false) => {
    setConfirmModal({ isOpen: true, bookingId, isReject });
  };

  const confirmTerminate = async () => {
    const { bookingId, isReject } = confirmModal;
    const loadToast = toast.loading(isReject ? "Rejecting payment..." : "Canceling ticket...");
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      toast.success(isReject ? "Payment rejected." : "Ticket cancelled successfully.", { id: loadToast });
      setAttendees(prev => prev.filter(a => a.id !== bookingId));
      if (selectedAttendee?.id === bookingId) setSelectedAttendee(null); 
    } catch (error) {
      toast.error("Action failed.", { id: loadToast });
    } finally {
      setConfirmModal({ isOpen: false, bookingId: null, isReject: false });
    }
  };

  const getTxnId = (item) => item.utr_number || item.transaction_id || item.payment_id || item.razorpay_payment_id;

  const getFeeBreakdown = (item) => {
    const base = parseFloat(item.events?.price || item.amount_expected || 0);
    if (base === 0) return { base: "0.00", platform: "0.00", transaction: "0.00", total: "0.00" };
    const platform = parseFloat(item.platform_fee ?? 5.00); 
    const transaction = parseFloat(item.transaction_fee ?? item.razorpay_fee ?? ((base + platform) * 0.025).toFixed(2));
    const total = parseFloat(item.total_amount ?? item.amount ?? (base + platform + transaction).toFixed(2));
    return { base: base.toFixed(2), platform: platform.toFixed(2), transaction: transaction.toFixed(2), total: total.toFixed(2) };
  };

  const downloadCSV = () => {
    if (attendees.length === 0) return toast.error("No data to export");
    const toastId = toast.loading("Preparing Export...");
    
    let exportName = "Database";
    if (selectedEventId !== 'all') {
      exportName = allEvents.find(e => e.id === selectedEventId)?.title.replace(/\s+/g, '_') || "Event";
    } else if (selectedClubId !== 'all') {
      exportName = "Club_Wide";
    } else {
      exportName = "University_Wide";
    }

    const headers = "Event,Name,Surname,Email,Phone,URN,Status,Transaction ID,Ticket Fee,Platform Fee,Transaction Fee,Total Paid\n";
    const rows = attendees.map(item => {
      const txn = getTxnId(item) || 'N/A';
      const fees = getFeeBreakdown(item);
      const eventName = item.events?.title?.replace(/,/g, '') || 'Unknown Event';
      return `${eventName},${item.students?.name || 'Unknown'},${item.students?.surname || ''},${item.student_email},${item.students?.phone || 'N/A'},${item.students?.urn || 'N/A'},${item.status},${txn},₹${fees.base},₹${fees.platform},₹${fees.transaction},₹${fees.total}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}_Registry.csv`;
    a.click();
    toast.success("Export Complete!", { id: toastId });
  };

  // --- FILTERS & GROUPS ---
  const filteredList = attendees.filter(item => 
    item.students?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.students?.urn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.events?.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (getTxnId(item) && getTxnId(item).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const today = new Date().toISOString().split('T')[0];
  const liveEvents = allEvents.filter(e => e.date >= today);
  const pastEvents = allEvents.filter(e => e.date < today);

  const showOrgSelect = userRole === 'super_admin';
  const showClubSelect = userRole === 'super_admin' || userRole === 'org_head' || (userRole === 'club_head' && clubs.length > 1);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 sm:p-6 md:p-12 selection:bg-blue-500/30 font-sans">
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1d]/50">
              <h3 className="text-white font-black uppercase tracking-widest text-base flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} /> {confirmModal.isReject ? 'Reject Payment' : 'Cancel Ticket'}
              </h3>
              <button onClick={() => setConfirmModal({ isOpen: false, bookingId: null, isReject: false })} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <p className="text-sm font-bold text-slate-300 leading-relaxed">
                Are you sure you want to {confirmModal.isReject ? 'reject this payment' : 'cancel this ticket'}?
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                This action cannot be undone and will permanently remove the record.
              </p>
              <div className="flex gap-3 mt-6 pt-2 border-t border-slate-800">
                <button onClick={() => setConfirmModal({ isOpen: false, bookingId: null, isReject: false })} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                  Cancel
                </button>
                <button onClick={confirmTerminate} className="flex-1 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3 text-blue-500 mb-4">
              <ShieldAlert size={28} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Administration</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">Event Database</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold flex items-center gap-2">
              <Lock size={14} className="text-blue-500"/> Access Role: {userRole?.replace('_', ' ').toUpperCase() || 'Verifying...'}
            </p>
          </div>

          <button onClick={downloadCSV} className="w-full lg:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0">
            <Download size={16} /> Export Data (CSV)
          </button>
        </header>

        {/* --- CASCADING SLICER FILTERS --- */}
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-3xl border border-white/5 shadow-xl relative z-40">
          
          {showOrgSelect && (
            <div className="relative w-full md:w-auto min-w-48 grow md:grow-0 z-50" ref={orgDropdownRef}>
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
                <div className="absolute top-full left-0 mt-2 w-full min-w-56 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
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

          {showClubSelect && (
            <div className="relative w-full md:w-auto min-w-48 grow md:grow-0 z-40" ref={clubDropdownRef}>
              <button 
                onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                disabled={selectedOrgId === 'all' && userRole === 'super_admin'}
                className="flex items-center justify-between w-full px-5 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-[10px] font-black tracking-widest uppercase transition-all text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 truncate">
                  <Flag size={16} className="text-slate-500 shrink-0"/>
                  <span className="truncate">
                    {selectedClubId === 'all' ? 'All Clubs' : clubs.find(c => c.id === selectedClubId)?.name}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 shrink-0 ${isClubDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              {isClubDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-56 bg-[#111827] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                    <button
                      onClick={() => { setSelectedClubId('all'); setIsClubDropdownOpen(false); }}
                      className={`text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-white/5 last:border-0 ${selectedClubId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      All Clubs
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

          <div className="relative w-full md:w-auto min-w-64 grow md:grow-0 z-30" ref={eventDropdownRef}>
            <button 
              onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
              className="flex items-center justify-between w-full bg-blue-600/10 px-5 py-3.5 rounded-2xl border border-blue-500/30 shadow-lg transition-all hover:bg-blue-600/20 active:scale-95"
            >
              <div className="flex items-center gap-3 truncate">
                <Filter size={16} className="text-blue-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-400 truncate">
                  {selectedEventId === 'all' ? "Select Event" : allEvents.find(e => e.id === selectedEventId)?.title}
                </span>
              </div>
              <ChevronDown size={16} className={`text-blue-400 transition-transform duration-300 shrink-0 ${isEventDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isEventDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  
                  <button
                    onClick={() => { setSelectedEventId('all'); setIsEventDropdownOpen(false); }}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors border-b border-white/5 bg-slate-900 sticky top-0 z-20 ${
                      selectedEventId === 'all' ? 'text-blue-400 font-black' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Layers size={14} className={selectedEventId === 'all' ? 'text-blue-500' : 'text-slate-500'}/>
                    <span className="text-[11px] font-black uppercase tracking-widest truncate">View All Events</span>
                  </button>

                  {liveEvents.length > 0 && (
                    <div className="px-4 py-2 bg-emerald-500/10 border-y border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div> Upcoming Events
                    </div>
                  )}
                  {liveEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => { setSelectedEventId(ev.id); setIsEventDropdownOpen(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors border-b border-white/5 last:border-0 ${
                        selectedEventId === ev.id ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${selectedEventId === ev.id ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-transparent'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{ev.title}</span>
                    </button>
                  ))}

                  {pastEvents.length > 0 && (
                    <div className="px-4 py-2 bg-slate-800 border-y border-white/5 text-slate-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div> Past Events
                    </div>
                  )}
                  {pastEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => { setSelectedEventId(ev.id); setIsEventDropdownOpen(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors border-b border-white/5 last:border-0 ${
                        selectedEventId === ev.id ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${selectedEventId === ev.id ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-transparent'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{ev.title}</span>
                    </button>
                  ))}

                  {allEvents.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      No events found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full z-10">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" placeholder="Search by Name, URN, Email, Event Title, or Transaction ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-[#111827] border border-white/5 rounded-4xl outline-none text-xs sm:text-sm font-bold focus:border-blue-500/50 transition-colors shadow-inner"
          />
        </div>

        <div className="bg-[#111827] rounded-3xl sm:rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative z-10">
          {loading ? (
            <div className="py-32 flex justify-center"><Zap className="animate-pulse text-blue-500" size={48} /></div>
          ) : filteredList.length === 0 ? (
            <div className="py-32 flex flex-col items-center opacity-40">
              <UserX size={48} className="mb-4 text-slate-500" />
              <p className="font-black uppercase text-xs tracking-widest italic">No registrations found.</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#1f2937]/50 border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendee</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Info</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredList.map((item) => {
                      const txn = getTxnId(item);
                      const fees = getFeeBreakdown(item);
                      return (
                      <tr key={item.id} className="hover:bg-blue-600/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-500 border border-slate-700 uppercase shadow-lg group-hover:border-blue-500/50 transition-all">
                              {item.students?.name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex flex-col">
                              <p className="font-black text-sm text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                                {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Unknown Attendee"}
                              </p>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                <span>{item.student_email}</span> • <Fingerprint size={10} className="text-blue-500"/> <span>{item.students?.urn || 'NO URN'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-48 block">
                             {item.events?.title || 'Unknown Event'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            item.status === 'checked_in' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                            item.status === 'verified' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                            'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                          }`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {txn ? (
                            <div className="flex flex-col">
                              <p className="font-mono text-xs font-bold text-yellow-500 tracking-[0.2em]">{txn}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">₹{fees.total} Total Paid</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Free Ticket</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedAttendee(item)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                              <Eye size={14} /> View Details
                            </button>
                            {item.status === 'pending' && txn && (
                              <button onClick={() => handleVerifyUTR(item.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                                <CheckCircle size={14} /> Verify
                              </button>
                            )}
                            <button onClick={() => handleTerminateClick(item.id, item.status === 'pending')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                              {item.status === 'pending' ? <XCircle size={14} /> : <Trash2 size={14} />} 
                              {item.status === 'pending' ? 'Reject' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col lg:hidden divide-y divide-white/5">
                {filteredList.map((item) => {
                  const txn = getTxnId(item);
                  const fees = getFeeBreakdown(item);
                  return (
                  <div key={item.id} className="p-5 sm:p-6 flex flex-col gap-4 hover:bg-white/2 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <p className="font-black text-base text-white uppercase italic tracking-tighter">
                          {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Unknown"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 truncate max-w-50">{item.student_email}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Fingerprint size={12} className="text-blue-500"/> 
                          <span className="text-xs font-black text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">{item.students?.urn || 'NO URN'}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                        item.status === 'checked_in' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                        item.status === 'verified' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                        'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">
                       {item.events?.title || 'Unknown Event'}
                    </div>

                    {txn && (
                      <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                        <div className="flex flex-col">
                           <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Transaction ID</span>
                           <span className="font-mono text-yellow-500 text-xs font-bold tracking-widest truncate max-w-35">{txn}</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Total Paid</span>
                           <span className="text-white text-sm font-bold">₹{fees.total}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={() => setSelectedAttendee(item)} className="flex-1 flex justify-center items-center gap-2 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl border border-white/5 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md">
                        <Eye size={16} /> Details
                      </button>
                      <button onClick={() => handleTerminateClick(item.id, item.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md">
                        {item.status === 'pending' ? <XCircle size={16} /> : <Trash2 size={16} />} 
                        {item.status === 'pending' ? 'Reject' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- ATTENDEE DETAILS MODAL --- */}
      {selectedAttendee && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#111827] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-500/20 uppercase">
                  {selectedAttendee.students?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                    {selectedAttendee.students?.name ? `${selectedAttendee.students.name} ${selectedAttendee.students.surname || ''}` : "Unknown Attendee"}
                  </h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                    selectedAttendee.status === 'checked_in' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                    selectedAttendee.status === 'verified' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                    'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                  }`}>
                    {selectedAttendee.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedAttendee(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 space-y-4 shadow-inner">
                <div className="grid grid-cols-1 gap-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Email Address</span>
                      <span className="text-sm font-bold text-white truncate">{selectedAttendee.student_email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Phone Number</span>
                      <span className="text-sm font-bold text-white">{selectedAttendee.students?.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Layers size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Registered Event</span>
                      <span className="text-sm font-bold text-white truncate">{selectedAttendee.events?.title || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Gate Status</span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit">
                      {selectedAttendee.status === 'checked_in' ? '🟢 Scanned Entry' : '🔴 Not Scanned'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">URN / Roll No</span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit truncate max-w-full">
                      {selectedAttendee.students?.urn || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/5 rounded-3xl p-5 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={16} className="text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">Payment Details</span>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-yellow-500 tracking-widest bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 truncate max-w-35">
                    {getTxnId(selectedAttendee) || 'FREE ENTRY'}
                  </span>
                </div>

                {parseFloat(getFeeBreakdown(selectedAttendee).base) > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Base Ticket Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedAttendee).base}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Platform Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedAttendee).platform}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Gateway Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedAttendee).transaction}</span>
                    </div>
                    <div className="border-t border-dashed border-white/20 my-3"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-black text-xs uppercase tracking-widest">Total Amount Paid</span>
                      <span className="text-emerald-400 font-black text-xl italic tracking-tight">₹{getFeeBreakdown(selectedAttendee).total}</span>
                    </div>
                  </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-2 opacity-70">
                      <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Total Amount</span>
                      <span className="text-white font-black text-2xl italic">₹0.00</span>
                    </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-[#111827] border-t border-white/5 flex gap-3 shrink-0">
              {selectedAttendee.status === 'pending' && getTxnId(selectedAttendee) && (
                <button onClick={() => handleVerifyUTR(selectedAttendee.id)} className="flex-1 flex justify-center items-center gap-2 py-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl border border-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
                  <CheckCircle size={16} /> Verify Ticket
                </button>
              )}
              <button onClick={() => handleTerminateClick(selectedAttendee.id, selectedAttendee.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
                {selectedAttendee.status === 'pending' ? <XCircle size={16} /> : <Trash2 size={16} />} 
                {selectedAttendee.status === 'pending' ? 'Reject Payment' : 'Cancel Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default MasterManagement;