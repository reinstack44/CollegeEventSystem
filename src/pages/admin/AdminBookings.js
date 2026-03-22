import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import toast from 'react-hot-toast';
import { 
  Users, Search, CheckCircle, 
  XCircle, Zap, Clock, ShieldCheck, Ticket, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, utr_number, amount_expected, created_at, student_email, status,
          events ( title, price, event_type )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast.error("Failed to load student database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    
    // Realtime listener for immediate UI updates when a user submits a manual claim
    const channel = supabase.channel('bookings_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleApprove = async (bookingId) => {
    const toastId = toast.loading("Verifying Identity...");
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'verified' })
        .eq('id', bookingId);
      
      if (error) throw error;
      toast.success("Pass Authorized!", { id: toastId });
    } catch (error) {
      toast.error("Verification failed.", { id: toastId });
    }
  };

  const handleReject = async (bookingId) => {
    if (!window.confirm("Are you sure? This will delete their booking request entirely.")) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      toast.success("Fraudulent claim rejected & removed.");
    } catch (error) {
      toast.error("Rejection failed.");
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.student_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.utr_number && b.utr_number.includes(searchQuery)) ||
      (b.events?.title && b.events.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] p-6 text-white selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="w-full mb-4 flex justify-start">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg"><Users className="text-blue-500" size={24} /></div>
              <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Manual Entry Verification</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-4">
              Students Financials and status
              {pendingCount > 0 && (
                <span className="text-sm font-black bg-red-500 text-white px-3 py-1 rounded-full animate-pulse not-italic tracking-widest">
                  {pendingCount} Pending Audits
                </span>
              )}
            </h2>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-7 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" placeholder="Search Email, Event, or UTR..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-xs font-bold transition-all"
            />
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'verified', 'confirmed'].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === status 
                  ? status === 'pending' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20' 
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'bg-[#111827] text-slate-500 border border-slate-800 hover:border-slate-600'
              }`}
            >
              {status === 'confirmed' ? 'Free (Confirmed)' : status}
            </button>
          ))}
        </div>

        <div className="bg-[#111827] rounded-4xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1f2937]/50 border-b border-slate-800">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Student Identity</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Event</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Financials</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4" />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No records found matching this criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#1f2937]/30 transition-colors group">
                      <td className="p-5">
                        <p className="text-sm font-bold text-white">{booking.student_email}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
                          Booked: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <Ticket size={14} className="text-slate-500" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-300 truncate max-w-50">
                            {booking.events?.title}
                          </p>
                        </div>
                      </td>

                      <td className="p-5">
                        {booking.events?.event_type === 'free' ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-800/50 px-3 py-1 rounded-lg">Free Entry</span>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-white">₹{booking.amount_expected}</p>
                            {booking.utr_number ? (
                              <p className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                                UTR: {booking.utr_number}
                              </p>
                            ) : (
                              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Awaiting UTR</p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                          booking.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          booking.status === 'confirmed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {booking.status === 'pending' ? <Clock size={10}/> : <ShieldCheck size={10}/>}
                          {booking.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-5 flex items-center justify-end gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                        {booking.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleApprove(booking.id)} 
                              className="p-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-500/30"
                              title="Verify Payment"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleReject(booking.id)} 
                              className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-500/30"
                              title="Reject & Delete"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        ) : (
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">No Action Required</span>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminBookings;