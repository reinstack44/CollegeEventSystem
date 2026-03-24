import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { 
  Search, Zap, Filter, ShieldAlert, Fingerprint, Download, 
  ArrowLeft, CheckCircle, XCircle, Trash2, UserX, ChevronDown, Eye, X, Phone, Mail, IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';

const MasterManagement = () => {
  const navigate = useNavigate(); 
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedDossier, setSelectedDossier] = useState(null);

  const fetchAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          students ( name, surname, email, phone, urn ),
          events ( title, price )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendees(data || []);
    } catch (error) {
      toast.error("Database Retrieval Failed");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase.from('events').select('id, title').order('date', { ascending: false });
      if (!error && data?.length > 0) {
        setEvents(data);
        setSelectedEventId(data[0].id); 
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    fetchAttendees();
    
    const channel = supabase.channel('master_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAttendees)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedEventId, fetchAttendees]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVerifyUTR = async (bookingId) => {
    const toastId = toast.loading("Verifying Identity...");
    try {
      const { error } = await supabase.from('bookings').update({ status: 'verified' }).eq('id', bookingId);
      if (error) throw error;
      toast.success("Pass Authorized!", { id: toastId });
      setAttendees(prev => prev.map(a => a.id === bookingId ? { ...a, status: 'verified' } : a));
      
      if (selectedDossier?.id === bookingId) {
        setSelectedDossier(prev => ({...prev, status: 'verified'}));
      }
    } catch (error) {
      toast.error("Verification failed.", { id: toastId });
    }
  };

  const handleTerminate = async (bookingId, isUtrReject = false) => {
    const confirmMsg = isUtrReject ? "Reject fraudulent payment claim?" : "Terminate this student's access pass?";
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      toast.success(isUtrReject ? "Fraudulent claim rejected." : "Access Terminated.");
      setAttendees(prev => prev.filter(a => a.id !== bookingId));
      if (selectedDossier?.id === bookingId) setSelectedDossier(null); 
    } catch (error) {
      toast.error("Action failed.");
    }
  };

  const getTxnId = (item) => item.utr_number || item.transaction_id || item.payment_id || item.razorpay_payment_id;
  const getAmount = (item) => item.amount_expected || item.amount || item.events?.price || 0;

  const getFeeBreakdown = (item) => {
    const base = parseFloat(item.events?.price || item.amount_expected || 0);
    if (base === 0) return { base: "0.00", platform: "0.00", transaction: "0.00", total: "0.00" };

    const platform = parseFloat(item.platform_fee ?? 5.00); 
    const transaction = parseFloat(item.transaction_fee ?? item.razorpay_fee ?? ((base + platform) * 0.025).toFixed(2));
    const total = parseFloat(item.total_amount ?? item.amount ?? (base + platform + transaction).toFixed(2));

    return {
      base: base.toFixed(2),
      platform: platform.toFixed(2),
      transaction: transaction.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const downloadCSV = () => {
    if (attendees.length === 0) return toast.error("No data to export");
    const toastId = toast.loading("Packaging Database...");
    
    const eventName = events.find(e => e.id === selectedEventId)?.title || "Event";
    const headers = "Name,Surname,Email,Phone,URN,Status,Transaction ID,Ticket Fee,Platform Fee,Transaction Fee,Total Paid\n";
    const rows = attendees.map(item => {
      const txn = getTxnId(item) || 'N/A';
      const fees = getFeeBreakdown(item);
      return `${item.students?.name || 'Unknown'},${item.students?.surname || ''},${item.student_email},${item.students?.phone || 'N/A'},${item.students?.urn || 'N/A'},${item.status},${txn},₹${fees.base},₹${fees.platform},₹${fees.transaction},₹${fees.total}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName.replace(/\s+/g, '_')}_MasterList.csv`;
    a.click();
    toast.success("Export Complete!", { id: toastId });
  };

  const filteredList = attendees.filter(item => 
    item.students?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.students?.urn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (getTxnId(item) && getTxnId(item).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-4 sm:p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3 text-blue-500 mb-4">
              <ShieldAlert size={28} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Command Center</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none">Master Registry</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
             <button onClick={downloadCSV} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0">
               <Download size={16} /> Export CSV
             </button>

             <div className="relative w-full sm:w-auto z-40" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-full sm:w-72 bg-[#111827] px-5 py-4 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 shadow-lg transition-all hover:border-blue-500/30 active:scale-95"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Filter size={16} className="text-blue-500 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white truncate">
                      {selectedEventId ? events.find(e => e.id === selectedEventId)?.title : "Select Event Database"}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {events.map(ev => (
                        <button
                          key={ev.id}
                          onClick={() => {
                            setSelectedEventId(ev.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors border-b border-white/5 last:border-0 ${
                            selectedEventId === ev.id 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${selectedEventId === ev.id ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-transparent'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest truncate">{ev.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </header>

        <div className="relative w-full z-10">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" placeholder="Search by Name, URN, Email, or Transaction ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-[#111827] border border-white/5 rounded-4xl outline-none text-xs sm:text-sm font-bold focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="bg-[#111827] rounded-3xl sm:rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative z-10">
          {loading ? (
            <div className="py-32 flex justify-center"><Zap className="animate-pulse text-blue-500" size={48} /></div>
          ) : filteredList.length === 0 ? (
            <div className="py-32 flex flex-col items-center opacity-40">
              <UserX size={48} className="mb-4 text-slate-500" />
              <p className="font-black uppercase text-xs tracking-widest italic">No registry logs found.</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#1f2937]/50 border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Identity</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Audit</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Command Actions</th>
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
                            <div className="w-10 h-10 shrink-0 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-500 border border-slate-700 uppercase">
                              {item.students?.name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex flex-col">
                              <p className="font-black text-sm text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                                {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Unidentified Subject"}
                              </p>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                <span>{item.student_email}</span> • <Fingerprint size={10} className="text-blue-500"/> <span>{item.students?.urn || 'NO URN'}</span>
                              </div>
                            </div>
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
                          {txn ? (
                            <div className="flex flex-col">
                              <p className="font-mono text-xs font-bold text-yellow-500 tracking-[0.2em]">{txn}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">₹{fees.total} Total Paid</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Direct / Free Entry</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedDossier(item)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                              <Eye size={14} /> Inspect
                            </button>
                            {item.status === 'pending' && txn && (
                              <button onClick={() => handleVerifyUTR(item.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                                <CheckCircle size={14} /> Verify
                              </button>
                            )}
                            <button onClick={() => handleTerminate(item.id, item.status === 'pending')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[9px] uppercase tracking-widest">
                              {item.status === 'pending' ? <XCircle size={14} /> : <Trash2 size={14} />} 
                              {item.status === 'pending' ? 'Reject' : 'Revoke'}
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
                          {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Unidentified"}
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
                      <button onClick={() => setSelectedDossier(item)} className="flex-1 flex justify-center items-center gap-2 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl border border-white/5 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md">
                        <Eye size={16} /> Inspect Details
                      </button>
                      <button onClick={() => handleTerminate(item.id, item.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-md">
                        {item.status === 'pending' ? <XCircle size={16} /> : <Trash2 size={16} />} 
                        {item.status === 'pending' ? 'Reject' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedDossier && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#111827] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl border border-blue-500/20 uppercase">
                  {selectedDossier.students?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                    {selectedDossier.students?.name ? `${selectedDossier.students.name} ${selectedDossier.students.surname || ''}` : "Unidentified"}
                  </h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                    selectedDossier.status === 'checked_in' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                    selectedDossier.status === 'verified' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 
                    'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                  }`}>
                    {selectedDossier.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedDossier(null)} className="p-2 text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 space-y-4">
                <div className="grid grid-cols-1 gap-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Email Address</span>
                      <span className="text-sm font-bold text-white truncate">{selectedDossier.student_email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Phone Number</span>
                      <span className="text-sm font-bold text-white">{selectedDossier.students?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Gate Status</span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit">
                      {selectedDossier.status === 'checked_in' ? '🟢 Scanned Entry' : '🔴 Not Scanned'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">URN / Roll No</span>
                    <span className="text-xs font-bold text-slate-300 bg-slate-800 py-1.5 px-3 rounded-lg border border-white/5 w-fit truncate max-w-full">
                      {selectedDossier.students?.urn || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/5 rounded-3xl p-5 border border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={16} className="text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">Payment Audit</span>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-yellow-500 tracking-widest bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 truncate max-w-35">
                    {getTxnId(selectedDossier) || 'FREE ENTRY'}
                  </span>
                </div>

                {getAmount(selectedDossier) > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Base Ticket Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedDossier).base}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Platform Fee</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedDossier).platform}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Transaction Fee (2.5%)</span>
                      <span className="text-white font-mono font-bold">₹{getFeeBreakdown(selectedDossier).transaction}</span>
                    </div>
                    <div className="border-t border-dashed border-white/20 my-3"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-black text-xs uppercase tracking-widest">Total Paid</span>
                      <span className="text-emerald-400 font-black text-xl italic tracking-tight">₹{getFeeBreakdown(selectedDossier).total}</span>
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
              {selectedDossier.status === 'pending' && getTxnId(selectedDossier) && (
                <button onClick={() => handleVerifyUTR(selectedDossier.id)} className="flex-1 flex justify-center items-center gap-2 py-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl border border-emerald-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
                  <CheckCircle size={16} /> Verify Pass
                </button>
              )}
              <button onClick={() => handleTerminate(selectedDossier.id, selectedDossier.status === 'pending')} className="flex-1 flex justify-center items-center gap-2 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg">
                {selectedDossier.status === 'pending' ? <XCircle size={16} /> : <Trash2 size={16} />} 
                {selectedDossier.status === 'pending' ? 'Reject Fraud' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterManagement;