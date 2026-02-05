import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Trash2, Search, Filter, 
  ShieldAlert, Loader2, UserX 
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageRegistrations = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all events for the dropdown selector
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, date')
          .order('date', { ascending: false });
        
        if (error) throw error;
        if (data) setEvents(data);
      } catch (err) {
        console.error("Event Fetch Error:", err.message);
      }
    };
    fetchEvents();
  }, []);

  // Fetch registrations with updated column "urn"
  const fetchRegistrations = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Joining via student_email and selecting 'urn' instead of 'roll_number'
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, 
          student_email, 
          status, 
          created_at,
          students!student_email (
            name, 
            surname,
            urn
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Database Join Failure:", error.message);
      toast.error("Security Logs Access Failure"); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations(selectedEventId);
  }, [selectedEventId, fetchRegistrations]);

  // Handle Registry Purge Protocol
  const handleDeleteEntry = async (bookingId, studentName) => {
    const displayName = studentName || 'this subject';
    if (!window.confirm(`SECURITY OVERRIDE: Permanently purge registry for ${displayName}?`)) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast.success("Identity Purged from Logs");
      setRegistrations(prev => prev.filter(reg => reg.id !== bookingId));
    } catch (err) {
      toast.error("Security Override Failed");
    }
  };

  const filteredLogs = registrations.filter(reg => 
    reg.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reg.students?.name && reg.students.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (reg.students?.urn && reg.students.urn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24 selection:bg-red-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Admin Header: Neon Red Protocol Styling */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f172a] p-8 rounded-[2.5rem] border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <div className="flex items-center gap-4 text-left">
            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="text-red-500" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Security Logs</h2>
              <p className="text-red-500/60 font-black uppercase tracking-[0.3em] text-[10px]">Entry Modification Protocol</p>
            </div>
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="pl-12 pr-10 py-4 bg-slate-900 border border-white/10 rounded-2xl outline-none focus:border-red-500/50 text-xs font-bold uppercase tracking-widest appearance-none cursor-pointer w-full md:w-80 transition-all shadow-lg"
            >
              <option value="">Select Target Deployment</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>
        </header>

        {selectedEventId ? (
          <div className="space-y-6 text-left">
            {/* Identity Search Input */}
            <div className="relative group max-w-md">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="SEARCH NAME OR URN..."
                className="w-full pl-14 pr-6 py-5 bg-slate-900/50 border border-white/5 rounded-[2rem] outline-none focus:border-red-500/30 text-xs font-bold uppercase tracking-widest transition-all shadow-inner"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Logs Registry Table */}
            <div className="bg-[#0f172a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-red-500" size={48} />
                  <p className="text-red-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Encrypted Logs...</p>
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject Identity</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">URN</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLogs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-red-500/[0.02] transition-colors group">
                          <td className="p-6">
                            <div className="flex flex-col">
                              <p className="font-black uppercase text-sm tracking-tight">
                                {reg.students?.name 
                                  ? `${reg.students.name} ${reg.students.surname}` 
                                  : 'Unidentified Subject'}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">{reg.student_email}</p>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <span className="text-xs font-mono font-bold text-slate-400">
                                {reg.students?.urn || "---"}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border tracking-widest transition-all ${
                              reg.status === 'checked_in' 
                              ? 'text-green-500 border-green-500/20 bg-green-500/5' 
                              : 'text-blue-500 border-blue-500/20 bg-blue-500/5'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => handleDeleteEntry(reg.id, reg.students?.name)}
                              className="p-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg active:scale-90"
                              title="Purge Entry"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <UserX className="mx-auto text-slate-800" size={48} />
                  <p className="text-slate-600 font-black uppercase tracking-widest text-[10px] mt-4">Sector Clear: No Matching Logs Found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-32 text-center bg-[#0f172a] rounded-[3rem] border border-dashed border-white/10 opacity-50">
            <ShieldAlert className="mx-auto text-slate-800 mb-6" size={64} />
            <h3 className="text-xl font-bold text-slate-700 uppercase tracking-[0.2em]">Deployment Selection Required</h3>
            <p className="text-slate-800 text-xs mt-2 uppercase font-black">Authorize a deployment sector to access registries</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(239, 68, 68, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageRegistrations;