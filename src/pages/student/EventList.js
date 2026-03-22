import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Calendar, Clock, Search, Zap, 
  CheckCircle, MapPin, Timer, Info,
  ChevronLeft, ChevronRight, ShieldCheck, Ticket, X
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
            payload.new.event_id === eventId && 
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
      if (event.isPending) return toast.error("You have a pending transaction.");

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

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 md:p-6 pb-24 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col gap-6">
          <div className="bg-[#111827]/90 backdrop-blur-xl p-3 rounded-4xl border border-white/5 shadow-2xl">
            <div className="relative w-full text-left">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
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

      {/* PAYMENT MODAL */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-8 bg-[#0a0f1d]/90 backdrop-blur-md">
          <div className="bg-[#111827] border-2 border-emerald-500/30 rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 max-w-md lg:max-w-4xl w-full relative max-h-[95vh] overflow-y-auto custom-scrollbar">
            
            <button 
              onClick={() => setPaymentModal({ open: false, event: null })} 
              className="absolute top-4 right-4 p-2.5 bg-black/20 text-slate-400 hover:text-red-400 rounded-full transition-colors z-50 border border-white/5"
            >
              <X size={20} />
            </button>

            {!assignedPrice ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                 <Zap className="animate-spin text-emerald-500" size={48} />
                 <p className="text-emerald-400 font-black uppercase tracking-widest text-xs">Generating Secure Gateway...</p>
              </div>
            ) : isVerified ? (
              <div className="flex flex-col items-center text-center gap-6 py-12 animate-in zoom-in">
                 <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                   <ShieldCheck size={48} />
                 </div>
                 <h3 className="text-4xl font-black uppercase italic text-white">ACCESS GRANTED</h3>
                 <button onClick={() => setPaymentModal({open: false, event: null})} className="w-full max-w-sm mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                   View Ticket
                 </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center pt-4">
                <div className="flex flex-col text-left gap-6 order-1">
                  <div className="space-y-2">
                    <h3 className="text-2xl lg:text-3xl font-black uppercase italic text-white leading-none">PAY EXACTLY</h3>
                    <p className="text-emerald-400 font-black text-6xl lg:text-7xl tracking-tighter">₹{assignedPrice}</p>
                  </div>

                  <div className="w-full bg-[#1f2937] rounded-3xl p-6 border border-slate-700 shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-700 pb-3 mb-4 flex items-center gap-2">
                      <Ticket size={14}/> Transaction Breakdown
                    </h4>
                    <div className="space-y-3.5 text-sm font-bold text-slate-300">
                      <div className="flex justify-between"><span>Event Ticket</span><span>₹{paymentModal.event.price}</span></div>
                      <div className="flex justify-between"><span>Platform Fee</span><span>₹10</span></div>
                      <div className="flex justify-between text-emerald-500/70 text-[10px]"><span>Verification Decimal</span><span>+ ₹{(assignedPrice - paymentModal.event.price - 10).toFixed(2)}</span></div>
                    </div>
                  </div>

                  {!showManual ? (
                    <button onClick={() => setShowManual(true)} className="text-[9px] text-slate-500 hover:text-white underline uppercase font-bold tracking-widest">
                      Paid but screen stuck? Enter UTR manually
                    </button>
                  ) : (
                    <div className="bg-[#111827] p-4 rounded-2xl border border-slate-700 animate-in slide-in-from-bottom-2">
                      <input 
                        value={manualUtr}
                        onChange={(e) => setManualUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="w-full p-3.5 bg-black border border-slate-800 rounded-xl text-emerald-400 text-center font-mono tracking-[0.3em] mb-3 outline-none"
                        placeholder="0000 0000 0000"
                      />
                      <button 
                        onClick={handleManualSubmit}
                        disabled={manualUtr.length !== 12 || submittingManual}
                        className="w-full bg-emerald-600 py-3.5 rounded-xl text-[10px] text-white font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {submittingManual ? "Submitting..." : "Submit UTR"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center text-center gap-6 bg-black/40 p-6 lg:p-10 rounded-4xl border border-white/5 order-2 h-full shadow-inner">
                  <a 
                    href={`upi://pay?pa=${paymentModal.event.merchant_upi}&pn=Event_Pass&am=${assignedPrice}&cu=INR`}
                    className="w-full flex items-center justify-center gap-3 py-4 lg:py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    <Zap size={20} className="fill-white" />
                    Tap to Pay via UPI App
                  </a>
                  
                  <button 
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex lg:hidden items-center justify-center py-3.5 bg-[#1f2937] text-slate-300 rounded-xl font-bold uppercase text-[9px] tracking-widest"
                  >
                    {showQR ? "Hide QR Code" : "Show QR Code"}
                  </button>

                  <div className={`p-5 bg-white rounded-3xl shadow-2xl relative animate-in zoom-in duration-300 ${showQR ? 'block' : 'hidden lg:block'}`}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${paymentModal.event.merchant_upi}&pn=Event_Pass&am=${assignedPrice}&cu=INR`)}`}
                      alt="Payment QR"
                      className="w-48 h-48 lg:w-56 lg:h-56"
                    />
                  </div>
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
  const defaultImages = ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"];
  const images = Array.isArray(event.images) && event.images.length > 0 ? event.images : defaultImages;

  const nextImage = (e) => { e.stopPropagation(); setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1)); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1)); };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'TBA';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' @ ' + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return 'TBA';
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <div className="perspective-2000 h-132.5 w-full group">
      <div className={`relative w-full h-full transition-transform duration-1000 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        <div onClick={onFlip} className={`absolute inset-0 backface-hidden bg-[#0f172a] rounded-[2.5rem] border-2 p-6 md:p-7 flex flex-col cursor-pointer transition-all duration-500 ${event.isBooked ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.25)]' : 'border-blue-500/40 group-hover:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'}`}>
          <div className="flex justify-between items-start mb-4 shrink-0">
            <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-35">{event.school}</span>
            <div className="flex items-center gap-2">
              <Info size={14} className="text-slate-500 hover:text-blue-400 transition-colors" />
              {event.isBooked && <div className="flex items-center gap-1 text-green-500 font-black text-[8px] uppercase"><CheckCircle size={12}/> Verified</div>}
            </div>
          </div>

          <div className="relative w-full h-40 rounded-2xl overflow-hidden shrink-0 mb-4 border border-white/10 bg-slate-900 group/slider">
            <img src={images[currentImgIndex]} alt="Event" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-transparent to-transparent opacity-80 pointer-events-none"></div>
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/slider:opacity-100 transition-opacity">
                <button onClick={prevImage} className="p-1.5 bg-black/50 rounded-full"><ChevronLeft size={16} /></button>
                <button onClick={nextImage} className="p-1.5 bg-black/50 rounded-full"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>

          <div className="grow flex flex-col gap-3">
            <h3 className="text-2xl font-black uppercase italic leading-[0.9] text-white line-clamp-2">{event.title}</h3>
            <div className="space-y-1 text-slate-400 text-[9px] font-bold uppercase">
              <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-500"/> {event.date}</div>
              <div className="flex items-center gap-2"><Clock size={12} className="text-blue-500"/> {formatTimeOnly(event.reg_start_timestamp)}</div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-blue-500"/> {event.venue}</div>
            </div>

            <div className="pt-3 border-t border-slate-700/50 space-y-2">
              <div className="flex justify-between bg-[#111827] px-3 py-2 rounded-lg border border-white/5 text-[9px]">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Timer size={12} />
                  <span>Opens</span>
                </div>
                <span className="text-white uppercase font-black">{formatDateTime(event.reg_start_timestamp)}</span>
              </div>
            </div>

            <button 
              disabled={event.isBooked || event.isSoldOut || !event.isOpen || event.isPending}
              onClick={(e) => { e.stopPropagation(); onBook(e, event); }}
              className={`w-full py-3.5 mt-auto rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all ${event.isBooked ? 'bg-green-600/20 text-green-500 border-green-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}
            >
              {event.isBooked ? "Pass Secured" : "Book Your Pass"}
            </button>
          </div>
        </div>

        <div onClick={onFlip} className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] rounded-[2.5rem] border-2 border-blue-500/40 p-8 flex flex-col cursor-pointer">
          <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Event Specification:</h4>
          <div className="grow overflow-y-auto custom-scrollbar">
            <p className="text-slate-300 text-[12px] leading-relaxed italic whitespace-pre-line" dangerouslySetInnerHTML={{ __html: event.description }} />
          </div>
        </div>
      </div>
      <style>{`
        .perspective-2000 { perspective: 2000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); } 
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.6); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default EventList;