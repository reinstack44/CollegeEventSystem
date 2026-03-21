import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom'; 
import { 
  Trash2, Search, Filter, ShieldAlert, 
  UserX, ArrowLeft, History, Activity, Terminal, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManageRegistrations = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchRegistrations = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    try {
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
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      toast.error("Telemetry Link Failure"); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations(selectedEventId);
  }, [selectedEventId, fetchRegistrations]);

  const handleDeleteEntry = async (bookingId, studentName) => {
    const displayName = studentName || 'Subject';
    
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 text-left">
        <p className="text-xs font-black uppercase text-white tracking-widest leading-relaxed">
          Wipe registry entry for <span className="text-blue-500">{displayName}</span>?
        </p>
        <div className="flex gap-2">
          <button 
            className="bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
                if (error) throw error;
                toast.success("Registry Purged");
                setRegistrations(prev => prev.filter(reg => reg.id !== bookingId));
              } catch (err) {
                toast.error("Override Failed");
              }
            }}
          >EXECUTE WIPE</button>
          <button className="bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => toast.dismiss(t.id)}>ABORT</button>
        </div>
      </div>
    ), { 
      duration: 5000,
      style: { background: '#050914', border: '1px solid #2563eb', minWidth: '320px' }
    });
  };

  const filteredLogs = registrations.filter(reg => 
    reg.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reg.students?.name && reg.students.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (reg.students?.urn && reg.students.urn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 md:p-12 selection:bg-blue-500/30 font-mono">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <div className="w-full flex justify-start">
          <button 
            onClick={() => navigate('/admin')} 
            className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>

        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
              <ShieldAlert size={32} />
              <div className="h-0.5 w-12 bg-blue-500/30"></div>
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Secure Operations</p>
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">Security_Logs</h2>
          </div>

          <div className="flex items-center gap-4 bg-[#111827] p-2 rounded-2xl border border-white/5 shadow-xl">
            <Filter className="text-slate-500 ml-4" size={18} />
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[#1f2937] border-none text-white text-[11px] font-black uppercase rounded-xl px-6 py-3 outline-none cursor-pointer min-w-55"
            >
              <option value="">Select Target Sector</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-[#111827] p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2">
              <History className="text-blue-500" size={24} />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Registry Count</span>
              <span className="text-xl font-black text-white">{registrations.length}</span>
           </div>
           <div className="bg-[#111827] p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2">
              <Activity className="text-green-500" size={24} />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Sync Status</span>
              <span className="text-xl font-black text-white uppercase">{loading ? 'Syncing' : 'Stabilized'}</span>
           </div>
           <div className="bg-[#111827] p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2">
              <Terminal className="text-purple-500" size={24} />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Node Path</span>
              <span className="text-xl font-black text-white truncate w-full px-4 uppercase">MANAGE_REGS</span>
           </div>
        </div>

        {selectedEventId ? (
          <div className="space-y-6 text-left">
            <div className="relative max-w-md">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text"
                placeholder="FILTER LOGS BY ID OR URN..."
                className="w-full pl-16 pr-6 py-5 bg-[#050914] border border-white/5 rounded-4xl outline-none focus:border-blue-500/50 text-xs font-black tracking-widest transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-[#111827] rounded-[3rem] border border-white/5 overflow-hidden shadow-3xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1f2937]/50 border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Identity</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">URN</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Gate Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr><td colSpan="4" className="py-24 text-center"><Zap className="animate-pulse text-blue-500 mx-auto" size={48} /></td></tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-24 text-center opacity-30">
                          <UserX className="mx-auto mb-4" size={48} />
                          <p className="font-black uppercase text-xs tracking-widest italic">No entry logs found.</p>
                        </td>
                      </tr>
                    ) : filteredLogs.map((reg) => (
                      <tr key={reg.id} className="hover:bg-blue-600/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <p className="font-black uppercase text-sm text-white italic tracking-tight group-hover:text-blue-400 transition-colors">
                              {reg.students?.name ? `${reg.students.name} ${reg.students.surname}` : 'Unidentified Subject'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold lowercase tracking-widest">{reg.student_email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-xs font-black text-slate-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                            {reg.students?.urn || "---"}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${
                            reg.status === 'checked_in' 
                            ? 'text-green-500 border-green-500/20 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                            : 'text-blue-400 border-blue-500/20 bg-blue-500/10'
                          }`}>
                            {reg.status === 'checked_in' ? 'Scanned' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => handleDeleteEntry(reg.id, reg.students?.name)}
                            className="p-4 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20 active:scale-90"
                            title="Wipe Entry"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-40 text-center bg-[#111827] rounded-[3rem] border border-dashed border-white/10 opacity-50 shadow-2xl">
            <ShieldAlert className="mx-auto text-slate-800 mb-6 animate-pulse" size={64} />
            <h3 className="text-xl font-black text-slate-700 uppercase tracking-[0.3em]">Sector Authorization Required</h3>
            <p className="text-slate-800 text-[10px] mt-2 uppercase font-black tracking-widest">Select a deployment sector to access security registries</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManageRegistrations;