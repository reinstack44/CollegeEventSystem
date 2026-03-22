import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Calendar, Clock, Search, Zap, 
  CheckCircle, MapPin, Timer, Info,
  ChevronLeft, ChevronRight, Ticket, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flippedCards, setFlippedCards] = useState({});
  const [now, setNow] = useState(new Date());

  // Payment Gateway State
  const [paymentModal, setPaymentModal] = useState({ open: false, event: null });
  const [assignedPrice, setAssignedPrice] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualUtr, setManualUtr] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentIso = now.toISOString();

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .gte('reg_end_timestamp', currentIso) 
        .order('date', { ascending: true });

      if (eventError) throw eventError;

      const { data: bookingData } = await supabase.from('bookings').select('event_id, student_email, status');

      const eventsWithMeta = (eventData || []).map(event => {
        const eventBookings = bookingData?.filter(b => b.event_id === event.id) || [];
        const startTime = new Date(event.reg_start_timestamp);
        
        const isBooked = user && eventBookings.some(b => b.student_email === user.email && (b.status === 'confirmed' || b.status === 'verified'));
        const isPending = user && eventBookings.some(b => b.student_email === user.email && b.status === 'pending');

        return {
          ...event,
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          isBooked: isBooked,
          isPending: isPending,
          isOpen: now >= startTime
        };
      });

      setEvents(eventsWithMeta);
    } catch (error) {
      toast.error("Discovery Failed");
    } finally {
      setLoading(false);
    }
  }, [now]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- BULLETPROOF PAYMENT POLLING ---
  useEffect(() => {
    let pollTimer;
    
    const checkPaymentStatus = async () => {
      if (!paymentModal.open || !paymentModal.event || isVerified) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('bookings')
          .select('status')
          .eq('event_id', paymentModal.event.id)
          .eq('student_email', user.email)
          .single();

        if (data && data.status === 'verified') {
          setIsVerified(true);
          toast.success("Payment Received! Pass Issued.");
          fetchEvents();
          clearInterval(pollTimer);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    if (paymentModal.open && assignedPrice && !isVerified) {
      pollTimer = setInterval(checkPaymentStatus, 3000);
    }

    return () => clearInterval(pollTimer);
  }, [paymentModal, assignedPrice, isVerified, fetchEvents]);

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const listenForVerification = (eventId, studentEmail) => {
    const channel = supabase
      .channel(`payment_listener_${studentEmail}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          if (
            String(payload.new.event_id) === String(eventId) && 
            payload.new.student_email === studentEmail && 
            payload.new.status === 'verified'
          ) {
            setIsVerified(true);
            toast.success("Payment Received! Pass Issued.");
            fetchEvents(); 
            supabase.removeChannel(channel); 
          }
        }
      )
      .subscribe();
  };

  const handleBook = async (e, event) => {
    e.stopPropagation(); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login Required");

    if (!event.isOpen) return toast.error("Registration not yet open!");
    if (event.isBooked) return toast.error("Identity already secured!");
    if (event.isSoldOut) return toast.error("Deployment Full: Sold Out!");

    if (event.event_type === 'paid') {
      if (event.isPending) return toast.error("You have a pending transaction. Please wait.");

      setPaymentModal({ open: true, event: event });
      setAssignedPrice(null);
      setIsVerified(false);
      setShowManual(false);
      setManualUtr('');
      setShowQR(false); 

      const PLATFORM_FEE = 10;
      const totalBasePrice = event.price + PLATFORM_FEE; 

      const { data: uniquePrice, error } = await supabase.rpc('assign_unique_price', {
        p_event_id: event.id,
        p_student_email: user.email,
        p_base_price: totalBasePrice 
      });

      if (error) {
        toast.error(error.message || "High traffic. Try again later.");
        setPaymentModal({ open: false, event: null });
        return;
      }

      setAssignedPrice(uniquePrice);
      listenForVerification(event.id, user.email);
      return;
    }

    const { error } = await supabase.from('bookings').insert([{
      event_id: event.id,
      student_email: user.email,
      status: 'confirmed'
    }]);

    if (!error) {
      toast.success("Pass Secured!");
      fetchEvents(); 
    } else {
      toast.error("Booking failed: " + error.message);
    }
  };

  const handleManualSubmit = async () => {
    if (manualUtr.length !== 12) return toast.error("Invalid UTR. Must be 12 digits.");
    setSubmittingManual(true);
    
    try {
      const { error } = await supabase.from('bookings')
        .update({ utr_number: manualUtr })
        .match({ 
          event_id: paymentModal.event.id, 
          amount_expected: assignedPrice, 
          status: 'pending' 
        });
      
      if (error) throw error;
      
      toast.success("UTR Submitted! Admin will verify shortly.");
      setPaymentModal({ open: false, event: null });
      fetchEvents();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = statusFilter === 'all' || (statusFilter === 'available' ? !e.isBooked : e.isBooked);
    return matchesSearch && matchesStatus;
  });

  // --- SMART UPI LINK GENERATOR ---
  const generateUpiUrl = () => {
    if (!paymentModal.event || !assignedPrice) return '';
    // A single word without spaces is safer for some apps
    const cleanPayeeName = "ActiveArch"; 
    // Format strictly to 2 decimal places
    const safeAmount = Number(assignedPrice).toFixed(2);
    // Add a Transaction Reference (tr) which strict banks require for Merchant payments
    const tr = `TRX${Date.now()}`;
    return `upi://pay?pa=${paymentModal.event.merchant_upi}&pn=${cleanPayeeName}&tr=${tr}&am=${safeAmount}&cu=INR`;
  };

  // --- SMART BUTTON CLICK HANDLER ---
  const handleUpiClick = (e) => {
    e.preventDefault();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = generateUpiUrl();
    } else {
      setShowQR(true);
      toast("UPI Apps are only on phones. Please scan the QR code.", {
        icon: '📱',
        style: { borderRadius: '10px', background: '#1f2937', color: '#fff' }
      });
    }
  };

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 md:p-6 pb-24 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header & Search */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#111827]/90 backdrop-blur-xl p-3 rounded-4xl border border-white/5 shadow-2xl">
            <div className="relative w-full text-left">
              <Search className="absolute left-6 top-9 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text"
                placeholder="SEARCH Events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-[#1f2937]/50 border-none rounded-3xl outline-none text-sm font-black tracking-widest uppercase"
              />
            </div>
          </div>

          <div className="flex justify-center w-full">
            <div className="bg-white rounded-2xl px-20 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-white/10 flex items-center justify-center">
              <img src="/adypu logo.png" alt="ADYPU Logo" className="h-10 md:h-12 object-contain" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-[#111827] border border-white/5 rounded-2xl w-fit self-center md:self-start">
            {['all', 'available', 'Booked'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <section className="space-y-8 text-left">
          <h2 className="text-2xl font-black uppercase italic flex items-center gap-3"><Zap className="text-yellow-500 fill-yellow-500" size={24}/> Registrations Open</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map(event => (
              <FlipCard 
                key={event.id} 
                event={event} 
                onBook={handleBook}
                isFlipped={flippedCards[event.id]} 
                onFlip={() => toggleFlip(event.id)} 
              />
            ))}
          </div>
        </section>
      </div>

      {/* RESTORED CYBERPUNK PAYMENT MODAL */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-[#0a0f1d]/80 backdrop-blur-xl">
          
          <div className="bg-[#111827] border-2 border-emerald-500/30 rounded-4xl p-6 sm:p-8 w-full max-w-110 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] relative flex flex-col my-auto">
            
            <button 
              onClick={() => {
                setPaymentModal({ open: false, event: null });
                fetchEvents();
              }} 
              className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-colors border border-white/5 z-50"
            >
              <X size={18} />
            </button>

            {!assignedPrice ? (
              <div className="flex flex-col items-center justify-center py-16 gap-5">
                 <Zap className="animate-pulse text-emerald-500 fill-emerald-500/20" size={48} />
                 <p className="text-emerald-400 font-black uppercase tracking-widest text-xs animate-pulse">Establishing Secure Gateway...</p>
              </div>
            ) : isVerified ? (
              <div className="flex flex-col items-center text-center gap-6 py-12 animate-in zoom-in duration-500">
                 <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                   <CheckCircle size={48} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-3xl sm:text-4xl font-black uppercase italic text-white tracking-tight">Payment Completed</h3>
                   <p className="text-slate-400 font-bold tracking-widest text-[11px] sm:text-xs">Your pass is secured in your pass vault.</p>
                 </div>
                 <button onClick={() => {
                    setPaymentModal({open: false, event: null});
                    window.location.href = `/student/tickets#ticket-${paymentModal.event.id}`;
                 }} className="w-full mt-4 py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95">
                   View Your Ticket
                 </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-5 sm:gap-6 mt-2 sm:mt-4">
                
                <div className="w-full bg-[#1f2937]/80 backdrop-blur-sm rounded-4xl p-5 sm:p-6 border border-slate-700/80 text-left shadow-inner">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
                    <Ticket size={14} className="text-slate-500"/> Transaction Breakdown
                  </h4>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-300">
                      <span>Event Ticket Price</span>
                      <span className="text-white">₹{paymentModal.event.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-300">
                      <span>Transaction Fee</span>
                      <span className="text-white">₹10</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">
                      <span>Platform Fee</span>
                      <span>+ ₹{(assignedPrice - paymentModal.event.price - 10).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end text-3xl sm:text-4xl font-black text-emerald-400 border-t border-slate-700 pt-5 mt-5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Total Payable</span>
                    <span className="tracking-tighter">₹{assignedPrice}</span>
                  </div>
                </div>

                <p className="text-[9px] text-red-400/90 uppercase font-black tracking-[0.2em] px-2 leading-relaxed">
                  Do not change the decimal amount.<br className="hidden sm:block"/> It verifies your transaction.
                </p>

                <div className="w-full space-y-3 mt-2">
                  <button 
                    onClick={handleUpiClick}
                    className="w-full flex items-center justify-center gap-3 py-4 sm:py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_10px_25px_rgba(16,185,129,0.25)] active:scale-95"
                  >
                    <Zap size={18} className="fill-white" />
                    Tap to Pay via UPI App
                  </button>
                  
                  <button 
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-center py-3.5 bg-[#1f2937]/50 hover:bg-[#1f2937] text-slate-300 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border border-slate-700/50"
                  >
                    {showQR ? "Hide QR Code" : "Using a PC? Click to Show QR Code"}
                  </button>
                </div>

                {showQR && (
                  <div className="p-4 sm:p-5 bg-white rounded-4xl shadow-2xl relative animate-in zoom-in duration-300">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generateUpiUrl())}`}
                      alt="Payment QR"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>
                )}

                <div className="w-full space-y-5 pt-5 border-t border-white/5 mt-2">
                  <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 py-3 rounded-2xl border border-emerald-500/20">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      Awaiting Bank Confirmation...
                  </div>

                  {!showManual ? (
                    <button onClick={() => setShowManual(true)} className="text-[9px] text-slate-500 hover:text-white underline uppercase font-bold tracking-widest transition-colors">
                      Paid but screen stuck? Enter UTR manually
                    </button>
                  ) : (
                    <div className="bg-[#1f2937]/80 p-4 sm:p-5 rounded-3xl border border-slate-700 text-left animate-in slide-in-from-bottom-2">
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-2.5 ml-1 tracking-widest">Enter 12-Digit UTR Number</p>
                      <input 
                        value={manualUtr}
                        onChange={(e) => setManualUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="w-full p-3.5 bg-[#0a0f1d] border border-slate-700 rounded-xl text-emerald-400 text-center font-mono text-sm tracking-[0.3em] mb-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                        placeholder="0000 0000 0000"
                      />
                      <button 
                        onClick={handleManualSubmit}
                        disabled={manualUtr.length !== 12 || submittingManual}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 py-3.5 rounded-xl text-[10px] text-white font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
                      >
                        {submittingManual ? "Submitting..." : "Submit for Verification"}
                      </button>
                    </div>
                  )}
                  
                  <button onClick={() => {
                    setPaymentModal({ open: false, event: null });
                    fetchEvents();
                  }} className="w-full text-[9px] font-black text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors pb-2">
                    Cancel Transaction
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FlipCard = ({ event, onBook, isFlipped, onFlip }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const defaultImages = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800"
  ];
  
  const images = Array.isArray(event.images) && event.images.length > 0 ? event.images : defaultImages;

  const nextImage = (e) => {
    e.stopPropagation(); 
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e.stopPropagation(); 
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const glowClass = event.isBooked 
    ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.25)]' 
    : event.isPending 
    ? 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.25)]'
    : 'border-blue-500/40 group-hover:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]';

  const getTimeRemaining = () => {
    const diff = new Date(event.reg_start_timestamp) - new Date();
    if (diff <= 0) return "Opening...";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'TBA';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' @ ' + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('m')) return timeStr; 
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedH = h < 10 ? `0${h}` : h;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  return (
    <div className="perspective-2000 h-132.5 w-full group">
      <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        <div 
          onClick={onFlip} 
          className={`absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] border-2 p-6 md:p-7 flex flex-col justify-start cursor-pointer transition-all duration-500 ${glowClass}`}
        >
          <div className="flex justify-between items-start mb-4 shrink-0">
            <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-35">{event.school}</span>
            <div className="flex items-center gap-2">
               <Info size={14} className="text-slate-500 hover:text-blue-400 transition-colors" />
               {event.isBooked ? (
                 <div className="flex items-center gap-1 text-green-500 font-black text-[8px] uppercase shrink-0"><CheckCircle size={12}/> Verified</div>
               ) : event.isPending ? (
                 <div className="flex items-center gap-1 text-yellow-500 font-black text-[8px] uppercase shrink-0 animate-pulse"><Timer size={12}/> Pending Verif.</div>
               ) : !event.isOpen && (
                 <div className="flex items-center gap-1.5 text-blue-400 font-black text-[8px] uppercase bg-blue-500/10 px-3 py-1 rounded-full shrink-0">
                   <Timer size={12}/> {getTimeRemaining()}
                 </div>
               )}
            </div>
          </div>

          <div className="relative w-full h-40 rounded-2xl overflow-hidden shrink-0 mb-4 group/slider border border-white/10 shadow-inner bg-slate-900">
            <img 
              src={images[currentImgIndex]} 
              alt="Event Visualization" 
              className="w-full h-full object-cover transition-opacity duration-500 ease-in-out"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-transparent to-transparent opacity-80 pointer-events-none"></div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
              {currentImgIndex + 1} / {images.length} IMAGES
            </div>

            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover/slider:opacity-100 transition-all backdrop-blur-sm">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover/slider:opacity-100 transition-all backdrop-blur-sm">
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImgIndex ? 'bg-blue-500 w-4' : 'bg-white/40 w-1.5'}`} />
              ))}
            </div>
          </div>

          <div className="grow flex flex-col justify-start text-left gap-3">
            <h3 className={`text-2xl font-black uppercase italic leading-[0.9] line-clamp-2 overflow-hidden shrink-0 ${event.isBooked ? 'text-green-500' : event.isPending ? 'text-yellow-500' : 'text-white'}`}>
              {event.title}
            </h3>
            
            <div className="space-y-1 shrink-0">
              <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase">
                <Calendar size={12} className="text-blue-500"/> {event.date}
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase">
                <Clock size={12} className="text-blue-500"/> 
                {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase truncate max-w-[95%]">
                <MapPin size={12} className="text-blue-500"/> {event.venue}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/50 space-y-2 shrink-0">
              <div className="flex items-center gap-2 text-blue-500 text-[9px] font-black uppercase tracking-widest justify-between">
                <span className="flex items-center gap-2"><Timer size={12}/> Registration Window</span>
                {event.event_type === 'paid' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">₹{event.price} + ₹10 Fee</span>}
              </div>
              <div className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex justify-between bg-[#111827] px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-slate-500">Opens</span>
                  <span className="text-white">{formatDateTime(event.reg_start_timestamp)}</span>
                </div>
                <div className="flex justify-between bg-[#111827] px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-slate-500">Closes</span>
                  <span className="text-white">{formatDateTime(event.reg_end_timestamp)}</span>
                </div>
              </div>
            </div>

            <button 
              disabled={event.isBooked || event.isSoldOut || !event.isOpen || event.isPending}
              onClick={(e) => { e.stopPropagation(); onBook(e, event); }}
              className={`w-full py-3.5 mt-auto rounded-2xl font-black uppercase text-[9px] transition-all tracking-widest shrink-0 ${
                event.isBooked ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 
                event.isPending ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30' :
                !event.isOpen ? 'bg-slate-900 text-slate-700 border border-white/5' :
                event.event_type === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95' :
                'bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95'
              }`}
            >
              {event.isBooked ? "Pass Secured" : event.isPending ? "Awaiting Verification" : !event.isOpen ? "Opening Soon" : "Book Your Pass"}
            </button>
          </div>
        </div>

        <div onClick={onFlip} className={`absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] rounded-[2.5rem] border-2 p-8 flex flex-col cursor-pointer ${glowClass}`}>
          <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-white/5 pb-2"><Zap size={10}/> Event Specification:</h4>
          <div className="grow overflow-y-auto custom-scrollbar pr-2">
            <p className="text-slate-300 text-[12px] leading-relaxed font-medium text-left italic whitespace-pre-line"
               dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
          <p className="mt-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Tap to flip back</p>
        </div>
      </div>

      <style>{`
        .perspective-2000 { perspective: 2000px; } 
        .transform-style-3d { transform-style: preserve-3d; } 
        .backface-hidden { backface-visibility: hidden; } 
        .rotate-y-180 { transform: rotateY(180deg); } 
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default EventList;