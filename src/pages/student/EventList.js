import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Calendar, Clock, Search, Zap, 
  CheckCircle, MapPin, Timer, 
  ChevronLeft, ChevronRight, X, Loader2, Ticket, ShieldCheck,
  CreditCard, Fingerprint, Download, Globe, Lock, ChevronDown
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

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [selectedClubId, setSelectedClubId] = useState('all');
  
  const [studentName, setStudentName] = useState("");
  const [userOrgId, setUserOrgId] = useState(null);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  const [poppedEvent, setPoppedEvent] = useState(null);
  const [isClosing, setIsClosing] = useState(false); 
  const [now, setNow] = useState(new Date());

  const [paymentModal, setPaymentModal] = useState({ open: false, event: null });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  // CUSTOM DROPDOWN REFS & STATE
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const clubDropdownRef = useRef(null);

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  // Handle clicking outside the custom dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(event.target)) {
        setIsClubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userDomain = '';
      let isSuper = false;
      
      if (user) {
        const { data: profile } = await supabase.from('students').select('name, surname').eq('email', user.email).single();
        if (profile) setStudentName(`${profile.name || 'Student'} ${profile.surname || ''}`);
        userDomain = '@' + user.email.split('@')[1]; 
        
        const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
        isSuper = adminEmails.includes(user.email);
        setIsAdminUser(isSuper);
      }

      const currentIso = now.toISOString();

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .gte('reg_end_timestamp', currentIso) 
        .order('date', { ascending: true });

      if (eventError) throw eventError;

      const { data: orgData } = await supabase.from('organizations').select('id, domain');
      
      const orgMap = {};
      let myOrgId = null;
      if (orgData) {
        orgData.forEach(org => { 
          orgMap[org.id] = org.domain; 
          if (org.domain === userDomain) myOrgId = org.id;
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

      const visibleEvents = (eventData || []).filter(event => {
        if (isSuper) return true; 
        if (event.is_open_to_all) return true; 
        const eventOrgDomain = orgMap[event.org_id];
        return eventOrgDomain && eventOrgDomain === userDomain;
      });

      const { data: bookingData } = await supabase.from('bookings').select('id, event_id, student_email, status');

      const eventsWithMeta = visibleEvents.map(event => {
        const eventBookings = bookingData?.filter(b => b.event_id === event.id) || [];
        const startTime = new Date(event.reg_start_timestamp);
        const userBooking = user ? eventBookings.find(b => b.student_email === user.email) : null;
        
        return {
          ...event,
          bookingId: userBooking?.id,
          bookingStatus: userBooking?.status,
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          isBooked: !!userBooking && ['confirmed', 'verified'].includes(userBooking.status),
          isPending: userBooking?.status === 'pending',
          isCheckedIn: userBooking?.status === 'checked_in',
          hasAnyBooking: !!userBooking,
          isOpen: now >= startTime
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

  const getDisplayAmount = (ticket) => {
    if (ticket.event_type === 'paid') {
      const ticketFee = Number(ticket.price || 0);
      const platformFee = 5;
      const gatewayFee = Number(((ticketFee + platformFee) * 0.025).toFixed(2));
      return (ticketFee + platformFee + gatewayFee).toFixed(2);
    }
    return "0.00";
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('m')) return timeStr; 
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedH = h < 10 ? `0${h}` : h;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  const downloadPDF = async () => {
    if (!printRef.current || !selectedTicket) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating Secure PDF Pass...");
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#0a0f1d', windowWidth: 794, logging: false });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'px', [794, 1123]);
      pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123);
      pdf.save(`NexusCircle_Ticket_${selectedTicket.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (error) {
      console.error("PDF Gen Error:", error);
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBook = async (e, event) => {
    e.stopPropagation(); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login Required");

    if (!event.isOpen) return toast.error("Registration not yet open!");
    if (event.hasAnyBooking) return toast.error("Ticket already secured!");
    if (event.isSoldOut) return toast.error("Event is Sold Out!");

    if (event.event_type === 'paid') {
      setPaymentModal({ open: true, event: event });
      return;
    }

    const { data, error } = await supabase.from('bookings').insert([{
      event_id: event.id,
      student_email: user.email,
      status: 'confirmed'
    }]).select().single();

    if (!error) {
      setPaymentSuccess(true);
      fetchEvents(); 
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedTicket({ ...event, bookingId: data.id, bookingStatus: 'confirmed' });
        setTimeout(() => setIsFlipping(true), 300);
      }, 3500);
    } else {
      console.error("Booking Error:", error);
      toast.error("Booking failed. Please contact the administrator.");
    }
  };

  const processRazorpayCheckout = async () => {
    setProcessingPayment(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session lost.");

      const ticketFee = Number(paymentModal.event.price || 0);
      const platformFee = 5;
      const gatewayFee = Number(((ticketFee + platformFee) * 0.025).toFixed(2));
      const totalAmount = Number((ticketFee + platformFee + gatewayFee).toFixed(2));

      const res = await loadRazorpayScript();
      if (!res) throw new Error("Razorpay SDK failed to load. Are you online?");

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { event_id: paymentModal.event.id, amount: totalAmount }
      });

      if (orderError || !orderData) throw new Error("Failed to initialize order with server.");

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, 
        amount: orderData.amount, 
        currency: "INR",
        name: "Nexus Circle", 
        description: `Ticket for ${paymentModal.event.title}`,
        order_id: orderData.id, 
        config: { display: { blocks: { upi: { name: "Pay via UPI", instruments: [{ method: "upi", flows: ["intent"] }, { method: "upi", flows: ["qr"] }] } }, sequence: ["block.upi", "block.cards", "block.wallets"] } },
        handler: async function (response) {
          const { data, error: bookingError } = await supabase.from('bookings').insert([{
            event_id: paymentModal.event.id,
            student_email: user.email,
            status: 'verified',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          }]).select().single();

          if (!bookingError) {
            setPaymentModal({ open: false, event: null });
            setPaymentSuccess(true);
            fetchEvents();
            
            setTimeout(() => {
              setPaymentSuccess(false);
              setSelectedTicket({ ...paymentModal.event, bookingId: data.id, bookingStatus: 'verified' });
              setTimeout(() => setIsFlipping(true), 300);
            }, 3500); 
            
          } else {
            console.error("Booking Finalization Error:", bookingError);
            toast.error("Payment received, but ticket generation failed. Contact Admin.");
          }
        },
        prefill: { email: user.email },
        theme: { color: "#2563eb" } 
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) { 
        console.error("Razorpay Error:", response.error);
        toast.error("Payment Failed. Please verify your details and try again."); 
      });
      paymentObject.open();

    } catch (error) {
      console.error("Checkout Initialization Error:", error);
      toast.error("Could not initiate payment. Please contact the administrator.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleViewTicket = (eventObj) => {
    setSelectedTicket(eventObj);
    setIsFlipping(false);
    setTimeout(() => setIsFlipping(true), 300);
  };

  const closePoppedEvent = () => {
    setIsClosing(true); 
    setTimeout(() => {
      setPoppedEvent(null); 
      setIsClosing(false);  
    }, 400); 
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.school && e.school.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'available' ? !e.hasAnyBooking : e.hasAnyBooking);
    
    let matchesScope = true;
    if (scopeFilter === 'public') {
       matchesScope = e.is_open_to_all === true;
    } else if (scopeFilter === 'org') {
       matchesScope = isAdminUser ? !e.is_open_to_all : e.org_id === userOrgId;
    } else if (scopeFilter === 'clubs') {
       if (selectedClubId === 'all') {
          matchesScope = isAdminUser ? !!e.club_id : (e.org_id === userOrgId && !!e.club_id);
       } else {
          matchesScope = e.club_id === selectedClubId;
       }
    }
    return matchesSearch && matchesStatus && matchesScope;
  });

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white selection:bg-blue-500/30 relative pb-24">
      
      {/* CELEBRATION OVERLAY */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-500 flex items-center justify-center bg-[#0a0f1d] overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-75 md:h-75 bg-emerald-500/20 rounded-full animate-ping-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-125 md:h-125 bg-emerald-500/10 rounded-full animate-ping-slow" style={{ animationDelay: '0.2s' }}></div>
          
          <div className="relative z-10 flex flex-col items-center animate-success-pop px-4">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-emerald-500 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] md:shadow-[0_0_80px_rgba(16,185,129,0.8)] border-4 border-emerald-400 shrink-0">
              <CheckCircle size={40} className="text-white md:w-15 md:h-15" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-widest mb-4 text-center drop-shadow-lg leading-tight">
              Ticket Confirmed!
            </h1>
            <div className="flex items-center gap-2 md:gap-3 bg-white/10 px-4 md:px-6 py-2.5 md:py-3 rounded-full backdrop-blur-md border border-white/20">
              <Loader2 className="animate-spin text-emerald-400 w-4 h-4 md:w-5 md:h-5" />
              <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs md:text-sm">Generating Digital Pass...</p>
            </div>
          </div>
        </div>
      )}

      {/* --- STICKY FILTER BAR --- */}
      <div className="sticky top-18 z-40 bg-[#0a0f1d]/80 backdrop-blur-2xl border-b border-white/5 py-4 px-4 md:px-6 shadow-xl mb-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search events, universities, or clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none text-sm font-semibold tracking-wide text-white placeholder-slate-400 focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center w-full">
            
            {/* Event Type Filters */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Event Type</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Events' },
                  { id: 'public', label: 'Public' },
                  { id: 'org', label: isAdminUser ? 'All Universities' : 'Only University' },
                  { id: 'clubs', label: 'Only Clubs' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setScopeFilter(tab.id); setSelectedClubId('all'); setIsClubDropdownOpen(false); }} 
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                      scopeFilter === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* CUSTOM REACT DROPDOWN FOR CLUBS */}
              {scopeFilter === 'clubs' && (
                <div className="relative w-full sm:w-64 mt-2 animate-in fade-in zoom-in-95 duration-200 z-50" ref={clubDropdownRef}>
                  <button 
                    onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-blue-600/10 border border-blue-500/30 rounded-xl outline-none focus:border-blue-500 text-blue-400 text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-colors hover:bg-blue-600/20"
                  >
                    <span className="truncate pr-4 text-left">
                      {selectedClubId === 'all' ? 'All Available Clubs' : availableClubs.find(c => c.id === selectedClubId)?.name}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isClubDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-blue-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                        <button
                          onClick={() => { setSelectedClubId('all'); setIsClubDropdownOpen(false); }}
                          className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${selectedClubId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          All Available Clubs
                        </button>
                        {availableClubs.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedClubId(c.id); setIsClubDropdownOpen(false); }}
                            className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${selectedClubId === c.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
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

            {/* Availability Filters */}
            <div className="flex flex-col gap-2 w-full lg:w-auto border-t border-white/5 lg:border-none pt-4 lg:pt-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Availability</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Passes' },
                  { id: 'available', label: 'Available' },
                  { id: 'Booked', label: 'Secured' }
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setStatusFilter(s.id)} 
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                      statusFilter === s.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- MAIN GRID CONTENT --- */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <section className="space-y-6 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-3">
              <Zap className="text-yellow-500 fill-yellow-500" size={24}/> 
              Event Feed
            </h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredEvents.length} Events</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-[#111827]/50 rounded-[2.5rem] border border-white/5 border-dashed">
               <Search size={40} className="text-slate-600 mb-4" />
               <p className="text-slate-400 font-bold tracking-wide text-sm text-center px-4">No events found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredEvents.map(event => (
                <FlipCard 
                  key={event.id} 
                  event={event} 
                  onBook={handleBook}
                  onFlip={() => setPoppedEvent(event)}
                  onViewTicket={handleViewTicket}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* TICKET MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 md:top-8 md:right-8 p-2.5 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-610 border border-white/10 shadow-xl"><X size={24} className="md:w-8 md:h-8" /></button>
          
          <div className="perspective-2000 w-[90vw] max-w-85 md:max-w-md h-120 md:h-155 cursor-pointer" onClick={() => setIsFlipping(!isFlipping)}>
            <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] md:rounded-[3.5rem] border border-blue-500/40 p-6 md:p-10 flex flex-col justify-between shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
                <div className="text-left flex flex-col h-full">
                   <div className="flex items-center justify-between mb-6 md:mb-10">
                     <div className="flex items-center gap-2 md:gap-3">
                       <ShieldCheck className="text-blue-500 w-6 h-6 md:w-7 md:h-7" />
                       <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-400 leading-tight">Event<br className="md:hidden"/> Ticket</p>
                     </div>
                     <div className={`px-3 py-1.5 rounded-lg border text-[9px] md:text-[10px] font-black uppercase tracking-widest ${selectedTicket.bookingStatus === 'checked_in' ? 'text-green-500 border-green-500/20' : 'text-blue-500 border-blue-500/20'}`}>
                       {(selectedTicket.bookingStatus || 'Verified').replace('_', ' ')}
                     </div>
                   </div>
                   <h4 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6 md:mb-12 text-white italic line-clamp-3">
                     {selectedTicket.title}
                   </h4>
                   <div className="space-y-4 md:space-y-6 grow">
                      <div className="flex items-center gap-3 md:gap-5">
                        <Calendar className="text-blue-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                        <div>
                          <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Valid For</p>
                          <p className="text-sm md:text-xl font-bold leading-none text-slate-200">{selectedTicket.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:gap-5">
                        <Clock className="text-blue-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                        <div>
                          <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Event Time</p>
                          <p className="text-sm md:text-xl font-bold leading-none text-slate-200">{formatTime(selectedTicket.start_time)} — {selectedTicket.end_time ? formatTime(selectedTicket.end_time) : 'End'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:gap-5">
                        <MapPin className="text-blue-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Venue Location</p>
                          <p className="text-sm md:text-xl font-bold truncate leading-none text-slate-200">{selectedTicket.venue}</p>
                        </div>
                      </div>
                      {selectedTicket.event_type === 'paid' && (
                        <div className="flex items-center gap-3 md:gap-5">
                          <CreditCard className="text-emerald-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                          <div>
                            <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Amount Paid</p>
                            <p className="text-sm md:text-xl font-bold text-emerald-400 leading-none">₹{getDisplayAmount(selectedTicket)}</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
                <div className="flex flex-col items-center gap-4 pt-4 md:py-6 border-t border-white/5 mt-auto">
                  <p className="text-blue-500 font-bold text-[9px] md:text-[11px] uppercase tracking-widest animate-pulse">Tap Card to View Entry QR</p>
                </div>
              </div>

              {/* BACK */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col items-center p-6 md:p-8 text-slate-900">
                <div className="text-center mb-4 md:mb-6 mt-2 md:mt-0">
                  <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Attendee</p>
                  <h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-blue-600 italic line-clamp-1">{studentName}</h4>
                </div>
                <div className="bg-[#f8fafc] p-4 md:p-6 rounded-4xl border-2 border-slate-100 mb-4 md:mb-6 flex items-center justify-center">
                  <div className="scale-75 md:scale-100 origin-center flex items-center justify-center">
                     <QRCodeCanvas value={selectedTicket.bookingId || "error"} size={200} level="H" />
                  </div>
                </div>
                <div className="w-full space-y-3 md:space-y-4">
                  <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-between">
                    <p className="font-mono text-[10px] md:text-xs text-slate-500 font-bold truncate mr-2">ID: {selectedTicket.bookingId}</p>
                    <Fingerprint className="text-blue-500 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-widest hover:bg-blue-700 transition-all z-50">
                    {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
                <p className="mt-auto pt-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Tap anywhere to flip back</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT SPEC POP-OUT */}
      {poppedEvent && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md" onClick={closePoppedEvent}>
          <div className={`relative w-[95%] sm:w-full max-w-2xl max-h-[90vh] bg-[#1e293b] rounded-3xl md:rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] p-5 md:p-10 flex flex-col overflow-hidden ${isClosing ? 'animate-flip-pop-out' : 'animate-flip-pop'}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={closePoppedEvent} className="absolute top-4 right-4 md:top-5 md:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors z-10">
              <X size={20} className="md:w-6 md:h-6" />
            </button>
            <h4 className="text-xs md:text-sm font-black text-blue-400 uppercase tracking-widest mb-4 md:mb-5 flex items-center gap-2 border-b border-white/10 pb-3 md:pb-4 pr-8">
              <Zap size={16} className="md:w-4 md:h-4" /> Event Details
            </h4>
            <div className="grow overflow-y-auto custom-scrollbar pr-2 md:pr-3">
              <div className="event-description text-slate-300 text-sm md:text-base leading-relaxed md:leading-[1.8] font-normal text-left tracking-wide" dangerouslySetInnerHTML={{ __html: poppedEvent.description }} />
            </div>
            <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t border-white/5 flex justify-center shrink-0">
               <button onClick={closePoppedEvent} className="px-6 py-2.5 md:px-8 md:py-3 bg-slate-800 hover:bg-blue-600 text-white rounded-lg md:rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentModal.open && paymentModal.event && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl flex flex-col md:flex-row w-full max-w-4xl max-h-[95vh] md:max-h-[85vh] overflow-hidden shadow-[0_0_60px_rgba(37,99,235,0.15)] relative">
            <button onClick={() => setPaymentModal({ open: false, event: null })} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors z-250">
              <X size={20} />
            </button>
            {(() => {
              const ticketFee = Number(paymentModal.event.price || 0);
              const platformFee = 5;
              const gatewayFee = Number(((ticketFee + platformFee) * 0.025).toFixed(2));
              const totalAmount = Number((ticketFee + platformFee + gatewayFee).toFixed(2));
              return (
                <>
                  <div className="bg-[#050810] w-full md:w-96 p-8 md:p-10 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
                    <div className="mb-8 mt-4 md:mt-0">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-5 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Ticket size={24} />
                      </div>
                      <p className="text-slate-400 text-sm font-medium mb-1 line-clamp-1">{paymentModal.event.title}</p>
                      <h2 className="text-4xl font-semibold text-white tracking-tight">₹{totalAmount.toFixed(2)}</h2>
                    </div>
                    <div className="space-y-4 text-sm mb-6 md:mt-auto">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Order Summary</h4>
                      <div className="flex justify-between text-slate-400"><span>Ticket Fee</span><span className="text-slate-200 font-medium">₹{ticketFee.toFixed(2)}</span></div>
                      <div className="flex justify-between text-slate-400"><span>Platform Fee</span><span className="text-slate-200 font-medium">₹{platformFee.toFixed(2)}</span></div>
                      <div className="flex justify-between text-slate-400"><span>Razorpay Fee (2.5%)</span><span className="text-slate-200 font-medium">₹{gatewayFee.toFixed(2)}</span></div>
                      <div className="pt-5 mt-3 border-t border-slate-800 flex justify-between items-center text-white font-bold text-lg">
                        <span>Total Due</span><span className="text-blue-400">₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-8 md:p-12 bg-[#111827] flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 relative z-10">
                      <ShieldCheck size={36} className="text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Secure Checkout</h3>
                    <p className="text-slate-400 text-sm mb-10 max-w-sm leading-relaxed relative z-10">
                      Review your summary. When you are ready, you will be securely redirected to Razorpay to complete your transaction.
                    </p>
                    <button onClick={processRazorpayCheckout} disabled={processingPayment} className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 flex items-center justify-center gap-3 relative z-10">
                      {processingPayment ? <Loader2 className="animate-spin" size={18}/> : null}
                      {processingPayment ? "Initializing Gateway..." : `Pay ₹${totalAmount.toFixed(2)} Now`}
                    </button>
                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest relative z-10 opacity-70">
                      Payments Secured by <span className="text-slate-300">Razorpay</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE PDF LAYER */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '794px', height: '1123px', backgroundColor: '#0a0f1d', padding: '40px', boxSizing: 'border-box' }}>
            <div style={{ width: '714px', height: '1043px', border: '4px solid #3b82f6', borderRadius: '32px', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1d', boxSizing: 'border-box' }}>
              <div style={{ flex: '0 0 auto', padding: '50px 60px 30px 60px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                   <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '3px', textTransform: 'uppercase' }}>
                     {selectedTicket.school || 'EVENT'} • EVENT TICKET
                   </p>
                   <div style={{ backgroundColor: '#1e293b', color: '#3b82f6', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', border: '1px solid rgba(59,130,246,0.3)' }}>VERIFIED ACCESS</div>
                 </div>
                 <div style={{ marginBottom: '30px', width: '100%' }}>
                   <h1 style={{ margin: 0, fontSize: selectedTicket.title.length > 30 ? '34px' : '48px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: '38px', wordWrap: 'break-word', display: 'block' }}>{selectedTicket.title}</h1>
                 </div>
                 <div style={{ display: 'flex', marginBottom: '25px', gap: '40px' }}>
                   <div style={{ flex: 1 }}>
                     <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Date</p>
                     <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.date}</p>
                   </div>
                   <div style={{ flex: 1 }}>
                     <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Time</p>
                     <p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{formatTime(selectedTicket.start_time)} - {selectedTicket.end_time ? formatTime(selectedTicket.end_time) : 'End'}</p>
                   </div>
                 </div>
                 <div style={{ display: 'flex', marginBottom: '30px', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Venue</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.venue}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Payment</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: selectedTicket.event_type === 'paid' ? '#10b981' : '#3b82f6' }}>{selectedTicket.event_type === 'paid' ? `PAID ₹${getDisplayAmount(selectedTicket)}` : 'FREE TICKET'}</p>
                    </div>
                 </div>
                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Attendee</p>
                    <p style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{studentName}</p>
                 </div>
              </div>
              <div style={{ height: '0', borderBottom: '4px dashed #3b82f6', margin: '0 40px' }}></div>
              <div style={{ flex: '1 1 auto', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}>
                 <p style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900', color: '#0a0f1d', textTransform: 'uppercase', letterSpacing: '8px' }}>ADMIT ONE</p>
                 <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '15px', border: '1px solid #e2e8f0' }}><QRCodeCanvas value={selectedTicket.bookingId || "error"} size={170} level="H" /></div>
                 <div style={{ marginTop: '10px', textAlign: 'center' }}>
                   <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Booking ID</p>
                   <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#0a0f1d', fontFamily: 'monospace' }}>{selectedTicket.bookingId}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flipPop {
          0% { transform: perspective(2000px) scale(0.8) rotateY(-90deg); opacity: 0; }
          100% { transform: perspective(2000px) scale(1) rotateY(0deg); opacity: 1; }
        }
        @keyframes flipPopOut {
          0% { transform: perspective(2000px) scale(1) rotateY(0deg); opacity: 1; }
          100% { transform: perspective(2000px) scale(0.8) rotateY(90deg); opacity: 0; }
        }
        @keyframes successPop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pingSlow {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        .animate-flip-pop { animation: flipPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-flip-pop-out { animation: flipPopOut 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards; }
        .animate-success-pop { animation: successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }

        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; } 
        
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }

        .event-description p { margin-bottom: 1rem; }
        .event-description p:last-child { margin-bottom: 0; }
        .event-description strong, .event-description b { font-weight: 700; color: #ffffff; }
        .event-description em, .event-description i { font-style: italic; }
        .event-description ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .event-description ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .event-description h1, .event-description h2, .event-description h3 { font-weight: 800; color: #ffffff; margin-top: 1.5rem; margin-bottom: 0.5rem; line-height: 1.2; }
        .event-description a { color: #60a5fa; text-decoration: underline; transition: color 0.2s; }
        .event-description a:hover { color: #3b82f6; }
      `}</style>
    </div>
  );
};

// --- REDESIGNED SLEEK CARD COMPONENT ---
const FlipCard = ({ event, onBook, onFlip, onViewTicket }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const defaultImages = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800"
  ];
  const images = Array.isArray(event.images) && event.images.length > 0 ? event.images : defaultImages;

  const nextImage = (e) => { e.stopPropagation(); setCurrentImgIndex(p => p === images.length - 1 ? 0 : p + 1); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImgIndex(p => p === 0 ? images.length - 1 : p - 1); };

  const glowClass = event.isCheckedIn ? 'ring-1 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                  : event.isBooked ? 'ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                  : event.isPending ? 'ring-1 ring-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                  : 'border border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]';

  const getTimeRemaining = () => {
    const diff = new Date(event.reg_start_timestamp) - new Date();
    if (diff <= 0) return "Opening...";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTimeShort = (isoString) => {
    if (!isoString) return 'TBA';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('m')) return timeStr; 
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  return (
    <div 
      onClick={onFlip} 
      className={`group relative bg-[#111827] rounded-3xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 border border-transparent ${glowClass} hover:-translate-y-1`}
    >
      {/* Edge-to-Edge Image Header */}
      <div className="relative w-full h-48 sm:h-52 shrink-0 bg-slate-900 group/slider overflow-hidden border-b border-white/5">
        <img 
          src={images[currentImgIndex]} 
          alt="Event Cover" 
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#111827] via-transparent to-transparent opacity-90 pointer-events-none"></div>
        
        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
          <span className="backdrop-blur-md bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10 shadow-lg truncate max-w-50">
            {event.school}
          </span>
          {event.is_open_to_all ? (
            <span className="backdrop-blur-md bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1 shadow-lg">
              <Globe size={10}/> Public
            </span>
          ) : (
            <span className="backdrop-blur-md bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-1 shadow-lg">
              <Lock size={10}/> Internal
            </span>
          )}
        </div>

        {event.event_type === 'paid' && (
          <div className="absolute top-3 right-3 backdrop-blur-md bg-blue-600/90 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30">
            ₹{event.price}
          </div>
        )}

        {/* Carousel Controls */}
        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover/slider:opacity-100 transition-all backdrop-blur-sm shadow-lg">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover/slider:opacity-100 transition-all backdrop-blur-sm shadow-lg">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImgIndex ? 'bg-blue-500 w-5' : 'bg-white/40 w-1.5'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 md:p-6 flex flex-col grow relative z-10">
        <h3 className="text-xl font-black uppercase italic leading-tight line-clamp-2 text-white mb-5">
          {event.title}
        </h3>
        
        <div className="flex flex-col gap-3 mb-6 shrink-0">
          <div className="flex items-center gap-3 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Calendar size={14} className="text-blue-500"/></div>
            {event.date}
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Clock size={14} className="text-blue-500"/></div>
            {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><MapPin size={14} className="text-blue-500"/></div>
            <span className="truncate pr-2">{event.venue}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 w-full">
          
          {/* Subtle Reg Timeline */}
          {!event.isBooked && !event.isCheckedIn && !event.isPending && (
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
              <span className="flex items-center gap-1.5"><Timer size={10}/> {event.isOpen ? 'Reg Closes' : 'Reg Opens'}</span>
              <span className="text-slate-300">{event.isOpen ? formatDateTimeShort(event.reg_end_timestamp) : formatDateTimeShort(event.reg_start_timestamp)}</span>
            </div>
          )}

          <button 
            disabled={(event.isSoldOut && !event.hasAnyBooking) || (!event.isOpen && !event.hasAnyBooking) || event.isPending}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (event.isBooked || event.isCheckedIn) onViewTicket(event);
              else onBook(e, event); 
            }}
            className={`w-full py-4 rounded-xl font-black uppercase text-xs transition-all tracking-widest shrink-0 flex items-center justify-center gap-2 ${
              event.isCheckedIn ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30' :
              event.isBooked ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30' : 
              event.isPending ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30' :
              !event.isOpen ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
              'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95'
            }`}
          >
            {event.isCheckedIn ? <><CheckCircle size={16}/> Checked In</> : 
             event.isBooked ? <><CheckCircle size={16}/> View Ticket</> : 
             event.isPending ? <><Loader2 size={16} className="animate-spin"/> Verifying</> : 
             !event.isOpen ? `Opens in ${getTimeRemaining()}` : 
             "Get Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventList;