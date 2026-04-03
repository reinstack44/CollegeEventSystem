import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react'; 
import { 
  Calendar, Clock, Search, Zap, 
  CheckCircle, MapPin, Timer, Info,
  ChevronLeft, ChevronRight, X, Loader2, Ticket, ShieldCheck,
  CreditCard, Fingerprint, Download
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [studentName, setStudentName] = useState("");
  
  const [poppedEvent, setPoppedEvent] = useState(null);
  const [isClosing, setIsClosing] = useState(false); 
  const [now, setNow] = useState(new Date());

  // MODAL & RAZORPAY STATE
  const [paymentModal, setPaymentModal] = useState({ open: false, event: null });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // TICKET OVERLAY STATE
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(ticker);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase.from('students').select('name, surname').eq('email', user.email).single();
        if (profile) setStudentName(`${profile.name || 'Student'} ${profile.surname || ''}`);
      }

      const currentIso = now.toISOString();

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .gte('reg_end_timestamp', currentIso) 
        .order('date', { ascending: true });

      if (eventError) throw eventError;

      const { data: bookingData } = await supabase.from('bookings').select('id, event_id, student_email, status');

      const eventsWithMeta = (eventData || []).map(event => {
        const eventBookings = bookingData?.filter(b => b.event_id === event.id) || [];
        const startTime = new Date(event.reg_start_timestamp);
        
        const userBooking = user ? eventBookings.find(b => b.student_email === user.email) : null;
        
        const isPending = userBooking?.status === 'pending';
        const isCheckedIn = userBooking?.status === 'checked_in';
        const isBooked = userBooking && ['confirmed', 'verified'].includes(userBooking.status);
        const hasAnyBooking = !!userBooking; 

        return {
          ...event,
          bookingId: userBooking?.id,
          bookingStatus: userBooking?.status,
          isSoldOut: event.ticket_limit && eventBookings.length >= event.ticket_limit,
          isBooked: isBooked,
          isPending: isPending,
          isCheckedIn: isCheckedIn,
          hasAnyBooking: hasAnyBooking,
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

  // --- EXACT MATH HELPER ---
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
      pdf.save(`NexusCircle_Pass_${selectedTicket.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (error) {
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
    if (event.hasAnyBooking) return toast.error("Identity already secured!");
    if (event.isSoldOut) return toast.error("Deployment Full: Sold Out!");

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
      toast.error("Booking failed: " + error.message);
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
        description: `Pass for ${paymentModal.event.title}`,
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
            toast.error("Payment received, but ticket generation failed. Contact Admin.");
          }
        },
        prefill: { email: user.email },
        theme: { color: "#2563eb" } 
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) { toast.error(`Payment Failed: ${response.error.description}`); });
      paymentObject.open();

    } catch (error) {
      toast.error(error.message || "Could not initiate payment. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleViewTicket = (eventObj) => {
    setSelectedTicket(eventObj);
    setIsFlipping(false);
    setTimeout(() => setIsFlipping(true), 300);
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = statusFilter === 'all' || (statusFilter === 'available' ? !e.hasAnyBooking : e.hasAnyBooking);
    return matchesSearch && matchesStatus;
  });

  const closePoppedEvent = () => {
    setIsClosing(true); 
    setTimeout(() => {
      setPoppedEvent(null); 
      setIsClosing(false);  
    }, 400); 
  };

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 md:p-6 pb-24 selection:bg-blue-500/30 relative">
      
      {/* --- FULL SCREEN CELEBRATION OVERLAY --- */}
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
              <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px] md:text-sm">Generating Digital Pass...</p>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-PAGE TICKET MODAL (NO REDIRECT NEEDED) --- */}
      {selectedTicket && (
        <div className="fixed inset-0 z-600 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-hidden">
          <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 md:top-8 md:right-8 p-2.5 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white z-610 border border-white/10 shadow-xl"><X size={24} className="md:w-8 md:h-8" /></button>
          
          <div className="perspective-2000 w-[90vw] max-w-85 md:max-w-md h-120 md:h-155 cursor-pointer" onClick={() => setIsFlipping(!isFlipping)}>
            <div className={`relative w-full h-full transition-transform duration-1000 ease-in-out transform-style-3d ${isFlipping ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT OF TICKET */}
              <div className="absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] md:rounded-[3.5rem] border border-blue-500/40 p-6 md:p-10 flex flex-col justify-between shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-500 to-transparent" />
                
                <div className="text-left flex flex-col h-full">
                   <div className="flex items-center justify-between mb-6 md:mb-10">
                     <div className="flex items-center gap-2 md:gap-3">
                       <ShieldCheck className="text-blue-500 w-6 h-6 md:w-7 md:h-7" />
                       <p className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-blue-400 leading-tight">Security<br className="md:hidden"/> Pass</p>
                     </div>
                     <div className={`px-3 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-xl border text-[8px] md:text-[9px] font-black uppercase tracking-widest ${selectedTicket.bookingStatus === 'checked_in' ? 'text-green-500 border-green-500/20' : 'text-blue-500 border-blue-500/20'}`}>
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
                          <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Pass Valid For</p>
                          <p className="text-sm md:text-xl font-bold leading-none">{selectedTicket.date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 md:gap-5">
                        <Clock className="text-blue-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                        <div>
                          <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Event Time</p>
                          <p className="text-sm md:text-xl font-bold leading-none">{formatTime(selectedTicket.start_time)} — {selectedTicket.end_time ? formatTime(selectedTicket.end_time) : 'End'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 md:gap-5">
                        <MapPin className="text-blue-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Venue Location</p>
                          <p className="text-sm md:text-xl font-bold truncate leading-none">{selectedTicket.venue}</p>
                        </div>
                      </div>
                      
                      {selectedTicket.event_type === 'paid' && (
                        <div className="flex items-center gap-3 md:gap-5">
                          <CreditCard className="text-emerald-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                          <div>
                            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Amount Paid</p>
                            <p className="text-sm md:text-xl font-bold text-emerald-400 leading-none">₹{getDisplayAmount(selectedTicket)}</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-center gap-4 pt-4 md:py-6 border-t border-white/5 mt-auto">
                  <p className="text-blue-500 font-black text-[8px] md:text-[10px] uppercase tracking-widest animate-pulse">Tap Card to View Entry QR</p>
                </div>
              </div>

              {/* BACK OF TICKET (QR CODE) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col items-center p-6 md:p-8 text-slate-900">
                <div className="text-center mb-4 md:mb-6 mt-2 md:mt-0">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.4em] mb-1">Authorized For</p>
                  <h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-blue-600 italic line-clamp-1">{studentName}</h4>
                </div>
                
                <div className="bg-[#f8fafc] p-4 md:p-6 rounded-4xl border-2 border-slate-100 mb-4 md:mb-6 flex items-center justify-center">
                  <div className="scale-75 md:scale-100 origin-center flex items-center justify-center">
                     <QRCodeCanvas value={selectedTicket.bookingId || "error"} size={200} level="H" />
                  </div>
                </div>
                
                <div className="w-full space-y-3 md:space-y-4">
                  <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-between">
                    <p className="font-mono text-[9px] md:text-[11px] text-slate-400 uppercase font-bold truncate mr-2">ID: {selectedTicket.bookingId}</p>
                    <Fingerprint className="text-blue-500 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-blue-700 transition-all z-50">
                    {isDownloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
                
                <p className="mt-auto pt-2 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tap anywhere to flip back</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TICKET */}
      {selectedTicket && (
        <div style={{ position: 'absolute', top: '-20000px', left: '-20000px', zIndex: -9999 }}>
          <div ref={printRef} style={{ width: '794px', height: '1123px', backgroundColor: '#0a0f1d', padding: '40px', boxSizing: 'border-box' }}>
            <div style={{ width: '714px', height: '1043px', border: '4px solid #3b82f6', borderRadius: '32px', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1d', boxSizing: 'border-box' }}>
              <div style={{ flex: '0 0 auto', padding: '50px 60px 30px 60px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}><p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '3px', textTransform: 'uppercase' }}>{selectedTicket.school || 'EVENT'} • SECURITY PASS</p><div style={{ backgroundColor: '#1e293b', color: '#3b82f6', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', border: '1px solid rgba(59,130,246,0.3)' }}>VERIFIED ACCESS</div></div>
                 <div style={{ marginBottom: '30px', width: '100%' }}><h1 style={{ margin: 0, fontSize: selectedTicket.title.length > 30 ? '34px' : '48px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: '38px', wordWrap: 'break-word', display: 'block' }}>{selectedTicket.title}</h1></div>
                 <div style={{ display: 'flex', marginBottom: '25px', gap: '40px' }}><div style={{ flex: 1 }}><p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Date</p><p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.date}</p></div><div style={{ flex: 1 }}><p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Time</p><p style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#ffffff' }}>{formatTime(selectedTicket.start_time)} - {selectedTicket.end_time ? formatTime(selectedTicket.end_time) : 'End'}</p></div></div>
                 
                 <div style={{ display: 'flex', marginBottom: '30px', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Venue Location</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ffffff' }}>{selectedTicket.venue}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Payment Status</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: selectedTicket.event_type === 'paid' ? '#10b981' : '#3b82f6' }}>
                        {selectedTicket.event_type === 'paid' ? `PAID ₹${getDisplayAmount(selectedTicket)}` : 'FREE PASS'}
                      </p>
                    </div>
                 </div>

                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Authorized Attendee</p>
                    <p style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>{studentName}</p>
                 </div>
              </div>
              <div style={{ height: '0', borderBottom: '4px dashed #3b82f6', margin: '0 40px' }}></div>
              <div style={{ flex: '1 1 auto', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
                 <p style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '900', color: '#0a0f1d', textTransform: 'uppercase', letterSpacing: '8px' }}>ADMIT ONE</p>
                 <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '15px', border: '1px solid #e2e8f0' }}><QRCodeCanvas value={selectedTicket.bookingId || "error"} size={170} level="H" /></div>
                 <div style={{ marginTop: '10px', textAlign: 'center' }}><p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Secure Token ID</p><p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#0a0f1d', fontFamily: 'monospace' }}>{selectedTicket.bookingId}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col gap-6">
          <div className="bg-[#111827]/90 backdrop-blur-xl p-3 rounded-4xl border border-white/5 shadow-2xl">
            <div className="relative w-full text-left">
              <Search className="absolute left-6 top-9 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text"
                placeholder="SEARCH Events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-[#1f2937]/50 border-none rounded-3xl outline-none text-sm font-black tracking-widest uppercase focus:ring-2 focus:ring-emerald-500/50 transition-all"
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
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s}</button>
            ))}
          </div>
        </div>

        <section className="space-y-8 text-left">
          <h2 className="text-2xl font-black uppercase italic flex items-center gap-3"><Zap className="text-yellow-500 fill-yellow-500" size={24}/> Registrations Open</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
        </section>
      </div>

      {/* --- EVENT DESCRIPTION POP-OUT --- */}
      {poppedEvent && (
          <div 
            className="fixed inset-0 z-150 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md" 
            onClick={closePoppedEvent}
          >
          <div 
            className={`relative w-[95%] sm:w-full max-w-2xl max-h-[90vh] bg-[#1e293b] rounded-3xl md:rounded-[2.5rem] border-2 border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.3)] p-5 md:p-10 flex flex-col overflow-hidden ${isClosing ? 'animate-flip-pop-out' : 'animate-flip-pop'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closePoppedEvent} 
              className="absolute top-4 right-4 md:top-5 md:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors z-10"
            >
              <X size={20} className="md:w-6 md:h-6" />
            </button>

            <h4 className="text-[11px] md:text-[14px] font-black text-blue-400 uppercase tracking-widest mb-4 md:mb-5 flex items-center gap-2 border-b border-white/10 pb-3 md:pb-4 pr-8">
              <Zap size={14} className="md:w-4 md:h-4" /> Event Specification
            </h4>
            
            <div className="grow overflow-y-auto custom-scrollbar pr-2 md:pr-3">
              <div className="event-description text-slate-300 text-[13px] md:text-[16px] leading-relaxed md:leading-[1.8] font-normal text-left tracking-wide"
              dangerouslySetInnerHTML={{ __html: poppedEvent.description }}
              />
            </div>
            
            <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t border-white/5 flex justify-center shrink-0">
               <button onClick={closePoppedEvent} className="px-6 py-2.5 md:px-8 md:py-3 bg-[#0f172a] hover:bg-blue-600 text-white rounded-lg md:rounded-xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] transition-all border border-white/10 hover:border-blue-500 shadow-lg active:scale-95">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SECURE ORDER SUMMARY MODAL --- */}
      {paymentModal.open && paymentModal.event && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl flex flex-col md:flex-row w-full max-w-4xl max-h-[95vh] md:max-h-[85vh] overflow-hidden shadow-[0_0_60px_rgba(37,99,235,0.15)] relative">
            
            <button 
              onClick={() => setPaymentModal({ open: false, event: null })} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors z-50"
            >
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
                      <div className="flex justify-between text-slate-400">
                        <span>Ticket Fee</span>
                        <span className="text-slate-200 font-medium">₹{ticketFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Platform Fee</span>
                        <span className="text-slate-200 font-medium">₹{platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Razorpay Fee (2.5%)</span>
                        <span className="text-slate-200 font-medium">₹{gatewayFee.toFixed(2)}</span>
                      </div>
                      
                      <div className="pt-5 mt-3 border-t border-slate-800 flex justify-between items-center text-white font-bold text-lg">
                        <span>Total Due</span>
                        <span className="text-blue-400">₹{totalAmount.toFixed(2)}</span>
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

                    <button 
                      onClick={processRazorpayCheckout} 
                      disabled={processingPayment} 
                      className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 flex items-center justify-center gap-3 relative z-10"
                    >
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

        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } 
        
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
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

const FlipCard = ({ event, onBook, onFlip, onViewTicket }) => {
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

  const glowClass = event.isCheckedIn
    ? 'border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)]' 
    : event.isBooked 
    ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.25)]' 
    : event.isPending 
    ? 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.25)]'
    : 'border-blue-500/40 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] shadow-[0_0_20px_rgba(59,130,246,0.15)]';

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
    <div className="h-142.5 w-full group">
      
      <div 
        onClick={onFlip} 
        className={`relative w-full h-full bg-[#0f172a] rounded-[2.5rem] border-2 p-6 md:p-7 flex flex-col justify-start cursor-pointer transition-all duration-500 ${glowClass} hover:-translate-y-2`}
      >
        <div className="flex justify-between items-start mb-4 shrink-0">
          <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-45">{event.school}</span>
          <div className="flex items-center gap-2">
             <Info size={14} className="text-slate-500 hover:text-blue-400 transition-colors"/> 
             {event.isCheckedIn ? (
               <div className="flex items-center gap-1 text-indigo-400 font-black text-[8px] uppercase shrink-0"><CheckCircle size={12}/> Checked In</div>
             ) : event.isBooked ? (
               <div className="flex items-center gap-1 text-green-500 font-black text-[8px] uppercase shrink-0"><CheckCircle size={12}/> Verified</div>
             ) : event.isPending ? (
               <div className="flex items-center gap-1 text-yellow-500 font-black text-[8px] uppercase shrink-0 animate-pulse"><Timer size={12}/> Pending</div>
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
          <h3 className={`text-2xl font-black uppercase italic leading-[0.9] line-clamp-2 overflow-hidden shrink-0 ${
            event.isCheckedIn ? 'text-indigo-400' :
            event.isBooked ? 'text-green-500' : 
            event.isPending ? 'text-yellow-500' : 
            'text-white'
          }`}>
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

          <div className="flex items-center gap-2 text-blue-500 text-[13px] font-black uppercase tracking-widest justify-center bg-center text-center">
              {event.event_type === 'paid' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Entry Fee ₹{event.price}</span>}
          </div>

          <div className="pt-3 border-t border-slate-700/50 space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-blue-500 text-[13px] font-black uppercase tracking-widest justify-between bg-center text-center">
              <span className="flex items-center gap-2"><Timer size={12}/> Registration Window</span>
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
            disabled={(event.isSoldOut && !event.hasAnyBooking) || (!event.isOpen && !event.hasAnyBooking) || event.isPending}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (event.isBooked || event.isCheckedIn) {
                onViewTicket(event);
              } else {
                onBook(e, event); 
              }
            }}
            className={`w-full py-3.5 mt-auto rounded-2xl font-black uppercase text-[9px] transition-all tracking-widest shrink-0 ${
              event.isCheckedIn ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 hover:text-indigo-300' :
              event.isBooked ? 'bg-green-600/20 text-green-500 border border-green-500/30 hover:bg-green-600/30 hover:text-green-400' : 
              event.isPending ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30' :
              !event.isOpen ? 'bg-slate-900 text-slate-700 border border-white/5' :
              event.event_type === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95' :
              'bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95'
            }`}
          >
            {event.isCheckedIn ? "Pass Used - View Record" : event.isBooked ? "Pass Secured - View Ticket" : event.isPending ? "Awaiting Verification" : !event.isOpen ? "Opening Soon" : "Book Your Pass"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventList;