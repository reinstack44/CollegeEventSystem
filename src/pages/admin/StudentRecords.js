import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Search, Loader2, Filter, UserCheck, UserX, 
  Shield, Fingerprint, Mail, Phone, Download, History 
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentRecords = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      // MATCHED TO DATABASE: Using 'urn' instead of 'roll_number'
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          student_email,
          students ( name, surname, email, phone, urn )
        `)
        .eq('event_id', selectedEventId);

      if (error) {
        console.error("SUPABASE DATA ERROR:", error.message);
        throw error;
      }
      
      setAttendees(data || []);
    } catch (error) {
      console.error(error);
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
  }, [selectedEventId, fetchAttendees]);

  // CSV Export Logic using the 'Download' icon
  const downloadCSV = () => {
    if (attendees.length === 0) return toast.error("No data available to export");
    const eventName = events.find(e => e.id === selectedEventId)?.title || "Event";
    const headers = "Name,Surname,Email,URN,Status\n";
    const rows = attendees.map(item => 
      `${item.students?.name || 'Unknown'},${item.students?.surname || ''},${item.student_email},${item.students?.urn || 'N/A'},${item.status}`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName}_Attendees.csv`;
    a.click();
    toast.success("Attendee list exported");
  };

  const filteredList = attendees.filter(item => 
    item.students?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.students?.urn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-blue-500">
              <Shield size={24} />
              <p className="font-black uppercase tracking-[0.4em] text-[10px]">Command Intelligence</p>
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">Student Database</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             {/* Restored Export Button */}
             <button 
               onClick={downloadCSV}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
             >
               <Download size={16} /> Export CSV
             </button>

             <div className="flex items-center gap-4 bg-[#111827] p-2 rounded-2xl border border-white/5">
                <Filter size={18} className="text-slate-500 ml-4" />
                <select 
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-[#1f2937] border-none text-white text-[11px] font-black uppercase rounded-xl px-6 py-3 outline-none cursor-pointer min-w-[200px]"
                >
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
             </div>
          </div>
        </header>

        {/* --- SEARCH BAR --- */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text"
            placeholder="Search attendees by name, email, or URN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-[#111827] border border-white/5 rounded-[2rem] outline-none focus:border-blue-500/50 text-sm font-bold transition-all"
          />
        </div>

        {/* --- DATA TABLE --- */}
        <div className="bg-[#111827] rounded-[3rem] border border-white/5 overflow-hidden shadow-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1f2937]/50 border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Gate Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Attendee</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">URN / Roll No</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={40} /></td></tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-20 text-center">
                      <History className="mx-auto text-slate-800 mb-4" size={48} />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No attendees found.</p>
                    </td>
                  </tr>
                ) : filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-600/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {item.status === 'checked_in' ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <UserCheck size={14} /> Scanned
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <UserX size={14} /> Registered
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-500 border border-slate-700">
                          {item.students?.name?.charAt(0) || item.student_email?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-black text-sm text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                            {item.students?.name ? `${item.students.name} ${item.students.surname || ''}` : "Profile Pending"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold lowercase">{item.student_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                        <Fingerprint size={16} className="text-blue-500" />
                        {item.students?.urn || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><Mail size={12}/> {item.student_email}</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><Phone size={12}/> {item.students?.phone || 'N/A'}</div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRecords;