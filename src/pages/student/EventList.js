import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Calendar, Search, Zap, Clock, RefreshCw,
  CheckCircle, MapPin, X, Loader2, ShieldCheck,
  Download, ChevronDown, Layers, Share2, 
  Users, Gamepad2, ArrowRight, UserPlus, UserMinus, Filter, FileText, ArrowLeft
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

// ==========================================
// DYNAMIC 5% FEE CALCULATORS
// ==========================================
const getBaseAmount = (eventObj, selectedGameObj) => {
  if (String(eventObj?.category).toLowerCase() === 'e-sports' && selectedGameObj) {
     return String(selectedGameObj.ticket_type).toLowerCase() === 'paid' ? Number(selectedGameObj.ticket_price || 0) : 0;
  }
  return String(eventObj?.event_type).toLowerCase() === 'paid' ? Number(eventObj.price || 0) : 0;
};

const getDisplayAmount = (eventObj, selectedGameObj) => {
  const base = getBaseAmount(eventObj, selectedGameObj);
  return base > 0 ? Number((base * 1.05).toFixed(2)) : 0;
};

const getTicketViewerPrice = (ticket) => {
  if (!ticket) return 0;
  if (String(ticket.category).toLowerCase() === 'e-sports' && ticket.selectedGame) {
     const gameObj = ticket.games_list?.find(g => String(g.gameName).trim().toLowerCase() === String(ticket.selectedGame).trim().toLowerCase());
     if (gameObj && String(gameObj.ticket_type).trim().toLowerCase() === 'paid') {
         const base = Number(gameObj.ticket_price || 0);
         return Number((base * 1.05).toFixed(2));
     }
     return 0;
  }
  if (Number(ticket.price) > 0) {
      const base = Number(ticket.price);
      return Number((base * 1.05).toFixed(2));
  }
  return 0;
};
// ==========================================

