import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { 
  Search, Zap, Filter, ShieldAlert, Fingerprint, Download, 
  ArrowLeft, CheckCircle, XCircle, Trash2, UserX, ChevronDown, 
  Eye, X, Phone, Mail, IndianRupee, Lock, Layers, 
  AlertTriangle, Users, Gamepad2, BarChart3, Database, TrendingUp, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROWS_PER_PAGE = 20;
const PLATFORM_FEE = 25;

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const getTxnId = (item) => item.utr_number || item.transaction_id || item.payment_id || item.razorpay_payment_id;

const getBaseAmount = (item) => {
  if (item.events?.category === 'E-Sports' && item.selected_game && item.events?.games_list) {
    const gameObj = item.events.games_list.find(g => g.gameName === item.selected_game);
    if (gameObj && gameObj.ticket_price) return Number(gameObj.ticket_price);
    return 0;
  }
  return item.events?.event_type === 'paid' ? Number(item.events?.price || 0) : 0;
};

const getFeeBreakdown = (item) => {
  let base = getBaseAmount(item);
  let platform = 0;
  let total = 0;

  if (base > 0) {
     platform = PLATFORM_FEE;
     total = base + platform;
  } else if (getTxnId(item)) {
     // Fallback for older transactions without exact base details
     total = Number(item.amount) || Number(item.total_amount) || 0; 
     if (total > 0) {
         platform = total >= PLATFORM_FEE ? PLATFORM_FEE : 0;
         base = total - platform;
     }
  }

  return {
    base: base.toFixed(2),
    platform: platform.toFixed(2),
    total: total.toFixed(2)
  };
};
// ==========================================

const MasterManagement = () => {
  const navigate = useNavigate(); 
  
  const [userRole, setUserRole] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userClubIds, setUserClubIds] = useState([]);
  
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState('all'); 
  const [typeFilter, setTypeFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  
  const [activeTab, setActiveTab] = useState('database');

  const [allEvents, setAllEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null, isReject: false });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setIsFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initializeRegistry = async () => {
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

        setUserRole(highestRole);
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    initializeRegistry();
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
    const fetchEvents = async () => {
      if (!userRole) return; 

      let q = supabase.from('events').select('id, title, date, org_id, club_id').order('date', { ascending: false });

      if (userRole === 'super_admin') {
        if (selectedOrgId !== 'all') q = q.eq('org_id', selectedOrgId);
        if (selectedClubId !== 'all') q = q.eq('club_id', selectedClubId);
      } else if (userRole === 'org_head') {
        if (selectedOrgId === 'all') return; 
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
      setCurrentPage(1);
    };

    if (userRole) fetchEvents();
  }, [selectedOrgId, selectedClubId, userRole, clubs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, gameFilter, searchQuery]);

  const fetchAttendees = useCallback(async () => {
    if (!userRole) return;

    setLoading(true);
    try {
      let countReq = supabase
        .from('bookings')
        .select('id, events!inner(org_id, club_id)', { count: 'exact', head: true });

      const from = (currentPage - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      let dataReq = supabase
        .from('bookings')
        .select(`
          *,
          students ( name, surname, email, phone, urn ),
          events!inner ( title, price, org_id, club_id, category, event_type, games_list )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (selectedEventId !== 'all') {
        countReq = countReq.eq('event_id', selectedEventId);
        dataReq = dataReq.eq('event_id', selectedEventId);
      } else {
        if (selectedOrgId !== 'all') {
          countReq = countReq.eq('events.org_id', selectedOrgId);
          dataReq = dataReq.eq('events.org_id', selectedOrgId);
        } else if (userRole !== 'super_admin') {
          setLoading(false);
          return;
        }

        if (selectedClubId !== 'all') {
          countReq = countReq.eq('events.club_id', selectedClubId);
          dataReq = dataReq.eq('events.club_id', selectedClubId);
        } else if (userRole === 'club_head') {
          if (userClubIds.length > 0) {
            countReq = countReq.in('events.club_id', userClubIds);
            dataReq = dataReq.in('events.club_id', userClubIds);
          } else {
            countReq = countReq.eq('events.club_id', '00000000-0000-0000-0000-000000000000');
            dataReq = dataReq.eq('events.club_id', '00000000-0000-0000-0000-000000000000');
          }
        }
      }

      if (typeFilter === 'Team') {
        countReq = countReq.not('team_name', 'is', null);
        dataReq = dataReq.not('team_name', 'is', null);
      } else if (typeFilter === 'Individual') {
        countReq = countReq.is('team_name', null);
        dataReq = dataReq.is('team_name', null);
      }

      if (gameFilter !== 'all') {
        countReq = countReq.eq('selected_game', gameFilter);
        dataReq = dataReq.eq('selected_game', gameFilter);
      }

      if (searchQuery.trim() !== '') {
        const searchStr = `or(student_email.ilike.%${searchQuery}%,team_name.ilike.%${searchQuery}%,transaction_id.ilike.%${searchQuery}%,razorpay_payment_id.ilike.%${searchQuery}%)`;
        countReq = countReq.or(searchStr);
        dataReq = dataReq.or(searchStr);
      }

      const [countRes, dataRes] = await Promise.all([countReq, dataReq]);

      if (countRes.error) throw countRes.error;
      if (dataRes.error) throw dataRes.error;

      setTotalRecords(countRes.count || 0);

      let enrichedData = dataRes.data || [];

      // ==========================================
      // BULLETPROOF ROSTER FETCH LOGIC
      // ==========================================
      if (enrichedData.length > 0) {
        const bookingIds = enrichedData.map(b => b.id);
        const { data: membersData, error: memErr } = await supabase
          .from('booking_members')
          .select('booking_id, student_email')
          .in('booking_id', bookingIds);
          
        if (memErr) console.error("Database blocked member read:", memErr);
        
        let studentProfiles = [];
        if (membersData && membersData.length > 0) {
           const uniqueEmails = [...new Set(membersData.map(m => m.student_email?.trim().toLowerCase()).filter(Boolean))];
           const { data: profiles, error: profErr } = await supabase
            .from('students')
            .select('email, name, surname, urn, phone')
            .in('email', uniqueEmails);
            
           if (profErr) console.error("Database blocked profile read:", profErr);
           studentProfiles = profiles || [];
        }
        
        // SAFELY MAP TEAM MEMBERS
        enrichedData = enrichedData.map(booking => {
           let bMembers = membersData ? membersData.filter(m => m.booking_id === booking.id) : [];
           
           let fullMembers = bMembers.map(bm => {
              const cleanEmail = bm.student_email?.trim().toLowerCase();
              const prof = studentProfiles.find(p => p.email?.toLowerCase() === cleanEmail) || {};
              
              // Fallback if database blocks the profile read
              const finalName = prof.name || cleanEmail?.split('@')[0] || "Unknown";

              return { 
                  email: bm.student_email, 
                  name: finalName,
                  surname: prof.surname || '',
                  urn: prof.urn,
                  phone: prof.phone
              };
           });

           // FAILSAFE: Ensure the Team Lead is ALWAYS in the roster
           if (!fullMembers.some(m => m.email?.toLowerCase() === booking.student_email?.toLowerCase())) {
               fullMembers.unshift({
                   email: booking.student_email,
                   name: booking.students?.name || booking.student_email?.split('@')[0] || "Unknown",
                   surname: booking.students?.surname || '',
                   phone: booking.students?.phone,
                   urn: booking.students?.urn
               });
           }

           return { ...booking, fullMembers };
        });
      }

      setAttendees(enrichedData);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to retrieve database records.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, selectedOrgId, selectedClubId, userRole, userClubIds, currentPage, typeFilter, gameFilter, searchQuery]);

  useEffect(() => {
    fetchAttendees();
    
    const config = { event: '*', schema: 'public', table: 'bookings' };
    if (selectedEventId !== 'all') config.filter = `event_id=eq.${selectedEventId}`;
    
    const channel = supabase.channel(`registry_sync`)
      .on('postgres_changes', config, fetchAttendees)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [selectedEventId, currentPage, fetchAttendees]);

  const toggleRow = (id) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const handleVerifyPayment = async (bookingId) => {
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

  const handleRemoveClick = (bookingId, isReject = false) => {
    setConfirmModal({ isOpen: true, bookingId, isReject });
  };

  const confirmRemove = async () => {
    const { bookingId, isReject } = confirmModal;
    const loadToast = toast.loading(isReject ? "Rejecting payment..." : "Canceling ticket...");
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      toast.success(isReject ? "Payment rejected." : "Ticket cancelled successfully.", { id: loadToast });
      setAttendees(prev => prev.filter(a => a.id !== bookingId));
      setTotalRecords(prev => prev - 1);
      if (selectedAttendee?.id === bookingId) setSelectedAttendee(null); 
    } catch (error) {
      toast.error("Action failed.", { id: loadToast });
    } finally {
      setConfirmModal({ isOpen: false, bookingId: null, isReject: false });
    }
  };

  const downloadCSV = async () => {
    const toastId = toast.loading("Preparing Download...");
    try {
      let exportReq = supabase
        .from('bookings')
        .select(`
          *,
          students ( name, surname, email, phone, urn ),
          events!inner ( title, price, org_id, club_id, category, event_type, games_list )
        `)
        .order('created_at', { ascending: false });

      if (selectedEventId !== 'all') exportReq = exportReq.eq('event_id', selectedEventId);
      else {
        if (selectedOrgId !== 'all') exportReq = exportReq.eq('events.org_id', selectedOrgId);
        if (selectedClubId !== 'all') exportReq = exportReq.eq('events.club_id', selectedClubId);
        else if (userRole === 'club_head' && userClubIds.length > 0) exportReq = exportReq.in('events.club_id', userClubIds);
      }

      if (typeFilter === 'Team') exportReq = exportReq.not('team_name', 'is', null);
      if (typeFilter === 'Individual') exportReq = exportReq.is('team_name', null);
      if (gameFilter !== 'all') exportReq = exportReq.eq('selected_game', gameFilter);

      const { data: fullData, error } = await exportReq;
      if (error) throw error;

      if (!fullData || fullData.length === 0) {
        toast.error("No data found for current filters.", { id: toastId });
        return;
      }

      const bookingIds = fullData.map(b => b.id);
      const { data: membersData } = await supabase.from('booking_members').select('booking_id, student_email').in('booking_id', bookingIds);
      let enrichedExportData = fullData;

      if (membersData && membersData.length > 0) {
          const uniqueEmails = [...new Set(membersData.map(m => m.student_email?.trim().toLowerCase()).filter(Boolean))];
          const { data: studentProfiles } = await supabase.from('students').select('email, name, surname, urn, phone').in('email', uniqueEmails);
          
          enrichedExportData = fullData.map(booking => {
            const bMembers = membersData.filter(m => m.booking_id === booking.id);
            const fullMembers = bMembers.map(bm => {
                const cleanEmail = bm.student_email?.trim().toLowerCase();
                const prof = studentProfiles?.find(p => p.email?.toLowerCase() === cleanEmail) || {};
                const finalName = prof.name || cleanEmail?.split('@')[0] || "Unknown";
                return { email: bm.student_email, name: finalName, surname: prof.surname || '' };
            });

            if (!fullMembers.some(m => m.email?.toLowerCase() === booking.student_email?.toLowerCase())) {
                fullMembers.unshift({
                    email: booking.student_email,
                    name: booking.students?.name || booking.student_email?.split('@')[0] || "Unknown",
                    surname: booking.students?.surname || ''
                });
            }

            return { ...booking, fullMembers };
          });
      }

      let exportName = "Registrations";
      if (selectedEventId !== 'all') {
        exportName = allEvents.find(e => e.id === selectedEventId)?.title.replace(/\s+/g, '_') || "Event";
      } else if (selectedClubId !== 'all') {
        exportName = "Club_Wide";
      } else {
        exportName = "University_Wide";
      }

      const headers = "Event,Game,Entry Type,Team Name,Lead Name,Lead Surname,Email,Phone,URN,Team Members,Status,Transaction ID,Ticket Fee,Platform Fee,Total Paid\n";
      const rows = enrichedExportData.map(item => {
        const txn = getTxnId(item) || 'N/A';
        const fees = getFeeBreakdown(item);
        const eventName = item.events?.title?.replace(/,/g, '') || 'Unknown Event';
        const gameName = item.selected_game || 'N/A';
        const entryType = item.team_name ? 'Team' : 'Individual';
        const teamName = item.team_name ? item.team_name.replace(/,/g, '') : 'N/A';
        
        const membersStr = item.fullMembers && item.fullMembers.length > 0 
          ? `"${item.fullMembers.map(m => `${m.name} ${m.surname || ''} (${m.email})`).join(', ')}"` 
          : 'N/A';
        
        return `${eventName},${gameName},${entryType},${teamName},${item.students?.name || 'Unknown'},${item.students?.surname || ''},${item.student_email},${item.students?.phone || 'N/A'},${item.students?.urn || 'N/A'},${membersStr},${item.status},${txn},₹${fees.base},₹${fees.platform},₹${fees.total}`;
      }).join("\n");

      const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportName}_Registry.csv`;
      a.click();
      toast.success("Download Complete!", { id: toastId });
    } catch (err) {
      toast.error("Download Failed.", { id: toastId });
    }
  };

  const availableGames = [...new Set(attendees.map(a => a.selected_game).filter(Boolean))].sort();

  const filteredList = attendees.filter(item => {
    const matchSearch = 
      searchQuery.trim() === '' ||
      item.students?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.students?.urn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.events?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (getTxnId(item) && getTxnId(item).toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.selected_game?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  const [analyticsStats, setAnalyticsStats] = useState({
    totalRegistrations: 0, totalRevenue: 0, platformFees: 0, checkedInCount: 0, teamCount: 0, individualCount: 0, gameBreakdown: {}, checkInRate: 0
  });

  useEffect(() => {
    if (activeTab !== 'analytics' || !userRole) return;

    const fetchAnalytics = async () => {
      let q = supabase.from('bookings').select('status, team_name, selected_game, events!inner(price, event_type, org_id, club_id, category, games_list), amount_expected');
      
      if (selectedEventId !== 'all') q = q.eq('event_id', selectedEventId);
      else {
        if (selectedOrgId !== 'all') q = q.eq('events.org_id', selectedOrgId);
        if (selectedClubId !== 'all') q = q.eq('events.club_id', selectedClubId);
        else if (userRole === 'club_head' && userClubIds.length > 0) q = q.in('events.club_id', userClubIds);
      }

      if (typeFilter === 'Team') q = q.not('team_name', 'is', null);
      if (typeFilter === 'Individual') q = q.is('team_name', null);
      if (gameFilter !== 'all') q = q.eq('selected_game', gameFilter);

      const { data, error } = await q;
      if (!error && data) {
        let revenue = 0, pFees = 0, checkedIn = 0, teams = 0, individuals = 0, games = {};
        data.forEach(b => {
          if (b.status === 'verified' || b.status === 'checked_in') {
             const base = getBaseAmount(b);
             if (base > 0) {
               revenue += base;
               pFees += PLATFORM_FEE;
             }
          }
          if (b.status === 'checked_in') checkedIn++;
          if (b.team_name) teams++; else individuals++;
          if (b.selected_game) games[b.selected_game] = (games[b.selected_game] || 0) + 1;
        });

        setAnalyticsStats({
          totalRegistrations: data.length, totalRevenue: revenue, platformFees: pFees, checkedInCount: checkedIn,
          teamCount: teams, individualCount: individuals, gameBreakdown: games,
          checkInRate: data.length > 0 ? ((checkedIn / data.length) * 100).toFixed(1) : 0
        });
      }
    };
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEventId, selectedOrgId, selectedClubId, userRole, userClubIds, typeFilter, gameFilter]);

  const showOrgSelect = userRole === 'super_admin';
  const showClubSelect = userRole === 'super_admin' || userRole === 'org_head' || (userRole === 'club_head' && clubs.length > 1);
  const isFilterActive = selectedOrgId !== 'all' || selectedClubId !== 'all' || selectedEventId !== 'all' || typeFilter !== 'all' || gameFilter !== 'all';

  const totalPages = Math.ceil(totalRecords / ROWS_PER_PAGE);

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
                <button onClick={confirmRemove} className="flex-1 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg">
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
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Admin Panel</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">Registrations</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold flex items-center gap-2">
              <Lock size={14} className="text-blue-500"/> Your Role: {userRole?.replace('_', ' ').toUpperCase() || 'Verifying...'}
            </p>
          </div>

          <button onClick={downloadCSV} className="w-full lg:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0">
            <Download size={16} /> Download Data (CSV)
          </button>
        </header>

        {/* --- CONDENSED FILTER BAR --- */}
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-3xl border border-white/5 shadow-xl relative z-40">
          <div className="flex items-center gap-3 relative w-full z-40" ref={filterMenuRef}>
            
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" placeholder="Search by Name, Email, Event, Team..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#0a0f1d] border border-white/5 hover:border-blue-500/50 rounded-2xl outline-none text-xs font-bold tracking-wider text-white transition-colors shadow-inner focus:border-blue-500"
              />
            </div>

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

            {isFilterMenuOpen && (
              <div className="absolute top-full right-0 mt-3 w-full sm:w-85 bg-[#111827] border border-white/10 rounded-3xl shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95">
                 <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                       <Filter size={14} className="text-blue-500"/> Search Filters
                    </h3>
                    <button 
                       onClick={() => { setSelectedOrgId('all'); setSelectedClubId('all'); setSelectedEventId('all'); setTypeFilter('all'); setGameFilter('all'); }} 
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
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Club</span>
                       <div className="relative">
                          <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} disabled={selectedOrgId === 'all' && userRole === 'super_admin'} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer disabled:opacity-50">
                             <option value="all">All Clubs</option>
                             {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                       </div>
                     </div>
                   )}

                   <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Event</span>
                     <div className="relative">
                        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer">
                           <option value="all">All Events</option>
                           {allEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                     </div>
                   </div>

                   <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Entry Types</span>
                     <div className="flex flex-wrap gap-2">
                       {['all', 'Individual', 'Team'].map(t => (
                         <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${typeFilter === t ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800'}`}>{t === 'all' ? 'All Types' : t}</button>
                       ))}
                     </div>
                   </div>

                   {availableGames.length > 0 && (
                     <div>
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block text-left">Game</span>
                       <div className="relative">
                          <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-cyan-500 appearance-none cursor-pointer">
                             <option value="all">All Games</option>
                             {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
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

        {/* --- VIEW TOGGLE TABS --- */}
        <div className="flex bg-[#111827] p-1 rounded-2xl border border-white/5 w-fit shadow-lg relative z-10">
          <button 
            onClick={() => setActiveTab('database')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'database' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
          >
            <Database size={14}/> Database
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
          >
            <BarChart3 size={14}/> Analytics
          </button>
        </div>

        {/* --- DYNAMIC RENDER BASED ON TAB --- */}
        {activeTab === 'analytics' ? (
          
          /* ================================== */
          /* ANALYTICS VIEW             */
          /* ================================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI CARDS */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><IndianRupee size={80} /></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ticket Revenue</p>
                <h3 className="text-5xl font-black text-white italic tracking-tighter">₹{analyticsStats.totalRevenue.toLocaleString()}</h3>
                <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase">
                  <TrendingUp size={14}/> Verified Settlements
                </div>
              </div>

              <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Users size={80} /></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Bookings</p>
                <h3 className="text-5xl font-black text-blue-500 italic tracking-tighter">{analyticsStats.totalRegistrations}</h3>
                <p className="mt-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Based on active filters</p>
              </div>

              <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Attendance Rate</p>
                    <h3 className="text-4xl font-black text-white italic tracking-tighter">{analyticsStats.checkInRate}%</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${analyticsStats.checkInRate}%` }} />
                </div>
                <p className="mt-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">{analyticsStats.checkedInCount} / {analyticsStats.totalRegistrations} Passes Scanned</p>
              </div>

              {/* ONLY SHOW PLATFORM REVENUE TO SUPER ADMIN */}
              {userRole === 'super_admin' && (
                <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Platform Revenue</p>
                      <h3 className="text-4xl font-black text-white italic tracking-tighter">₹{analyticsStats.platformFees}</h3>
                    </div>
                    <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-400">
                      <Zap size={20} />
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">Generated from the fixed ₹25 platform allocation fee per paid registration.</p>
                </div>
              )}
            </div>

            {/* SIDEBAR: TOURNAMENT & CATEGORY DATA */}
            <div className="space-y-8">
              {/* GAME POPULARITY */}
              <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Gamepad2 className="text-cyan-400" size={20} />
                  <h4 className="text-xs font-black uppercase tracking-widest">Game Popularity</h4>
                </div>
                <div className="space-y-5 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {Object.keys(analyticsStats.gameBreakdown).length > 0 ? (
                    Object.entries(analyticsStats.gameBreakdown).sort((a,b) => b[1] - a[1]).map(([game, count]) => (
                      <div key={game} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-white truncate pr-2">{game}</span>
                          <span className="text-cyan-400">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-cyan-500 h-full transition-all duration-1000" 
                            style={{ width: `${(count / analyticsStats.totalRegistrations) * 100}%` }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-600 uppercase font-black italic">No tournament data available.</p>
                  )}
                </div>
              </div>

              {/* PARTICIPATION MIX */}
              <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="text-indigo-400" size={20} />
                  <h4 className="text-xs font-black uppercase tracking-widest">Entry Types</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Teams</p>
                    <p className="text-xl font-black text-white italic">{analyticsStats.teamCount}</p>
                  </div>
                  <div className="w-px h-10 bg-white/5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Solo</p>
                    <p className="text-xl font-black text-white italic">{analyticsStats.individualCount}</p>
                  </div>
                </div>
                {analyticsStats.totalRegistrations > 0 && (
                  <>
                    <div className="mt-6 flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
                      <div className="bg-indigo-500 transition-all duration-1000" style={{ width: `${(analyticsStats.teamCount / analyticsStats.totalRegistrations) * 100}%` }} />
                      <div className="bg-blue-400 transition-all duration-1000" style={{ width: `${(analyticsStats.individualCount / analyticsStats.totalRegistrations) * 100}%` }} />
                    </div>
                    <div className="mt-4 flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
                      <span className="text-indigo-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Teams</span>
                      <span className="text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Individuals</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          /* ================================== */
          
        ) : (

          /* ================================== */
          /* DATABASE VIEW             */
          /* ================================== */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* MAIN DATA TABLE */}
            <div className="bg-[#111827] rounded-3xl sm:rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative z-10 flex flex-col">
              {loading ? (
                <div className="py-32 flex justify-center"><Zap className="animate-pulse text-blue-500" size={48} /></div>
              ) : filteredList.length === 0 ? (
                <div className="py-32 flex flex-col items-center opacity-40">
                  <UserX size={48} className="mb-4 text-slate-500" />
                  <p className="font-black uppercase text-xs tracking-widest italic">No registrations found.</p>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto grow">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-[#1f2937]/50 border-b border-white/5">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendee / Team</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event / Game</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Details</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredList.map((item) => {
                          const txn = getTxnId(item);
                          const fees = getFeeBreakdown(item);
                          return (
                          <React.Fragment key={item.id}>
                            <tr className="hover:bg-blue-600/5 transition-colors group">
                              
                              <td className="px-8 py-5">
                                {item.team_name ? (
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 shrink-0 bg-indigo-500/10 rounded-2xl flex items-center justify-center font-black text-indigo-500 border border-indigo-500/20 uppercase shadow-lg group-hover:border-indigo-500/50 transition-all">
                                      <Users size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <p className="font-black text-sm text-white uppercase italic tracking-tighter group-hover:text-indigo-400 transition-colors">{item.team_name}</p>
                                        <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">Team</span>
                                      </div>
                                      <button onClick={() => toggleRow(item.id)} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest mt-1 text-left w-fit">
                                        {expandedRows.has(item.id) ? `Hide Team ▲` : `View Team (${item.fullMembers?.length || 0}) ▼`}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
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
                                )}
                              </td>
                              
                              <td className="px-8 py-5">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-48 block">
                                    {item.events?.title || 'Unknown Event'}
                                  </span>
                                  {item.selected_game && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                                      <Gamepad2 size={10}/> {item.selected_game}
                                    </span>
                                  )}
                                </div>
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
                                {parseFloat(fees.total) > 0 ? (
                                  <div className="flex flex-col">
                                    {txn && <p className="font-mono text-xs font-bold text-yellow-500 tracking-[0.2em]">{txn}</p>}
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">₹{fees.total} Total Paid</p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Free Entry</span>
                                )}
                              </td>
                              
                              <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setSelectedAttendee(item)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                                    <Eye size={14} /> View Details
                                  </button>
                                  {item.status === 'pending' && txn && parseFloat(fees.total) > 0 && (
                                    <button onClick={() => handleVerifyPayment(item.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                                      <CheckCircle size={14} /> Verify
                                    </button>
                                  )}
                                  <button onClick={() => handleRemoveClick(item.id, item.status === 'pending')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                                    {item.status === 'pending' ? <XCircle size={14} /> : <Trash2 size={14} />} 
                                    {item.status === 'pending' ? 'Reject' : 'Remove'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* --- EXPANDABLE ROSTER ROW --- */}
                            {item.team_name && expandedRows.has(item.id) && (
                              <tr className="bg-black/40 border-b border-white/5 shadow-inner">
                                <td colSpan="5" className="p-0">
                                  <div className="px-8 py-5 bg-indigo-900/5">
                                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14}/> Team Members ({item.fullMembers?.length || 0})</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {item.fullMembers?.map((m, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-[#111827] p-3 rounded-xl border border-white/5 shadow-md">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase shrink-0">{m.name?.charAt(0) || 'U'}</div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <p className="text-xs font-bold text-white flex items-center gap-2 truncate">
                                                        {m.name} {m.surname} 
                                                        {m.email === item.student_email && <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest shrink-0">Leader</span>}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 truncate">{m.email} {m.urn ? `• ${m.urn}` : ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                      </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )})}
                      </tbody>
                    </table>
                  </div>

                  {/* --- MOBILE VIEW LIST --- */}
                  <div className="flex flex-col lg:hidden divide-y divide-white/5 grow">
                    {filteredList.map((item) => {
                      const txn = getTxnId(item);
                      const fees = getFeeBreakdown(item);
                      return (
                      <div key={item.id} className="p-5 sm:p-6 flex flex-col gap-4 hover:bg-white/2 transition-colors">
                        
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            {item.team_name ? (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">Team</span>
                                </div>
                                <p className="font-black text-base text-white uppercase italic tracking-tighter">{item.team_name}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase mt-0.5 truncate">
                                  Lead: {item.students?.name} {item.students?.surname || ''}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-black text-base text-white uppercase italic tracking-tighter">
                                  {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Unknown"}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 truncate max-w-50">{item.student_email}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Fingerprint size={12} className="text-blue-500"/> 
                                  <span className="text-xs font-black text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">{item.students?.urn || 'NO URN'}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                            item.status === 'checked_in' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                            item.status === 'verified' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                            'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                          }`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">
                            {item.events?.title || 'Unknown Event'}
                          </div>
                          {item.selected_game && (
                            <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded-lg text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                              <Gamepad2 size={12} /> {item.selected_game}
                            </div>
                          )}
                        </div>

                        {parseFloat(fees.total) > 0 && (
                          <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Transaction ID</span>
                              {txn ? (
                                 <span className="font-mono text-yellow-500 text-xs font-bold tracking-widest truncate max-w-35">{txn}</span>
                              ) : (
                                 <span className="font-mono text-slate-500 text-xs italic tracking-widest">Pending</span>
                              )}
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
                          <button onClick={() => handleRemoveClick(item.id, item.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md">
                            {item.status === 'pending' ? <XCircle size={16} /> : <Trash2 size={16} />} 
                            {item.status === 'pending' ? 'Reject' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>

                  {/* --- PAGINATION CONTROLS --- */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 bg-[#1f2937]/30 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Showing <span className="text-white">{(currentPage - 1) * ROWS_PER_PAGE + 1}</span> to <span className="text-white">{Math.min(currentPage * ROWS_PER_PAGE, totalRecords)}</span> of <span className="text-white">{totalRecords}</span> Entries
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-white/5"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-white bg-slate-800 px-4 py-2 rounded-lg border border-white/5">
                          {currentPage} / {totalPages}
                        </span>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-white/5"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          /* ================================== */
        )}

      </div>

      {/* --- ATTENDEE DETAILS MODAL --- */}
      {selectedAttendee && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#111827] shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl border uppercase ${selectedAttendee.team_name ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                  {selectedAttendee.team_name ? <Users size={20}/> : (selectedAttendee.students?.name?.charAt(0) || 'S')}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                    {selectedAttendee.team_name || (selectedAttendee.students?.name ? `${selectedAttendee.students.name} ${selectedAttendee.students.surname || ''}` : "Unknown Attendee")}
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
                    <Layers size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Registered Event</span>
                      <span className="text-sm font-bold text-white truncate">{selectedAttendee.events?.title || 'Unknown'}</span>
                    </div>
                  </div>
                  {selectedAttendee.selected_game && (
                    <div className="flex items-center gap-3">
                      <Gamepad2 size={16} className="text-cyan-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Tournament Game</span>
                        <span className="text-sm font-bold text-white truncate">{selectedAttendee.selected_game}</span>
                      </div>
                    </div>
                  )}
                  {!selectedAttendee.team_name && (
                    <>
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
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Entry Status</span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit">
                      {selectedAttendee.status === 'checked_in' ? '🟢 Scanned Entry' : '🔴 Not Scanned'}
                    </span>
                  </div>
                  {!selectedAttendee.team_name && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">URN / Roll No</span>
                      <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit truncate max-w-full">
                        {selectedAttendee.students?.urn || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedAttendee.team_name && selectedAttendee.fullMembers && selectedAttendee.fullMembers.length > 0 && (
                <div className="bg-indigo-900/10 rounded-3xl p-4 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14}/> Team Members ({selectedAttendee.fullMembers.length})</p>
                  <div className="space-y-2">
                    {selectedAttendee.fullMembers.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase shrink-0">{m.name?.charAt(0) || 'U'}</div>
                          <div className="flex flex-col overflow-hidden">
                            <p className="text-xs font-bold text-white flex items-center gap-2 truncate">
                              {m.name} {m.surname} 
                              {m.email === selectedAttendee.student_email && <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest shrink-0">Leader</span>}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate">{m.email} {m.urn ? `• ${m.urn}` : ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                {parseFloat(getFeeBreakdown(selectedAttendee).total) > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Base Ticket Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedAttendee).base}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Platform Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedAttendee).platform}</span>
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
              {selectedAttendee.status === 'pending' && getTxnId(selectedAttendee) && parseFloat(getFeeBreakdown(selectedAttendee).total) > 0 && (
                <button onClick={() => handleVerifyPayment(selectedAttendee.id)} className="flex-1 flex justify-center items-center gap-2 py-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl border border-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
                  <CheckCircle size={16} /> Verify Payment
                </button>
              )}
              <button onClick={() => handleRemoveClick(selectedAttendee.id, selectedAttendee.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
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