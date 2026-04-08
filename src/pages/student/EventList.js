import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Calendar, Clock, Search, Zap, 
  CheckCircle, MapPin, X, Loader2, ShieldCheck,
  Fingerprint, Download, ChevronDown, Layers, Share2, 
  Users, Gamepad2, ArrowRight, UserPlus, UserMinus, Ticket, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CATEGORIES = [
  "Technical", "Cultural", "Sports", "E-Sports", 
  "Social & Welfare", "Entrepreneurship", "Literature", "Arts & Media", "Other"
];

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [selectedClubId, setSelectedClubId] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [studentName, setStudentName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [userOrgId, setUserOrgId] = useState(null);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userDomain, setUserDomain] = useState("");
  
  const [poppedEvent, setPoppedEvent] = useState(null);
  const [zoomedClub, setZoomedClub] = useState(null);
  const [isClosing, setIsClosing] = useState(false); 
  const [now, setNow] = useState(new Date());

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const printRef = useRef(null);
  const clubDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // --- MULTI-STEP WIZARD STATE ---
  const [wizard, setWizard] = useState({
    open: false,
    step: 1,
    event: null,
    selectedGame: null,
    entryMode: 'Individual',
    teamName: '',
    teamNameError: '',
    isCheckingName: false,
    members: [],
    searchTerm: '',
    searchResults: [],
    isSearching: false,
    processing: false
  });

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) setIsClubDropdownOpen(false);
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) setIsCategoryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentIso = now.toISOString();

      const [eventsRes, orgsRes, bookingsRes, membershipsRes] = await Promise.all([
        supabase.from('events').select('*').gte('reg_end_timestamp', currentIso).order('date', { ascending: true }),
        supabase.from('organizations').select('id, name, domain'),
        supabase.from('bookings').select('id, event_id, student_email, status, team_name, selected_game'),
        user ? supabase.from('booking_members').select('*').eq('student_email', user.email) : { data: [] }
      ]);

      if (eventsRes.error) throw eventsRes.error;

      let domain = '';
      let isSuper = false;
      
      if (user) {
        const { data: profile } = await supabase.from('students').select('name, surname').eq('email', user.email).single();
        if (profile) setStudentName(`${profile.name || 'Student'} ${profile.surname || ''}`.trim());
        setCurrentUserEmail(user.email);
        domain = '@' + user.email.split('@')[1]; 
        setUserDomain(domain);
        const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
        isSuper = adminEmails.includes(user.email);
        setIsAdminUser(isSuper);
      }

      const orgMap = {};
      const orgNameMap = {};
      let myOrgId = null;
      if (orgsRes.data) {
        orgsRes.data.forEach(org => { 
          orgMap[org.id] = org.domain;
          orgNameMap[org.id] = org.name;
          if (org.domain === domain) myOrgId = org.id;
        });
      }
      setUserOrgId(myOrgId);

      let fetchedClubs = [];
      if (myOrgId || isSuper) {
         let q = supabase.from('clubs').select('id, name, org_id');
         if (!isSuper && myOrgId) q = q.eq('org_id', myOrgId);
         const { data: clubData } = await q;
         fetchedClubs = clubData || [];
      }
      setAvailableClubs(fetchedClubs);

      const visibleEvents = (eventsRes.data || []).filter(event => {
        if (isSuper || event.is_open_to_all) return true; 
        return orgMap[event.org_id] === domain;
      });

      const myBookingIds = membershipsRes.data ? membershipsRes.data.map(m => m.booking_id) : [];

      const eventsWithMeta = visibleEvents.map(event => {
        const eventBookings = bookingsRes.data?.filter(b => b.event_id === event.id) || [];
        const userBooking = eventBookings.find(b => myBookingIds.includes(b.id));
        
        return {
          ...event,
          orgName: orgNameMap[event.org_id] || 'Organization',
          bookingId: userBooking?.id,
          bookingStatus: userBooking?.status,
          teamName: userBooking?.team_name,
          selectedGame: userBooking?.selected_game,
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          isBooked: !!userBooking && ['confirmed', 'verified'].includes(userBooking.status),
          isPending: userBooking?.status === 'pending',
          isCheckedIn: userBooking?.status === 'checked_in',
          hasAnyBooking: !!userBooking,
          isOpen: now >= new Date(event.reg_start_timestamp)
        };
      });

      setEvents(eventsWithMeta);
    } catch (error) {
      console.error("Discovery Error:", error);
      toast.error("Failed to load events. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [now]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- WIZARD HANDLERS ---
  const startBookingWizard = (e, event) => {
    e.stopPropagation();
    if (!currentUserEmail) return toast.error("Login Required");
    if (!event.isOpen) return toast.error("Registration not yet open!");
    if (event.hasAnyBooking) return toast.error("Ticket already secured!");
    if (event.isSoldOut) return toast.error("Event is Sold Out!");

    let startStep = 1;
    let defaultGame = null;
    let defaultMode = 'Individual';
    
    if (event.category !== 'E-Sports') {
       defaultGame = { participation_type: event.participation_type, team_size: event.team_size };
       if (event.participation_type === 'Team') { startStep = 3; defaultMode = 'Team'; }
       else if (event.participation_type === 'Both') { startStep = 2; }
       else { startStep = 4; defaultMode = 'Individual'; }
    } else {
       startStep = 1;
    }

    setWizard({
      open: true, step: startStep, event, selectedGame: defaultGame, entryMode: defaultMode,
      teamName: '', teamNameError: '', members: [{ email: currentUserEmail, name: studentName, isLead: true }],
      searchTerm: '', searchResults: [], isSearching: false, processing: false, isCheckingName: false
    });
  };

  const handleGameSelect = (gameObj) => {
    let nextStep = 2;
    let defaultMode = 'Individual';
    if (gameObj.participation_type === 'Team') { nextStep = 3; defaultMode = 'Team'; }
    else if (gameObj.participation_type === 'Individual') { nextStep = 4; defaultMode = 'Individual'; }

    setWizard(p => ({ ...p, selectedGame: gameObj, entryMode: defaultMode, step: nextStep }));
  };

  const handleTeamNameCheck = async (name) => {
    setWizard(p => ({ ...p, teamName: name }));
    if (!name.trim()) return setWizard(p => ({ ...p, teamNameError: '' }));

    setWizard(p => ({ ...p, isCheckingName: true }));
    const { data } = await supabase.from('bookings').select('id').eq('event_id', wizard.event.id).ilike('team_name', name.trim());
    setWizard(p => ({
      ...p, isCheckingName: false, 
      teamNameError: data && data.length > 0 ? 'Team name already taken for this event!' : ''
    }));
  };

  const handleMemberSearch = async (query) => {
    setWizard(p => ({ ...p, searchTerm: query }));
    if (query.length < 3) return setWizard(p => ({ ...p, searchResults: [] }));
    
    setWizard(p => ({ ...p, isSearching: true }));
    let q = supabase.from('students').select('email, name, surname').ilike('email', `%${query}%`).limit(6);
    if (!wizard.event.is_open_to_all) q = q.ilike('email', `%${userDomain}`); 
    
    const { data } = await q;
    setWizard(p => ({ ...p, searchResults: data || [], isSearching: false }));
  };

  const addMember = async (userObj) => {
    if (wizard.members.find(m => m.email === userObj.email)) return toast.error("User already in your roster!");
    
    const requiredSize = wizard.selectedGame.team_size;
    if (wizard.members.length >= requiredSize) return toast.error(`Maximum team size is ${requiredSize}.`);

    const loadToast = toast.loading("Verifying member availability...");
    const { data } = await supabase.from('booking_members').select('id').eq('event_id', wizard.event.id).eq('student_email', userObj.email);
    
    if (data && data.length > 0) {
      toast.error("This user is already registered for this event elsewhere!", { id: loadToast });
    } else {
      setWizard(p => ({ 
        ...p, 
        members: [...p.members, { email: userObj.email, name: `${userObj.name} ${userObj.surname}`.trim() }],
        searchTerm: '', searchResults: []
      }));
      toast.success("Member secured!", { id: loadToast });
    }
  };

  const removeMember = (email) => {
    setWizard(p => ({ ...p, members: p.members.filter(m => m.email !== email || m.isLead) }));
  };

  const processFinalCheckout = async () => {
    setWizard(p => ({ ...p, processing: true }));
    const { event, selectedGame, entryMode, teamName, members } = wizard;
    const isPaid = event.event_type === 'paid';

    try {
      if (!isPaid) {
        const { data: booking, error } = await supabase.from('bookings').insert({
          event_id: event.id, student_email: currentUserEmail, status: 'confirmed',
          team_name: entryMode === 'Team' ? teamName.trim() : null,
          selected_game: selectedGame?.gameName || null
        }).select().single();
        if (error) throw error;

        const memPayload = members.map(m => ({ booking_id: booking.id, event_id: event.id, student_email: m.email }));
        const { error: memErr } = await supabase.from('booking_members').insert(memPayload);
        if (memErr) throw memErr;

        setPaymentSuccess(true);
        fetchEvents();
        setTimeout(() => {
          setPaymentSuccess(false); setWizard(p => ({ ...p, open: false }));
          handleViewTicket({ ...event, bookingId: booking.id, bookingStatus: 'confirmed', teamName: entryMode === 'Team' ? teamName : null, selectedGame: selectedGame?.gameName });
        }, 3500);

      } else {
        const ticketFee = Number(event.price || 0);
        const totalAmount = Number((ticketFee + 5 + ((ticketFee + 5) * 0.025)).toFixed(2));
        
        const res = await loadRazorpayScript();
        if (!res) throw new Error("Razorpay SDK failed.");
        
        const { data: orderData } = await supabase.functions.invoke('create-razorpay-order', { body: { event_id: event.id, amount: totalAmount } });
        
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID, amount: orderData.amount, currency: "INR", name: "Nexus Circle", order_id: orderData.id, 
          handler: async function (response) {
            const { data: booking, error } = await supabase.from('bookings').insert({
              event_id: event.id, student_email: currentUserEmail, status: 'verified',
              team_name: entryMode === 'Team' ? teamName.trim() : null, selected_game: selectedGame?.gameName || null,
              razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature
            }).select().single();
            
            if (!error) {
              const memPayload = members.map(m => ({ booking_id: booking.id, event_id: event.id, student_email: m.email }));
              await supabase.from('booking_members').insert(memPayload);
              
              setPaymentSuccess(true); fetchEvents();
              setTimeout(() => {
                setPaymentSuccess(false); setWizard(p => ({ ...p, open: false }));
                handleViewTicket({ ...event, bookingId: booking.id, bookingStatus: 'verified', teamName: entryMode === 'Team' ? teamName : null, selectedGame: selectedGame?.gameName });
              }, 3500);
            }
          },
          prefill: { email: currentUserEmail }, theme: { color: "#2563eb" } 
        };
        new window.Razorpay(options).open();
      }
    } catch (error) {
      toast.error(error.message || "Booking failed due to a roster conflict or network error.");
    } finally {
      setWizard(p => ({ ...p, processing: false }));
    }
  };

  const handleViewTicket = async (eventObj) => {
    let fullMembers = [];
    if (eventObj.teamName && eventObj.bookingId) {
       const { data: memEmails } = await supabase.from('booking_members').select('student_email').eq('booking_id', eventObj.bookingId);
       if (memEmails) {
          const emails = memEmails.map(m => m.student_email);
          const { data: profiles } = await supabase.from('students').select('email, name, surname').in('email', emails);
          fullMembers = profiles || [];
       }
    }
    setSelectedTicket({ ...eventObj, fullMembers });
    setIsFlipping(false);
    setTimeout(() => setIsFlipping(true), 300);
  };

  const closePoppedEvent = () => {
    setIsClosing(true); 
    setTimeout(() => { setPoppedEvent(null); setIsClosing(false); }, 400); 
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating Secure PDF Pass...");
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#0a0f1d', windowWidth: 794 });
      const pdf = new jsPDF('p', 'px', [794, 1123]);
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 794, 1123);
      pdf.save(`NexusCircle_Ticket_${selectedTicket.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.orgName && e.orgName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'available' ? !e.hasAnyBooking : e.hasAnyBooking);
    const matchesCategory = categoryFilter === 'all' || (e.category || 'Other') === categoryFilter;
    let matchesScope = true;
    if (scopeFilter === 'public') matchesScope = e.is_open_to_all === true;
    else if (scopeFilter === 'org') matchesScope = isAdminUser ? !e.is_open_to_all : e.org_id === userOrgId;
    else if (scopeFilter === 'clubs') matchesScope = selectedClubId === 'all' ? (isAdminUser ? !!e.club_id : (e.org_id === userOrgId && !!e.club_id)) : e.club_id === selectedClubId;
    return matchesSearch && matchesStatus && matchesScope && matchesCategory;
  });

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white selection:bg-blue-500/30 relative pb-24">
      
      {/* CELEBRATION OVERLAY */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-600 flex items-center justify-center bg-[#0a0f1d] overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-75 md:h-75 bg-emerald-500/20 rounded-full animate-ping-slow"></div>
          <div className="relative z-10 flex flex-col items-center animate-success-pop px-4">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-emerald-500 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] border-4 border-emerald-400">
              <CheckCircle size={40} className="text-white md:w-15 md:h-15" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-widest mb-4 text-center">Ticket Confirmed!</h1>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-full backdrop-blur-md border border-white/20">
              <Loader2 className="animate-spin text-emerald-400" />
              <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">Generating Digital Pass...</p>
            </div>
          </div>
        </div>
      )}

      {/* --- MULTI-STEP BOOKING WIZARD --- */}
      {wizard.open && wizard.event && (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 rounded-4xl flex flex-col w-full max-w-2xl max-h-[95vh] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
               <div>
                  <h3 className="text-blue-500 font-black uppercase tracking-widest text-[10px] mb-1">Registration Portal</h3>
                  <h2 className="text-white font-bold text-xl line-clamp-1 italic">{wizard.event.title}</h2>
               </div>
               <button onClick={() => setWizard(p => ({...p, open: false}))} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar grow">
               {/* STEP 1: E-SPORTS GAME SELECTION */}
               {wizard.step === 1 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="text-center space-y-2 mb-8">
                       <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20"><Gamepad2 size={32} className="text-cyan-500"/></div>
                       <h3 className="text-2xl font-black text-white uppercase">Select Tournament</h3>
                       <p className="text-slate-400 text-xs">Choose the game you wish to compete in.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {wizard.event.games_list.map((game, idx) => (
                         <button key={idx} onClick={() => handleGameSelect(game)} className="p-5 bg-[#1f2937] border border-slate-700 hover:border-cyan-500 rounded-2xl flex flex-col items-start gap-2 transition-all group text-left">
                            <h4 className="text-white font-bold text-lg group-hover:text-cyan-400">{game.gameName}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Users size={12}/> {game.participation_type} {game.participation_type !== 'Individual' && `• Size: ${game.team_size}`}</div>
                         </button>
                       ))}
                    </div>
                 </div>
               )}

               {/* STEP 2: MODE SELECTION */}
               {wizard.step === 2 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="text-center space-y-2 mb-8">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20"><Users size={32} className="text-indigo-500"/></div>
                       <h3 className="text-2xl font-black text-white uppercase">Entry Strategy</h3>
                       <p className="text-slate-400 text-xs">Are you going solo or bringing a squad?</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={() => setWizard(p => ({...p, entryMode: 'Individual', step: 4}))} className="p-6 bg-[#1f2937] border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center text-center gap-3 transition-all group">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-indigo-500/20"><Users size={20} className="text-slate-400 group-hover:text-indigo-400"/></div>
                          <div><h4 className="text-white font-bold text-lg">Lone Wolf</h4><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Individual Entry</p></div>
                       </button>
                       <button onClick={() => setWizard(p => ({...p, entryMode: 'Team', step: 3}))} className="p-6 bg-[#1f2937] border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center text-center gap-3 transition-all group">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-indigo-500/20"><ShieldCheck size={20} className="text-slate-400 group-hover:text-indigo-400"/></div>
                          <div><h4 className="text-white font-bold text-lg">Squad Up</h4><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Team Entry</p></div>
                       </button>
                    </div>
                 </div>
               )}

               {/* STEP 3: TEAM SETUP */}
               {wizard.step === 3 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4 flex flex-col h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
                       <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Assemble Team</h3>
                       <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Size: {wizard.members.length} / {wizard.selectedGame.team_size}</span>
                    </div>
                    
                    <div className="space-y-4 shrink-0">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unique Team Name</label>
                         <div className="relative">
                            <input type="text" value={wizard.teamName} onChange={e => handleTeamNameCheck(e.target.value)} placeholder="e.g. The Avengers" className={`w-full p-3.5 bg-[#1f2937] border ${wizard.teamNameError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-indigo-500'} rounded-xl outline-none text-white text-sm transition-colors`} />
                            {wizard.isCheckingName && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"/>}
                         </div>
                         {wizard.teamNameError && <p className="text-xs text-red-400 font-bold ml-1">{wizard.teamNameError}</p>}
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recruit Members</label>
                         <div className="relative z-50">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <input type="text" value={wizard.searchTerm} onChange={e => handleMemberSearch(e.target.value)} placeholder={`Search ${wizard.event.is_open_to_all ? 'users...' : 'org emails...'}`} className="w-full pl-11 pr-4 py-3.5 bg-[#1f2937] border border-slate-700 focus:border-indigo-500 rounded-xl outline-none text-white text-sm transition-colors" disabled={wizard.members.length >= wizard.selectedGame.team_size} />
                            
                            {wizard.searchTerm.length >= 3 && (
                               <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar border-indigo-500/30">
                                  {wizard.isSearching ? (
                                    <div className="p-4 text-center text-slate-500 text-xs font-bold uppercase"><Loader2 size={16} className="animate-spin inline mr-2"/> Searching...</div>
                                  ) : wizard.searchResults.length > 0 ? (
                                    wizard.searchResults.map(u => (
                                      <button key={u.email} onClick={() => addMember(u)} className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors text-left border-b border-white/5 last:border-0 group">
                                         <div><p className="text-sm text-white font-bold">{u.name} {u.surname}</p><p className="text-[10px] text-slate-500">{u.email}</p></div>
                                         <UserPlus size={16} className="text-slate-500 group-hover:text-indigo-400"/>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-slate-500 text-xs font-bold uppercase">No results found.</div>
                                  )}
                               </div>
                            )}
                         </div>
                       </div>
                    </div>

                    <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5 grow overflow-y-auto custom-scrollbar">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Current Roster</h4>
                       <div className="space-y-2">
                          {wizard.members.map((m, i) => (
                             <div key={i} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase">{m.name.charAt(0)}</div>
                                   <div>
                                      <p className="text-sm text-white font-bold flex items-center gap-2">{m.name} {m.isLead && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[8px] uppercase tracking-widest rounded">Lead</span>}</p>
                                      <p className="text-[9px] text-slate-500">{m.email}</p>
                                   </div>
                                </div>
                                {!m.isLead && (
                                   <button onClick={() => removeMember(m.email)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><UserMinus size={16}/></button>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 shrink-0">
                       <button 
                         onClick={() => setWizard(p => ({...p, step: 4}))}
                         disabled={wizard.members.length !== wizard.selectedGame.team_size || !wizard.teamName.trim() || !!wizard.teamNameError}
                         className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                       >
                         Proceed to Checkout <ArrowRight size={16}/>
                       </button>
                    </div>
                 </div>
               )}

               {/* STEP 4: CHECKOUT SUMMARY */}
               {wizard.step === 4 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-[#1f2937]/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
                       <div className="flex justify-between items-start border-b border-white/5 pb-6">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Final Review</h4>
                            <h3 className="text-2xl font-black text-white italic">{wizard.event.title}</h3>
                          </div>
                          <div className="text-right">
                            {wizard.event.event_type === 'paid' ? <p className="text-2xl font-black text-emerald-400">₹{(Number(wizard.event.price) + 5 + ((Number(wizard.event.price) + 5) * 0.025)).toFixed(2)}</p> : <p className="text-2xl font-black text-blue-400 uppercase">FREE</p>}
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Due</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Layers size={14} className="text-blue-500"/> {wizard.event.category}</p></div>
                          <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entry Type</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Users size={14} className="text-blue-500"/> {wizard.entryMode}</p></div>
                          {wizard.selectedGame && <div className="col-span-2"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tournament Game</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Gamepad2 size={14} className="text-blue-500"/> {wizard.selectedGame.gameName}</p></div>}
                          {wizard.entryMode === 'Team' && <div className="col-span-2"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Verified Team Name</p><p className="text-sm text-indigo-400 font-black tracking-wider uppercase bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">{wizard.teamName}</p></div>}
                       </div>
                    </div>

                    <button onClick={processFinalCheckout} disabled={wizard.processing} className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
                       {wizard.processing ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
                       {wizard.processing ? "Securing Allocation..." : wizard.event.event_type === 'paid' ? "Proceed to Payment Gateway" : "Confirm Digital Pass"}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- CLUB ZOOM MODAL --- */}
      {zoomedClub && (
        <div className="fixed inset-0 z-700 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setZoomedClub(null)}>
          <div className="relative animate-in zoom-in-95 duration-300 flex flex-col items-center max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedClub(null)} className="absolute -top-20 right-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 active:scale-90 transition-all"><X size={24} /></button>
            <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-8">
              <ShieldCheck size={48} className="text-blue-500" />
            </div>
            <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-xs mb-4 text-center">Official Club Host</p>
            <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter text-center leading-none px-4 drop-shadow-2xl">{zoomedClub}</h2>
          </div>
        </div>
      )}

      {/* --- SPOTLIGHT EVENT PREVIEW --- */}
      {poppedEvent && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden" onClick={closePoppedEvent}>
          <div className={`relative w-full max-w-md animate-in zoom-in-95 fade-in duration-300 ${isClosing ? 'animate-flip-pop-out' : 'animate-flip-pop'}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={closePoppedEvent} className="absolute -top-12 md:-top-16 right-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 transition-all active:scale-90 z-700"><X size={24} /></button>
            <div className="flex flex-col gap-6">
              <div className="text-center space-y-2">
                <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Spotlight Visualization</p>
                <h3 className="text-white font-black uppercase text-xl italic tracking-tighter">Interactive Entry Point</h3>
              </div>
              <div className="md:scale-105 origin-center">
                <FlipCard event={poppedEvent} onBook={startBookingWizard} onViewTicket={handleViewTicket} onZoomClub={setZoomedClub} availableClubs={availableClubs} spotlightMode={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="sticky top-18 z-40 bg-[#0a0f1d]/80 backdrop-blur-2xl border-b border-white/5 py-4 px-4 md:px-6 shadow-xl mb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="relative w-full z-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none text-sm font-semibold text-white focus:border-blue-500/50 transition-all shadow-inner"/>
          </div>
          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center w-full">
            <div className="flex flex-col gap-2 relative z-40">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Event Type</span>
              <div className="flex flex-wrap items-center gap-2">
                {[{ id: 'all', label: 'All' }, { id: 'public', label: 'Public' }, { id: 'org', label: isAdminUser ? 'Universities' : 'University' }, { id: 'clubs', label: 'Clubs' }].map(tab => (
                  <button key={tab.id} onClick={() => { setScopeFilter(tab.id); setSelectedClubId('all'); setIsClubDropdownOpen(false); }} 
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${scopeFilter === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800/50 text-slate-400 border-white/5'}`}>{tab.label}</button>
                ))}
              </div>
              {scopeFilter === 'clubs' && (
                <div className="relative w-full sm:w-64 mt-2 animate-in fade-in zoom-in-95 duration-200" ref={clubDropdownRef}>
                  <button onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)} className="flex items-center justify-between w-full px-4 py-3 bg-blue-600/10 border border-blue-500/30 rounded-xl outline-none text-blue-400 text-[11px] font-bold uppercase tracking-wider shadow-sm transition-colors hover:bg-blue-600/20">
                    <span className="truncate pr-4 text-left">{selectedClubId === 'all' ? 'All Available Clubs' : availableClubs.find(c => c.id === selectedClubId)?.name}</span>
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isClubDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                        <button onClick={() => { setSelectedClubId('all'); setIsClubDropdownOpen(false); }} className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${selectedClubId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>All Available Clubs</button>
                        {availableClubs.map(c => (
                          <button key={c.id} onClick={() => { setSelectedClubId(c.id); setIsClubDropdownOpen(false); }} className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${selectedClubId === c.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>{c.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 relative z-30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</span>
              <div className="relative w-full sm:w-56" ref={categoryDropdownRef}>
                <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="flex items-center justify-between w-full px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-300 text-[11px] font-bold uppercase transition-all">
                  <span className="truncate flex items-center gap-2"><Layers size={14} className={categoryFilter === 'all' ? 'text-slate-500' : 'text-blue-500'} />{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 p-1.5">
                    <button onClick={() => { setCategoryFilter('all'); setIsCategoryDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold uppercase rounded-lg ${categoryFilter === 'all' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>All Categories</button>
                    {CATEGORIES.map(cat => ( <button key={cat} onClick={() => { setCategoryFilter(cat); setIsCategoryDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold uppercase rounded-lg ${categoryFilter === cat ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>{cat}</button> ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 relative z-20">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Availability</span>
              <div className="flex flex-wrap items-center gap-2">
                {[{ id: 'all', label: 'All Passes' }, { id: 'available', label: 'Available' }, { id: 'Booked', label: 'Secured' }].map(s => (
                  <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${statusFilter === s.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-slate-800/50 text-slate-400 border-white/5'}`}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEED GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <section className="space-y-10 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-3"><Zap className="text-yellow-500 fill-yellow-500" size={24}/> Event Feed</h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-white/5">{filteredEvents.length} {filteredEvents.length === 1 ? 'EVENT' : 'EVENTS'}</span>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-[#111827]/50 rounded-[2.5rem] border border-white/5 border-dashed"><Search size={40} className="text-slate-600 mb-4" /><p className="text-slate-400 font-bold tracking-wide text-sm text-center px-4">No events found matching your criteria.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500">
              {filteredEvents.map(event => (
                <FlipCard key={event.id} event={event} onBook={startBookingWizard} onFlip={() => setPoppedEvent(event)} onViewTicket={handleViewTicket} onZoomClub={setZoomedClub} availableClubs={availableClubs} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* HIDDEN PRINTABLE PDF LAYER */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '794px', minHeight: '1123px', backgroundColor: '#0a0f1d', padding: '40px' }}>
            <div style={{ width: '714px', minHeight: '1043px', border: '4px solid #3b82f6', borderRadius: '32px', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1d' }}>
              <div style={{ padding: '60px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                   <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '3px' }}>{selectedTicket.orgName} • PASS</p>
                 </div>
                 <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{selectedTicket.title}</h1>
                 
                 {selectedTicket.teamName && <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#818cf8', marginTop: '20px', textTransform: 'uppercase' }}>TEAM: {selectedTicket.teamName}</p>}
                 {selectedTicket.selectedGame && <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#22d3ee', marginTop: '10px', textTransform: 'uppercase' }}>GAME: {selectedTicket.selectedGame}</p>}

                 <div style={{ marginTop: '40px', color: '#ffffff', fontSize: '24px' }}>
                    <p>Date: {selectedTicket.date}</p>
                    <p>Time: {formatTime(selectedTicket.start_time)}</p>
                    <p>Venue: {selectedTicket.venue}</p>
                    {!selectedTicket.teamName && <p>Attendee: {studentName}</p>}
                 </div>

                 {selectedTicket.teamName && selectedTicket.fullMembers && (
                    <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#1e293b', borderRadius: '20px', border: '2px solid #334155' }}>
                       <p style={{ color: '#94a3b8', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', fontWeight: 'bold' }}>Official Roster</p>
                       {selectedTicket.fullMembers.map((m, i) => (
                          <p key={i} style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' }}>• {m.name} {m.surname}</p>
                       ))}
                    </div>
                 )}
              </div>
              <div style={{ marginTop: 'auto', backgroundColor: '#ffffff', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}>
                 <QRCodeCanvas value={selectedTicket.bookingId || "error"} size={200} />
                 <p style={{ color: '#000', fontWeight: 'bold', marginTop: '20px' }}>ID: {selectedTicket.bookingId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET VIEW */}
      {selectedTicket && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white z-610 border border-white/10"><X size={24} /></button>
          <div className="perspective-2000 w-full max-w-[90vw] md:max-w-md h-[80vh] cursor-pointer" onClick={() => setIsFlipping(!isFlipping)}>
            <div className={`relative w-full h-full transition-transform duration-1000 transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT: DETAILS */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] md:rounded-[3.5rem] border border-blue-500/40 p-6 md:p-10 flex flex-col shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
                <div className="text-left flex flex-col h-full">
                   <div className="flex items-center justify-between mb-6 shrink-0">
                     <div className="flex items-center gap-2"><ShieldCheck className="text-blue-500 w-6 h-6"/><p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Digital<br/>Pass</p></div>
                     <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${selectedTicket.bookingStatus === 'checked_in' ? 'text-green-500 border-green-500/20' : 'text-blue-500 border-blue-500/20'}`}>{(selectedTicket.bookingStatus || 'Verified').replace('_', ' ')}</div>
                   </div>
                   
                   <h4 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic leading-none mb-6 text-white shrink-0">{selectedTicket.title}</h4>
                   
                   <div className="space-y-4 grow overflow-y-auto custom-scrollbar pr-2">
                      {selectedTicket.teamName && (
                        <div className="flex items-center gap-3"><Users className="text-indigo-400 shrink-0" /><div><p className="text-[9px] font-bold text-slate-500 uppercase">Team Name</p><p className="text-sm md:text-lg font-black text-indigo-400 uppercase tracking-wider">{selectedTicket.teamName}</p></div></div>
                      )}
                      {selectedTicket.selectedGame && (
                        <div className="flex items-center gap-3"><Gamepad2 className="text-cyan-400 shrink-0" /><div><p className="text-[9px] font-bold text-slate-500 uppercase">Tournament</p><p className="text-sm md:text-lg font-bold text-cyan-400">{selectedTicket.selectedGame}</p></div></div>
                      )}
                      <div className="flex items-center gap-3"><Calendar className="text-blue-500 shrink-0" /><div><p className="text-[9px] font-bold text-slate-500 uppercase">Valid For</p><p className="text-sm md:text-lg font-bold text-slate-200">{selectedTicket.date}</p></div></div>
                      <div className="flex items-center gap-3"><Clock className="text-blue-500 shrink-0" /><div><p className="text-[9px] font-bold text-slate-500 uppercase">Time</p><p className="text-sm md:text-lg font-bold text-slate-200">{formatTime(selectedTicket.start_time)} — {formatTime(selectedTicket.end_time) || 'END'}</p></div></div>
                      <div className="flex items-center gap-3"><MapPin className="text-blue-500 shrink-0" /><div className="min-w-0"><p className="text-[9px] font-bold text-slate-500 uppercase">Venue</p><p className="text-sm md:text-lg font-bold truncate text-slate-200">{selectedTicket.venue}</p></div></div>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-4 pt-4 border-t border-white/5 mt-auto shrink-0"><p className="text-blue-500 font-bold text-[9px] uppercase tracking-widest animate-pulse">Tap Card to View Entry Code</p></div>
              </div>

              {/* BACK: QR AND ROSTER */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col p-6 md:p-8 text-slate-900 overflow-hidden">
                <div className="flex flex-col items-center shrink-0">
                  <div className="text-center mb-4">
                     <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{selectedTicket.teamName ? 'Lead Attendee' : 'Attendee'}</p>
                     <h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-blue-600 italic line-clamp-1">{studentName}</h4>
                  </div>
                  <div className="bg-[#f8fafc] p-4 rounded-3xl border-2 border-slate-100 mb-4 inline-block"><QRCodeCanvas value={selectedTicket.bookingId || "error"} size={160} level="H" /></div>
                </div>

                {selectedTicket.teamName && selectedTicket.fullMembers && (
                  <div className="w-full grow overflow-y-auto custom-scrollbar bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 text-left">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Users size={12}/> Verified Roster</p>
                     <div className="space-y-1.5">
                       {selectedTicket.fullMembers.map((m, i) => (
                         <div key={i} className="text-xs font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span> {m.name} {m.surname}
                         </div>
                       ))}
                     </div>
                  </div>
                )}
                
                <div className="w-full space-y-3 mt-auto shrink-0">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between"><p className="font-mono text-[10px] text-slate-500 font-bold truncate">ID: {selectedTicket.bookingId}</p><Fingerprint className="text-blue-500 shrink-0" /></div>
                  <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg">
                    {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}{isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest">Tap to flip back</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flipPop { 0% { transform: perspective(2000px) scale(0.8) rotateY(-90deg); opacity: 0; } 100% { transform: perspective(2000px) scale(1) rotateY(0deg); opacity: 1; } }
        @keyframes flipPopOut { 0% { transform: perspective(2000px) scale(1) rotateY(0deg); opacity: 1; } 100% { transform: perspective(2000px) scale(0.8) rotateY(90deg); opacity: 0; } }
        @keyframes successPop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pingSlow { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .animate-flip-pop { animation: flipPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-flip-pop-out { animation: flipPopOut 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
        .animate-success-pop { animation: successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }
        .event-description p { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
};

const FlipCard = ({ event, onBook, onFlip, onViewTicket, onZoomClub, availableClubs, spotlightMode = false }) => {
  const [isInternalFlipped, setIsInternalFlipped] = useState(false);
  const images = Array.isArray(event.images) && event.images.length > 0 ? event.images : ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"];

  const handleShare = async (e) => {
    e.stopPropagation();
    const deepLink = `${window.location.origin}${window.location.pathname}?event=${event.id}`;
    const shareData = { title: event.title, text: `Check out this event: ${event.title}!`, url: deepLink };
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(deepLink); toast.success("Link copied!"); }
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const clubName = event.club_id && availableClubs ? availableClubs.find(c => c.id === event.club_id)?.name : null;
  const glowClass = event.isCheckedIn ? 'ring-1 ring-indigo-500 shadow-indigo-500/10' : event.isBooked ? 'ring-1 ring-emerald-500 shadow-emerald-500/10' : event.isPending ? 'ring-1 ring-yellow-500 shadow-yellow-500/10' : 'border border-white/5 hover:border-blue-500/30';

  return (
    <div 
      onClick={() => { if(spotlightMode) setIsInternalFlipped(!isInternalFlipped); else onFlip(); }} 
      className={`group relative h-125 bg-[#111827]/90 backdrop-blur-md rounded-[2.5rem] flex flex-col cursor-pointer transition-all duration-500 border border-transparent ${glowClass} ${!spotlightMode && 'hover:-translate-y-1'} perspective-2000`}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isInternalFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* FRONT FACE */}
        <div className="absolute inset-0 backface-hidden flex flex-col h-full rounded-[2.5rem] overflow-hidden bg-[#111827]/90">
          <div className="relative w-full h-48 sm:h-52 shrink-0 bg-slate-900 overflow-hidden border-b border-white/5">
            <img src={images[0]} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
            <div className="absolute inset-0 bg-linear-to-t from-[#111827] via-transparent to-transparent opacity-90"></div>
            <div className="absolute top-4 left-4"><span className="backdrop-blur-md bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border border-white/10 truncate max-w-40">{event.orgName}</span></div>
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button onClick={handleShare} className="p-2.5 bg-black/60 hover:bg-blue-600 text-white rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90"><Share2 size={16}/></button>
            </div>
            <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg border border-blue-500/30 text-[9px] font-black uppercase shadow-lg z-10"><Layers size={12}/> {event.category || 'OTHER'}</div>
          </div>

          <div className="p-5 md:p-6 flex flex-col grow">
            <h4 className="text-xl font-black uppercase italic text-white mb-5 line-clamp-2">{event.title}</h4>
            <div className="flex justify-between items-start gap-4 mb-6">
                <div className="flex flex-col gap-3 min-w-0 grow">
                    <div className="flex items-center gap-3 text-slate-300 text-[11px] font-bold uppercase"><Calendar size={14} className="text-blue-500"/><span className="truncate">{event.date}</span></div>
                    <div className="flex items-center gap-3 text-slate-300 text-[11px] font-bold uppercase"><MapPin size={14} className="text-blue-500"/><span className="truncate pr-2">{event.venue}</span></div>
                </div>
                {clubName && (
                    <div onClick={(e) => { e.stopPropagation(); onZoomClub(clubName); }} className="flex flex-col items-center justify-center gap-2 shrink-0 w-32 bg-slate-800/50 p-4 rounded-3xl border border-white/5 shadow-inner hover:bg-slate-700 transition-all active:scale-95 group/club">
                       <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg group-hover/club:bg-blue-500/20 transition-all"><ShieldCheck size={28} className="text-blue-500"/></div>
                       <p className="text-[8px] font-black text-slate-500 uppercase text-center mt-1 leading-none">Hosted By</p>
                       <p className="text-[11px] font-black text-white uppercase italic tracking-tighter text-center line-clamp-2 leading-tight w-full" title={clubName}>{clubName}</p>
                    </div>
                )}
            </div>
            <div className="mt-auto">
               <button disabled={(event.isSoldOut && !event.hasAnyBooking) || (!event.isOpen && !event.hasAnyBooking) || event.isPending} onClick={(e) => { e.stopPropagation(); if (event.isBooked || event.isCheckedIn) onViewTicket(event); else onBook(e, event); }}
                 className={`w-full py-4 rounded-xl font-black uppercase text-xs transition-all tracking-widest shadow-lg ${event.isCheckedIn ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : event.isBooked ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10' : event.isPending ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30' : !event.isOpen ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 active:scale-95'}`}>
                 {event.isCheckedIn ? "Checked In" : event.isBooked ? "View Ticket" : event.isPending ? "Verifying" : !event.isOpen ? "Closed" : "Get Ticket"}
               </button>
            </div>
          </div>
        </div>

        {/* BACK FACE (Details + Specifications inside the card) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-[2.5rem] flex flex-col p-6 md:p-8 overflow-hidden border border-white/5">
             <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 shrink-0">
               <h4 className="text-blue-500 font-black uppercase tracking-widest text-[11px]">Event Details</h4>
               <Layers size={16} className="text-slate-500" />
             </div>
             
             <div className="flex flex-col gap-6 text-left grow overflow-y-auto custom-scrollbar pr-2 pb-2">
                <div className="space-y-4 shrink-0">
                   <div className="flex items-center gap-4 text-white">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0"><Clock size={20} className="text-blue-500"/></div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timing</p><p className="font-bold text-sm">{formatEventTime(event.start_time)} — {formatEventTime(event.end_time) || 'END'}</p></div>
                   </div>
                   <div className="flex items-center gap-4 text-white">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0"><Ticket size={20} className="text-emerald-500"/></div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pricing</p><p className="font-bold text-sm uppercase">{event.event_type} ENTRY</p></div>
                   </div>
                   {event.category === 'E-Sports' && event.games_list && event.games_list.length > 0 && (
                     <div className="flex items-start gap-4 text-white pt-2 border-t border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-cyan-600/20 flex items-center justify-center shrink-0"><Gamepad2 size={20} className="text-cyan-500"/></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tournaments Available</p>
                          <div className="flex flex-wrap gap-1.5">
                            {event.games_list.map((g, i) => (
                              <span key={i} className="text-[9px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20">{g.gameName}</span>
                            ))}
                          </div>
                        </div>
                     </div>
                   )}
                </div>

                {/* Fully Integrated Scrolling Event Description */}
                {event.description && (
                   <div className="pt-4 border-t border-white/5 shrink-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FileText size={12}/> Event Specification
                      </p>
                      <div className="event-description text-slate-300 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: event.description }} />
                   </div>
                )}
             </div>
             
             <p className="mt-4 pt-4 border-t border-white/10 shrink-0 text-center text-slate-500 text-[10px] font-bold uppercase animate-pulse">Tap anywhere to flip back</p>
        </div>

      </div>
    </div>
  );
};

export default EventList;