const formatEventTime = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return 'TBA';
  if (start && !end) return formatEventTime(start);
  return `${formatEventTime(start)} - ${formatEventTime(end)}`;
};

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
  
  const [now, setNow] = useState(new Date());

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [expandedEvent, setExpandedEvent] = useState(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [zoomedClub, setZoomedClub] = useState(null);

  const printRef = useRef(null);
  const filterMenuRef = useRef(null);

  const [wizard, setWizard] = useState({
    open: false, step: 1, event: null, selectedGame: null, entryMode: 'Individual',
    teamName: '', teamNameError: '', isCheckingName: false, members: [],
    searchTerm: '', searchResults: [], isSearching: false, processing: false
  });

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
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
      const userEmail = user ? user.email : null;
      
      if (user) {
        const { data: profile } = await supabase.from('students').select('name, surname').eq('email', userEmail).single();
        if (profile) setStudentName(`${profile.name || 'Student'} ${profile.surname || ''}`.trim());
        setCurrentUserEmail(userEmail);
        domain = '@' + userEmail.split('@')[1]; 
        setUserDomain(domain);
        const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
        isSuper = adminEmails.includes(userEmail);
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
      if (userEmail && bookingsRes.data) {
        bookingsRes.data.forEach(b => {
          if (b.student_email === userEmail && !myBookingIds.includes(b.id)) {
            myBookingIds.push(b.id);
          }
        });
      }

      const eventsWithMeta = visibleEvents.map(event => {
        const eventBookings = bookingsRes.data?.filter(b => b.event_id === event.id) || [];
        const userBookings = eventBookings.filter(b => b.student_email === userEmail || myBookingIds.includes(b.id));
        
        const isFullyBooked = event.category === 'E-Sports' && event.games_list 
            ? userBookings.length >= event.games_list.length 
            : userBookings.length > 0;

        return {
          ...event,
          orgName: orgNameMap[event.org_id] || 'Organization',
          userBookings, 
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          hasAnyBooking: userBookings.length > 0,
          isFullyBooked,
          isOpen: now >= new Date(event.reg_start_timestamp)
        };
      });

      setEvents(eventsWithMeta);
    } catch (error) {
      console.error("Discovery Error:", error);
      toast.error("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [now]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const startBookingWizard = (e, event) => {
    e.stopPropagation();
    if (!currentUserEmail) return toast.error("Login Required");
    if (!event.isOpen) return toast.error("Registration not yet open!");
    if (event.isFullyBooked) return toast.error("You have already secured maximum tickets for this event.");
    if (event.isSoldOut) return toast.error("Event is Sold Out!");

    let startStep = 1;
    let defaultGame = null;
    let defaultMode = 'Individual';
    
    if (event.category !== 'E-Sports') {
       defaultGame = { participation_type: event.participation_type, team_size: event.team_size };
       if (event.participation_type === 'Team') { startStep = 3; defaultMode = 'Team'; }
       else if (event.participation_type === 'Both') { startStep = 2; }
       else { startStep = 4; defaultMode = 'Individual'; }
    } else { startStep = 1; }

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
      teamNameError: data && data.length > 0 ? 'Team name already taken!' : ''
    }));
  };

  const handleMemberSearch = async (query) => {
    setWizard(p => ({ ...p, searchTerm: query }));
    if (query.length < 3) return setWizard(p => ({ ...p, searchResults: [] }));
    setWizard(p => ({ ...p, isSearching: true }));
    let q = supabase.from('students').select('email, name, surname').or(`name.ilike.%${query}%,surname.ilike.%${query}%,email.ilike.%${query}%`).limit(6);
    if (!wizard.event.is_open_to_all) q = q.ilike('email', `%${userDomain}`); 
    const { data } = await q;
    setWizard(p => ({ ...p, searchResults: data || [], isSearching: false }));
  };

  const addMember = async (userObj) => {
    if (wizard.members.find(m => m.email === userObj.email)) return toast.error("Friend already in team!");
    const requiredSize = parseInt(wizard.selectedGame.team_size);
    if (wizard.members.length >= requiredSize) return toast.error(`Max team size is ${requiredSize}.`);
    
    const loadToast = toast.loading("Checking their availability...");
    try {
      const { data: evBookings } = await supabase.from('bookings').select('id').eq('event_id', wizard.event.id).eq('selected_game', wizard.selectedGame.gameName);
      const bIds = evBookings ? evBookings.map(b => b.id) : [];
      
      let isRegistered = false;
      if (bIds.length > 0) {
        const { data } = await supabase.from('booking_members').select('id').eq('student_email', userObj.email).in('booking_id', bIds);
        if (data && data.length > 0) isRegistered = true;
      }

      if (isRegistered) {
        toast.error(`They are already registered for ${wizard.selectedGame.gameName}!`, { id: loadToast });
      } else {
        setWizard(p => ({ 
          ...p, members: [...p.members, { email: userObj.email, name: `${userObj.name} ${userObj.surname}`.trim() }],
          searchTerm: '', searchResults: []
        }));
        toast.success("Friend added to team!", { id: loadToast });
      }
    } catch (err) {
      toast.error("Unable to add team member at this time.", { id: loadToast });
    }
  };

  const removeMember = (email) => {
    setWizard(p => ({ ...p, members: p.members.filter(m => m.email !== email || m.isLead) }));
  };

  const handleWizardBack = () => {
    if (wizard.step === 4) {
      if (wizard.entryMode === 'Team') setWizard(p => ({...p, step: 3}));
      else if (wizard.selectedGame?.participation_type === 'Both') setWizard(p => ({...p, step: 2}));
      else if (wizard.event?.category === 'E-Sports') setWizard(p => ({...p, step: 1}));
    } else if (wizard.step === 3) {
      if (wizard.selectedGame?.participation_type === 'Both') setWizard(p => ({...p, step: 2}));
      else if (wizard.event?.category === 'E-Sports') setWizard(p => ({...p, step: 1}));
    } else if (wizard.step === 2) {
      if (wizard.event?.category === 'E-Sports') setWizard(p => ({...p, step: 1}));
    }
  };

  const canGoBack = () => {
    if (!wizard.event || wizard.step === 1) return false;
    if (wizard.event.category === 'E-Sports') return true;
    
    if (wizard.step === 4 && wizard.entryMode === 'Team') return true; 
    if (wizard.step === 4 && wizard.selectedGame?.participation_type === 'Both' && wizard.entryMode === 'Individual') return true;
    if (wizard.step === 3 && wizard.selectedGame?.participation_type === 'Both') return true;
    
    return false;
  };

  const processFinalCheckout = async () => {
    setWizard(p => ({ ...p, processing: true }));
    const { event, selectedGame, entryMode, teamName, members } = wizard;

    try {
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('event_id', event.id)
        .eq('selected_game', selectedGame?.gameName || null);

      if (existingBookings && existingBookings.length > 0) {
        const bIds = existingBookings.map(b => b.id);
        
        const { data: memCheck } = await supabase
          .from('booking_members')
          .select('id')
          .eq('student_email', currentUserEmail)
          .in('booking_id', bIds);

        if (memCheck && memCheck.length > 0) {
          throw new Error(`You are already registered for ${selectedGame?.gameName || 'this event'}. Multiple entries are not allowed.`);
        }
        
        if (members.length > 1) {
            const memberEmails = members.filter(m => m.email !== currentUserEmail).map(m => m.email);
            const { data: crossMemCheck } = await supabase
              .from('booking_members')
              .select('student_email')
              .in('student_email', memberEmails)
              .in('booking_id', bIds);
              
            if (crossMemCheck && crossMemCheck.length > 0) {
                throw new Error(`A team member (${crossMemCheck[0].student_email}) is already registered for this game.`);
            }
        }
      }
    } catch (err) {
       toast.error(err.message);
       setWizard(p => ({ ...p, processing: false }));
       return; 
    }
    
    const baseAmount = getBaseAmount(event, selectedGame);
    const isPaidEvent = baseAmount > 0;
    
    try {
      if (!isPaidEvent) {
        const { data: bookingId, error } = await supabase.rpc('book_ticket_atomically', {
          p_event_id: event.id,
          p_student_email: currentUserEmail,
          p_team_name: entryMode === 'Team' ? teamName.trim() : null,
          p_selected_game: selectedGame?.gameName || null,
          p_members: members.map(m => m.email),
          p_status: 'confirmed'
        });

        if (error) throw new Error("Unable to secure ticket. The event might be sold out or unavailable.");

        setPaymentSuccess(true); 
        fetchEvents();
        setTimeout(() => {
          setPaymentSuccess(false); 
          setWizard(p => ({ ...p, open: false, processing: false })); 
          handleViewTicket(event, { id: bookingId, status: 'confirmed', team_name: entryMode === 'Team' ? teamName : null, selected_game: selectedGame?.gameName, student_email: currentUserEmail }, members);
        }, 3500);

      } else {
        const res = await loadRazorpayScript();
        if (!res) throw new Error("Payment gateway failed to load. Please check your internet connection.");

        // NOTE: Passes the baseAmount to Edge Function. Ensure the Edge Function adds the 5% correctly.
        const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', { 
           body: { 
             event_id: event.id, 
             amount: Number(baseAmount), 
             student_email: currentUserEmail,
             team_name: entryMode === 'Team' ? teamName.trim() : null,
             selected_game: selectedGame?.gameName || null,
             members: members.map(m => m.email).join(',').substring(0, 250) 
           } 
        });

        if (orderError || !orderData || !orderData.amount) {
           console.error("Order Creation Error:", orderError);
           throw new Error("Unable to initialize payment. Please try again later.");
        }
        
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID, 
          amount: orderData.amount, 
          currency: "INR", 
          name: "Nexus Circle", 
          order_id: orderData.id, 
          handler: async function (response) {
            try {
               const verificationPayload = {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  event_id: event.id,
                  student_email: currentUserEmail,
                  team_name: entryMode === 'Team' ? teamName.trim() : null,
                  selected_game: selectedGame?.gameName || null,
                  members: members.map(m => m.email)
               };

               const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', { body: verificationPayload });
               
               if (verifyError || (verifyData && !verifyData.success)) {
                  console.error("Verification Error:", verifyError || verifyData);
                  throw new Error("Payment is processing, but verification is delayed. Please check your tickets shortly.");
               }

               setPaymentSuccess(true); 
               fetchEvents();
               setTimeout(() => {
                  setPaymentSuccess(false); 
                  setWizard(p => ({ ...p, open: false, processing: false })); 
                  handleViewTicket(event, { id: verifyData.booking?.id || verifyData.bookingId, status: 'verified', team_name: entryMode === 'Team' ? teamName.trim() : null, selected_game: selectedGame?.gameName, student_email: currentUserEmail }, members);
               }, 3500);

            } catch (err) {
               console.error("Payment Handler Error:", err);
               toast.error(err.message || "Payment is being processed. It may take a moment to verify.");
               setWizard(p => ({ ...p, processing: false })); 
            }
          },
          modal: {
            ondismiss: function () {
              setWizard(p => ({ ...p, processing: false }));
              toast.error("Payment cancelled.");
            }
          },
          prefill: { email: currentUserEmail }, theme: { color: "#2563eb" } 
        };
        new window.Razorpay(options).open();
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(error.message || "Unable to complete booking. Please try again.");
      setWizard(p => ({ ...p, processing: false })); 
    }
  };

  const handleViewTicket = async (eventObj, bookingObj = null, localMembers = null) => {
    const targetBooking = bookingObj || eventObj.userBookings?.[0];
    if (!targetBooking) return;

    let fullMembers = [];
    
    if (localMembers && localMembers.length > 0) {
      fullMembers = localMembers.map(m => {
        const nameParts = m.name.split(' ');
        return { name: nameParts[0], surname: nameParts.slice(1).join(' '), email: m.email };
      });
    } else if (targetBooking.team_name && targetBooking.id) {
       const { data: memEmails } = await supabase.from('booking_members').select('student_email').eq('booking_id', targetBooking.id);
       if (memEmails && memEmails.length > 0) {
          const emails = memEmails.map(m => m.student_email);
          const { data: profiles } = await supabase.from('students').select('email, name, surname').in('email', emails);
          
          fullMembers = memEmails.map(bm => {
             const prof = profiles?.find(p => p.email?.toLowerCase() === bm.student_email?.toLowerCase()) || {};
             const fallbackName = prof.name || bm.student_email.split('@')[0];
             return { 
                email: bm.student_email, 
                name: fallbackName, 
                surname: prof.surname || '' 
             };
          });
       } else {
          const { data: leadProfile } = await supabase.from('students').select('email, name, surname').eq('email', currentUserEmail).single();
          if (leadProfile) fullMembers = [leadProfile];
       }
    }

    setSelectedTicket({ 
      ...eventObj, 
      bookingId: targetBooking.id,
      bookingStatus: targetBooking.status,
      teamName: targetBooking.team_name,
      selectedGame: targetBooking.selected_game,
      student_email: targetBooking.student_email,
      fullMembers 
    });
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating PDF...");
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#0a0f1d' });
      const imgWidth = 400; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width; 
      const pdf = new jsPDF('p', 'px', [imgWidth, imgHeight]); 
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Ticket_${selectedTicket.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("Complete!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally { setIsDownloading(false); }
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

  const isFilterActive = scopeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all';

  const expandedClubName = expandedEvent?.club_id && availableClubs ? availableClubs.find(c => c.id === expandedEvent.club_id)?.name : null;
  const expandedDisplayPrice = React.useMemo(() => {
     if (!expandedEvent) return null;
     if (expandedEvent.category === 'E-Sports') return null; 
     if (expandedEvent.event_type === 'free') return "FREE ENTRY";
     const base = Number(expandedEvent.price || 0);
     return `₹${Number((base * 1.05).toFixed(2))}`;
  }, [expandedEvent]);

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white selection:bg-blue-500/30 relative pb-24">
      
      {paymentSuccess && (
        <div className="fixed inset-0 z-600 flex items-center justify-center bg-[#0a0f1d] overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-75 md:h-75 bg-emerald-500/20 rounded-full animate-ping-slow"></div>
          <div className="relative z-10 flex flex-col items-center animate-success-pop px-4">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-emerald-500 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] border-4 border-emerald-400">
              <CheckCircle size={40} className="text-white md:w-15 md:h-15" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-widest mb-4 text-center">Ticket Confirmed!</h1>
          </div>
        </div>
      )}

      {/* --- MULTI-STEP BOOKING WIZARD --- */}
      {wizard.open && wizard.event && (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 rounded-4xl flex flex-col w-full max-w-2xl max-h-[95vh] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
            
            {/* WIZARD HEADER WITH BACK BUTTON */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
               <div className="flex items-center gap-4">
                  {canGoBack() && (
                    <button 
                      onClick={handleWizardBack} 
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <div>
                     <h3 className="text-blue-500 font-black uppercase tracking-widest text-[10px] mb-1">Registration</h3>
                     <h2 className="text-white font-bold text-xl line-clamp-1 italic">{wizard.event.title}</h2>
                  </div>
               </div>
               <button onClick={() => setWizard(p => ({...p, open: false}))} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar grow flex flex-col">
               {/* STEP 1: E-SPORTS GAME SELECTION */}
               {wizard.step === 1 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="text-center space-y-2 mb-8">
                       <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20"><Gamepad2 size={32} className="text-cyan-500"/></div>
                       <h3 className="text-2xl font-black text-white uppercase">Choose Your Game</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {wizard.event.games_list.map((game, idx) => {
                         const existingBooking = wizard.event.userBookings?.find(b => b.selected_game === game.gameName);
                         if (existingBooking) {
                           return (
                             <button key={idx} onClick={() => { setWizard(p => ({...p, open: false})); handleViewTicket(wizard.event, existingBooking); }} className="p-5 bg-emerald-900/10 border border-emerald-500/30 hover:border-emerald-500 rounded-2xl flex flex-col items-start gap-2 transition-all group text-left">
                                <h4 className="text-emerald-400 font-bold text-lg">{game.gameName}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500/70"><CheckCircle size={12}/> View Pass</div>
                             </button>
                           )
                         }
                         return (
                           <button key={idx} onClick={() => handleGameSelect(game)} className="p-5 bg-[#1f2937] border border-slate-700 hover:border-cyan-500 rounded-2xl flex flex-col items-start gap-2 transition-all group text-left">
                              <h4 className="text-white font-bold text-lg group-hover:text-cyan-400">{game.gameName}</h4>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Users size={12}/> {game.participation_type} {game.participation_type !== 'Individual' && `• Size: ${game.team_size}`}</div>
                           </button>
                         )
                       })}
                    </div>
                 </div>
               )}

               {/* STEP 2: MODE SELECTION */}
               {wizard.step === 2 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="text-center space-y-2 mb-8">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20"><Users size={32} className="text-indigo-500"/></div>
                       <h3 className="text-2xl font-black text-white uppercase">How are you joining?</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={() => setWizard(p => ({...p, entryMode: 'Individual', step: 4}))} className="p-6 bg-[#1f2937] border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center text-center gap-3 transition-all group">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-indigo-500/20"><Users size={20} className="text-slate-400 group-hover:text-indigo-400"/></div>
                          <div><h4 className="text-white font-bold text-lg">Just Me</h4></div>
                       </button>
                       <button onClick={() => setWizard(p => ({...p, entryMode: 'Team', step: 3}))} className="p-6 bg-[#1f2937] border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center text-center gap-3 transition-all group">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-indigo-500/20"><ShieldCheck size={20} className="text-slate-400 group-hover:text-indigo-400"/></div>
                          <div><h4 className="text-white font-bold text-lg">With a Team</h4></div>
                       </button>
                    </div>
                 </div>
               )}

               {/* STEP 3: TEAM SETUP */}
               {wizard.step === 3 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4 flex flex-col h-full grow">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0 text-left">
                       <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Build Your Team</h3>
                       <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Size: {wizard.members.length} / {wizard.selectedGame.team_size}</span>
                    </div>
                    
                    <div className="space-y-4 shrink-0">
                       <div className="space-y-2 text-left">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Name</label>
                         <input type="text" value={wizard.teamName} onChange={e => handleTeamNameCheck(e.target.value)} placeholder="Type a cool team name" className={`w-full p-3.5 bg-[#1f2937] border ${wizard.teamNameError ? 'border-red-500' : 'border-slate-700'} rounded-xl outline-none text-white text-sm`} />
                         {wizard.teamNameError && <p className="text-xs text-red-400 font-bold ml-1">{wizard.teamNameError}</p>}
                       </div>

                       <div className="space-y-2 text-left">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Add Friends (By Name or Email)</label>
                         <div className="relative z-50">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <input type="text" value={wizard.searchTerm} onChange={e => handleMemberSearch(e.target.value)} placeholder={`Search students...`} className="w-full pl-11 pr-4 py-3.5 bg-[#1f2937] border border-slate-700 rounded-xl outline-none text-white text-sm" disabled={wizard.members.length >= parseInt(wizard.selectedGame.team_size)} />
                            {wizard.searchTerm.length >= 3 && (
                               <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar border-indigo-500/30">
                                  {wizard.isSearching ? (<div className="p-4 text-center text-slate-500 text-xs font-bold uppercase">Searching...</div>) : wizard.searchResults.length > 0 ? (
                                    wizard.searchResults.map(u => (
                                      <button key={u.email} onClick={() => addMember(u)} className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors text-left border-b border-white/5 last:border-0 group">
                                         <div><p className="text-sm text-white font-bold">{u.name} {u.surname}</p><p className="text-[10px] text-slate-500">{u.email}</p></div>
                                         <UserPlus size={16}/>
                                      </button>
                                    ))
                                  ) : (<div className="p-4 text-center text-slate-500 text-xs font-bold uppercase">No results found.</div>)}
                               </div>
                            )}
                         </div>
                       </div>
                    </div>

                    <div className="bg-[#1f2937]/50 rounded-2xl p-4 border border-white/5 grow overflow-y-auto custom-scrollbar">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-left">Your Team</h4>
                       <div className="space-y-2">
                          {wizard.members.map((m, i) => (
                             <div key={i} className="flex items-center justify-between bg-[#111827] p-3 rounded-xl border border-white/5 text-left">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase">{m.name.charAt(0)}</div>
                                   <div><p className="text-sm text-white font-bold flex items-center gap-2">{m.name} {m.isLead && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[8px] uppercase tracking-widest rounded">Lead</span>}</p><p className="text-[9px] text-slate-500">{m.email}</p></div>
                                </div>
                                {!m.isLead && (<button onClick={() => removeMember(m.email)} className="p-2 text-slate-500 hover:text-red-400"><UserMinus size={16}/></button>)}
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 shrink-0 mt-auto">
                       {wizard.members.length < parseInt(wizard.selectedGame.team_size) && (
                         <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest text-center mb-3 animate-pulse">Add {parseInt(wizard.selectedGame.team_size) - wizard.members.length} more friend(s) to unlock</p>
                       )}
                       <button onClick={() => setWizard(p => ({...p, step: 4}))} disabled={wizard.members.length !== parseInt(wizard.selectedGame.team_size) || !wizard.teamName.trim() || !!wizard.teamNameError} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase text-[11px] tracking-widest transition-all shadow-lg active:scale-95">Next Step <ArrowRight size={16} className="inline"/></button>
                    </div>
                 </div>
               )}

               {/* STEP 4: CHECKOUT SUMMARY */}
               {wizard.step === 4 && (
                 <div className="space-y-6 animate-in slide-in-from-right-4 grow flex flex-col">
                    <div className="bg-[#1f2937]/50 rounded-2xl p-6 border border-slate-700/50 space-y-6 text-left grow">
                       <div className="flex justify-between items-start border-b border-white/5 pb-6 text-left">
                          <div><h4 className="text-[10px] font-black text-slate-500 uppercase mb-1">Review Ticket</h4><h3 className="text-2xl font-black text-white italic">{wizard.event.title}</h3></div>
                          <div className="text-right">
                            {getBaseAmount(wizard.event, wizard.selectedGame) > 0 ? <p className="text-2xl font-black text-emerald-400">₹{getDisplayAmount(wizard.event, wizard.selectedGame)}</p> : <p className="text-2xl font-black text-blue-400 uppercase">FREE</p>}
                            <p className="text-[9px] font-black text-slate-500 uppercase">Total Due</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-left">
                          <div><p className="text-[9px] font-black text-slate-500 mb-1">Category</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Layers size={14}/> {wizard.event.category}</p></div>
                          <div><p className="text-[9px] font-black text-slate-500 mb-1">Entry Type</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Users size={14}/> {wizard.entryMode}</p></div>
                          {wizard.selectedGame && <div className="col-span-2 text-left"><p className="text-[9px] font-black text-slate-500 mb-1">Game</p><p className="text-sm text-white font-bold flex items-center gap-1.5"><Gamepad2 size={14}/> {wizard.selectedGame.gameName}</p></div>}
                          {wizard.entryMode === 'Team' && <div className="col-span-2 text-left"><p className="text-[9px] font-black text-slate-500 mb-1">Team Name</p><p className="text-sm text-indigo-400 font-black uppercase bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">{wizard.teamName}</p></div>}
                       </div>
                    </div>
                    <button onClick={processFinalCheckout} disabled={wizard.processing} className="w-full py-4 mt-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl font-black uppercase text-[11px] shadow-lg active:scale-95 flex justify-center items-center gap-2">
                       {wizard.processing ? <Loader2 className="animate-spin" size={16} /> : null}
                       {wizard.processing ? "Booking Ticket..." : "Get Ticket"}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- UNIFIED TICKET VIEWER MODAL --- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white z-610 border border-white/10 transition-all"><X size={24} /></button>
          <div className="w-full max-w-[90vw] md:max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in-95 duration-300">
             
             <div className="bg-[#0f172a] rounded-[40px] border border-slate-800 p-6 md:p-8 flex flex-col w-full text-left relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                   <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-relaxed max-w-[60%]">
                      {selectedTicket.orgName} {selectedTicket.clubName ? `• ${selectedTicket.clubName}` : ''} <br/> EVENT PASS
                   </p>
                   <div className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {selectedTicket.bookingStatus?.replace('_', ' ') || 'VERIFIED'}
                   </div>
                </div>

                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-6">{selectedTicket.title}</h2>

                {selectedTicket.selectedGame && (
                   <div className="mb-4">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tournament</p>
                      <p className="text-sm font-black text-cyan-400 uppercase">{selectedTicket.selectedGame}</p>
                   </div>
                )}

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</p>
                     <p className="text-sm font-bold text-white">{selectedTicket.date}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Time</p>
                     <p className="text-sm font-bold text-white">{formatTimeRange(selectedTicket.start_time, selectedTicket.end_time)}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Venue Location</p>
                     <p className="text-sm font-bold text-white">{selectedTicket.venue}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Status</p>
                     <p className="text-sm font-black text-emerald-400 uppercase">
                       {getTicketViewerPrice(selectedTicket) > 0 ? `PAID: ₹${getTicketViewerPrice(selectedTicket)}` : 'FREE ENTRY'}
                     </p>
                   </div>
                </div>

                <div className="mb-6">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{selectedTicket.teamName ? 'Team Name' : 'Authorized Attendee'}</p>
                   <p className="text-xl font-black text-white uppercase truncate">{selectedTicket.teamName || studentName}</p>
                </div>

                {selectedTicket.teamName && selectedTicket.fullMembers && selectedTicket.fullMembers.length > 0 && (
                   <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Users size={12}/> Team Members</p>
                      <div className="space-y-1">
                        {selectedTicket.fullMembers.map((m, idx) => (
                           <p key={idx} className="text-xs font-bold text-slate-300">
                             • {m.name} {m.surname}
                             {m.email === selectedTicket.student_email && <span style={{ marginLeft: '8px', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', textTransform: 'uppercase' }}>Lead</span>}
                           </p>
                        ))}
                      </div>
                   </div>
                )}

                <div className="bg-white -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6 pt-8 relative flex flex-col items-center mt-auto shrink-0">
                   <div className="absolute top-0 left-0 w-full h-0 border-t-2 border-dashed border-slate-800" style={{ transform: 'translateY(-50%)' }}></div>
                   <div className="absolute top-0 left-0 w-4 h-4 bg-[#0a0f1d] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 bg-[#0a0f1d] rounded-full translate-x-1/2 -translate-y-1/2"></div>

                   <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] mb-4">A D M I T &nbsp; O N E</p>
                   <QRCodeCanvas value={selectedTicket.bookingId || "error"} size={140} level="H" className="mb-4" />
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket ID</p>
                   <p className="text-[9px] font-mono font-bold text-slate-900">{selectedTicket.bookingId}</p>
                   
                   <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} disabled={isDownloading} className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2">
                     {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                     {isDownloading ? "Generating..." : "Download PDF"}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE PDF LAYER */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '400px', backgroundColor: '#0a0f1d', padding: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '40px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                <div style={{ padding: '32px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: '1.5', maxWidth: '60%' }}>
                         {selectedTicket.orgName} <br/> EVENT PASS
                      </p>
                      <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
                         {selectedTicket.bookingStatus?.replace('_', ' ') || 'VERIFIED'}
                      </div>
                   </div>

                   <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '24px' }}>{selectedTicket.title}</h2>

                   {selectedTicket.selectedGame && (
                      <div style={{ marginBottom: '16px' }}>
                         <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Tournament</p>
                         <p style={{ fontSize: '16px', fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase' }}>{selectedTicket.selectedGame}</p>
                      </div>
                   )}

                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Date</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.date}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Time</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{formatTimeRange(selectedTicket.start_time, selectedTicket.end_time)}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Venue Location</p>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.venue}</p>
                      </div>
                      <div style={{ width: '40%' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Payment Status</p>
                        <p style={{ fontSize: '14px', fontWeight: '900', color: '#34d399', textTransform: 'uppercase' }}>
                           {getTicketViewerPrice(selectedTicket) > 0 ? `PAID: ₹${getTicketViewerPrice(selectedTicket)}` : 'FREE ENTRY'}
                        </p>
                      </div>
                   </div>

                   <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>{selectedTicket.teamName ? 'Team Name' : 'Authorized Attendee'}</p>
                      <p style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{selectedTicket.teamName || studentName}</p>
                   </div>

                   {selectedTicket.teamName && selectedTicket.fullMembers && selectedTicket.fullMembers.length > 0 && (
                      <div style={{ padding: '16px', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.5)', marginBottom: '24px' }}>
                         <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Official Roster</p>
                         {selectedTicket.fullMembers.map((m, idx) => (
                            <p key={idx} style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', margin: '4px 0' }}>
                              • {m.name} {m.surname}
                              {m.email === selectedTicket.student_email && <span style={{ marginLeft: '8px', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', textTransform: 'uppercase' }}>Lead</span>}
                            </p>
                         ))}
                      </div>
                   )}
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '0', borderTop: '2px dashed #94a3b8' }}></div>
                   <p style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '6px', marginBottom: '16px' }}>A D M I T   O N E</p>
                   <QRCodeCanvas value={selectedTicket.bookingId || "error"} size={140} level="H" style={{ marginBottom: '16px' }} />
                   <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Ticket ID</p>
                   <p style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>{selectedTicket.bookingId}</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FLIP CARD --- */}
      {expandedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md" onClick={() => { setExpandedEvent(null); setIsCardFlipped(false); }}>
          <button onClick={() => { setExpandedEvent(null); setIsCardFlipped(false); }} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-100">
            <X size={24} />
          </button>
          
          <div className="w-full max-w-96 h-[80vh] min-h-125 perspective-2000 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsCardFlipped(!isCardFlipped); }}>
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isCardFlipped ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT OF MODAL CARD */}
              <div className="absolute inset-0 backface-hidden bg-[#111827] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="relative h-56 shrink-0 bg-slate-900 border-b border-white/5">
                  <img src={Array.isArray(expandedEvent.images) && expandedEvent.images.length > 0 ? expandedEvent.images[0] : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-linear-to-t from-[#111827] via-transparent opacity-90"></div>
                  <div className="absolute top-4 left-4"><span className="backdrop-blur-md bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/10">{expandedEvent.orgName}</span></div>
                  <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg border border-blue-500/30 text-[9px] font-black shadow-lg"><Layers size={12}/> {expandedEvent.category || 'OTHER'}</div>
                </div>
                
                <div className="p-6 flex flex-col grow text-left">
                  <h3 className="text-2xl font-black uppercase italic text-white mb-4 line-clamp-2">{expandedEvent.title}</h3>
                  
                  {expandedClubName && (
                    <div className="inline-flex items-center gap-1.5 bg-slate-800/40 border border-white/5 py-1.5 px-3 rounded-lg mb-5 w-fit">
                        <ShieldCheck size={14} className="text-blue-400"/>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{expandedClubName}</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3 text-slate-300 text-sm font-bold uppercase"><Calendar size={16} className="text-blue-500 shrink-0"/> {expandedEvent.date}</div>
                       {expandedDisplayPrice && (
                         <div className={`px-2.5 py-1 rounded-md border text-[10px] font-black tracking-widest uppercase ${expandedDisplayPrice === 'FREE ENTRY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           {expandedDisplayPrice}
                         </div>
                       )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 text-sm font-bold uppercase"><Clock size={16} className="text-blue-500 shrink-0"/> {formatTimeRange(expandedEvent.start_time, expandedEvent.end_time)}</div>
                    <div className="flex items-center gap-3 text-slate-300 text-sm font-bold uppercase"><MapPin size={16} className="text-blue-500 shrink-0"/> <span className="truncate">{expandedEvent.venue}</span></div>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-white/5 text-center shrink-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse"><RefreshCw size={14}/> Tap anywhere to read description</p>
                  </div>
                </div>
              </div>

              {/* BACK OF MODAL CARD */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#111827] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => { e.stopPropagation(); setIsCardFlipped(false); }}>
                <div className="p-6 md:p-8 flex flex-col h-full text-left">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4 shrink-0 text-blue-400 font-black uppercase tracking-widest text-sm">
                    <FileText size={18}/> Event Description
                  </div>
                  <div className="grow overflow-y-auto custom-scrollbar pr-2 event-description text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: expandedEvent.description || "No description provided." }} />
                  <div className="mt-4 pt-4 border-t border-white/5 text-center shrink-0">
                    <button className="text-[10px] w-full py-3.5 font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"><RefreshCw size={14}/> Tap here to flip back</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {zoomedClub && (
        <div className="fixed inset-0 z-700 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setZoomedClub(null)}>
          <div className="relative animate-in zoom-in-95 duration-300 flex flex-col items-center max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedClub(null)} className="absolute -top-20 right-0 p-3 bg-white/10 rounded-full text-white border border-white/10 active:scale-90 transition-all"><X size={24} /></button>
            <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center border-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-8"><ShieldCheck size={48} className="text-blue-500" /></div>
            <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-xs mb-4 text-center">Official Club Host</p>
            <h2 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter text-center leading-none px-4 drop-shadow-2xl">{zoomedClub}</h2>
          </div>
        </div>
      )}

      <div className="sticky top-18 z-40 bg-[#0a0f1d]/80 backdrop-blur-2xl border-b border-white/5 py-4 px-4 md:px-6 shadow-xl mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 relative w-full z-40" ref={filterMenuRef}>
            <div className="relative flex-1">
              <Search className="absolute left-5 top-8 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search events..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none text-sm font-semibold text-white focus:border-blue-500/50 shadow-inner transition-all"
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
              <div className="absolute top-full right-0 mt-3 w-full sm:w-85 bg-[#111827] border border-white/10 rounded-[40px] shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95">
                 <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                       <Filter size={14} className="text-blue-500"/> Search Filters
                    </h3>
                    <button 
                       onClick={() => { setScopeFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setSelectedClubId('all'); }} 
                       className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors"
                    >
                       Reset All
                    </button>
                 </div>

                 <div className="space-y-6">
                   <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 block text-left">Event Scope</span>
                     <div className="flex flex-wrap gap-2">
                       {[{ id: 'all', label: 'All' }, { id: 'public', label: 'Public' }, { id: 'org', label: isAdminUser ? 'Universities' : 'University' }, { id: 'clubs', label: 'Clubs' }].map(tab => (
                         <button key={tab.id} onClick={() => { setScopeFilter(tab.id); setSelectedClubId('all'); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${scopeFilter === tab.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800'}`}>{tab.label}</button>
                       ))}
                     </div>
                     {scopeFilter === 'clubs' && (
                       <div className="mt-2 relative">
                          <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer">
                             <option value="all">All Available Clubs</option>
                             {availableClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                       </div>
                     )}
                   </div>

                   <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 block text-left">Category</span>
                     <div className="relative">
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-blue-500 appearance-none cursor-pointer">
                           <option value="all">All Categories</option>
                           {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                     </div>
                   </div>

                   <div>
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 block text-left">Availability</span>
                     <div className="flex flex-wrap gap-2">
                       {[{ id: 'all', label: 'All Passes' }, { id: 'available', label: 'Available' }, { id: 'Booked', label: 'Secured' }].map(s => (
                         <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${statusFilter === s.id ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800'}`}>{s.label}</button>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-left">
        <section className="space-y-10 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-3"><Zap className="text-yellow-500 fill-yellow-500" size={24}/> Event Feed</h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-white/5">{filteredEvents.length} EVENTS</span>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-[#111827]/50 rounded-[40px] border border-white/5 border-dashed"><p className="text-slate-400 font-bold text-sm text-center px-4">No events found.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500 items-stretch">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} onBook={startBookingWizard} onViewTicket={handleViewTicket} availableClubs={availableClubs} onExpand={setExpandedEvent} />
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes successPop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pingSlow { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .animate-success-pop { animation: successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }
        
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; -webkit-transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .event-description p { margin-bottom: 0.75rem; }
        .event-description strong, .event-description b { font-weight: 700; color: #ffffff; }
        .event-description em, .event-description i { font-style: italic; }
        .event-description ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #94a3b8;}
        .event-description ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; color: #94a3b8;}
      `}</style>
    </div>
  );
};

// STATIC, NON-FLIPPING GRID CARD
const EventCard = ({ event, onBook, onViewTicket, availableClubs, onExpand }) => {
  const handleShare = async (e) => {
    e.stopPropagation();
    const deepLink = `${window.location.origin}${window.location.pathname}?event=${event.id}`;
    if (navigator.share) await navigator.share({ title: event.title, url: deepLink });
    else { await navigator.clipboard.writeText(deepLink); toast.success("Copied!"); }
  };

  const displayPrice = React.useMemo(() => {
     if (event.category === 'E-Sports') return null; // NO PRICE FOR E-SPORTS
     if (event.event_type === 'free') return "FREE ENTRY";
     const base = Number(event.price || 0);
     return `₹${Number((base * 1.05).toFixed(2))}`;
  }, [event]);

  const clubName = event.club_id && availableClubs ? availableClubs.find(c => c.id === event.club_id)?.name : null;
  const glowClass = event.isCheckedIn ? 'ring-1 ring-indigo-500 shadow-indigo-500/10' : event.isFullyBooked ? 'ring-1 ring-emerald-500 shadow-emerald-500/10' : event.isPending ? 'ring-1 ring-yellow-500 shadow-yellow-500/10' : 'border border-white/5 hover:border-blue-500/30';
  
  let btnText = "Get Ticket";
  if (event.isFullyBooked) btnText = "View Pass";
  else if (event.hasAnyBooking && event.category === 'E-Sports') btnText = "Book Your Passes";
  else if (!event.isOpen) btnText = "Closed";

  return (
    <div onClick={() => onExpand(event)} className={`group flex flex-col h-full bg-[#111827]/90 backdrop-blur-md rounded-[40px] overflow-hidden border ${glowClass} hover:-translate-y-1 transition-all cursor-pointer shadow-xl relative`}>
      <div className="relative h-48 shrink-0 bg-slate-900 border-b border-white/5">
        <img src={Array.isArray(event.images) && event.images.length > 0 ? event.images[0] : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div className="absolute inset-0 bg-linear-to-t from-[#111827] via-transparent opacity-90"></div>
        <div className="absolute top-4 left-4"><span className="backdrop-blur-md bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/10">{event.orgName}</span></div>
        <div className="absolute top-4 right-4"><button onClick={handleShare} className="p-2.5 bg-black/60 hover:bg-blue-600 text-white rounded-full transition-all"><Share2 size={16}/></button></div>
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg border border-blue-500/30 text-[9px] font-black shadow-lg"><Layers size={12}/> {event.category || 'OTHER'}</div>
      </div>
      
      <div className="p-5 flex flex-col grow text-left">
        <h4 className="text-xl font-black uppercase italic text-white mb-3 line-clamp-2">{event.title}</h4>
        
        {/* BEAUTIFUL CLUB PILL BADGE */}
        {clubName && (
          <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-white/5 py-1.5 px-3 rounded-lg mb-5 w-fit">
            <ShieldCheck size={14} className="text-blue-400"/>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{clubName}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-5 text-left">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-300 text-xs font-bold uppercase"><Calendar size={14} className="text-blue-500 shrink-0"/> {event.date}</div>
              
              {/* CLEAN PRICE BADGE (HIDDEN IF E-SPORTS) */}
              {displayPrice && (
                <span className={`${displayPrice === 'FREE ENTRY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} px-2 py-0.5 rounded border text-[10px] font-black tracking-widest uppercase`}>
                  {displayPrice}
                </span>
              )}
           </div>
           <div className="flex items-center gap-2.5 text-slate-300 text-xs font-bold uppercase"><Clock size={14} className="text-blue-500 shrink-0"/> <span className="truncate">{formatTimeRange(event.start_time, event.end_time)}</span></div>
           <div className="flex items-center gap-2.5 text-slate-300 text-xs font-bold uppercase"><MapPin size={14} className="text-blue-500 shrink-0"/> <span className="truncate">{event.venue}</span></div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 w-full shrink-0">
          <button disabled={(event.isSoldOut && !event.hasAnyBooking) || (!event.isOpen && !event.hasAnyBooking) || event.isPending} onClick={(e) => { e.stopPropagation(); if (event.isFullyBooked || (event.hasAnyBooking && event.category !== 'E-Sports')) onViewTicket(event); else onBook(e, event); }} className={`w-full py-3.5 sm:py-4 rounded-xl font-black uppercase text-[10px] sm:text-xs transition-all tracking-widest shadow-lg ${event.isCheckedIn ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : event.isFullyBooked ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10' : event.hasAnyBooking && event.category === 'E-Sports' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30' : event.isPending ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30' : !event.isOpen ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 active:scale-95'}`}>{btnText}</button>
        </div>
      </div>
    </div>
  );
};

export default EventList;