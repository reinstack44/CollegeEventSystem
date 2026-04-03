import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Building, CheckCircle, XCircle, Clock, 
  Download, ArrowLeft, Search, ShieldCheck, AlertCircle,
  Eye, X, FileText, Camera, ZoomIn
} from 'lucide-react';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  // NEW: Document Preview State
  const [previewData, setPreviewData] = useState(null);

  // STRICT SUPER ADMIN CHECK IN USE EFFECT
  useEffect(() => {
    const verifyAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
      const isAdmin = user && adminEmails.includes(user.email);
      
      if (!isAdmin) {
        toast.error("UNAUTHORIZED: Primary Admin Access Only");
        return navigate('/events');
      }
      
      fetchApplications();
    };
    
    verifyAdminAndFetch();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Fetch Error:', error);
      toast.error('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get Signed/Public URL from Storage
  const getPublicUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('org-verifications').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleStatusChange = async (id, newStatus) => {
    setProcessingId(id);
    const loadToast = toast.loading(`${newStatus === 'approved' ? 'Approving' : 'Rejecting'} organization...`);
    
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state to reflect UI instantly
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      
      // Close preview if it was open during approval
      setPreviewData(null);
      
      toast.success(`Organization officially ${newStatus}!`, { id: loadToast });
    } catch (error) {
      console.error('Update Error:', error);
      toast.error(`Failed to ${newStatus} application.`, { id: loadToast });
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date Applied', 'Organization Name', 'Domain', 'Event Head', 'Head Email', 'Status'];
    const csvData = applications.map(app => [
      new Date(app.created_at).toLocaleDateString(),
      app.name,
      app.domain,
      app.head_name,
      app.head_email,
      app.status.toUpperCase()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `NexusCircle_Org_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Downloaded Successfully");
  };

  const filteredApps = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.head_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-4 md:p-8 relative">
      
      {/* --- DOCUMENT PREVIEW MODAL --- */}
      {previewData && (
        <div className="fixed inset-0 z-1000 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <ShieldCheck size={20}/>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{previewData.name} Verification Proof</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Submitted by: {previewData.head_name}</p>
                </div>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-colors">
                <X size={20}/>
              </button>
            </div>

            {/* Modal Body (Images) */}
            <div className="grow overflow-y-auto p-6 md:p-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                
                {/* ID Card Display */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                    <FileText size={14} className="text-blue-500"/> 1. Head ID Credentials
                  </h4>
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 relative group flex items-center justify-center">
                    <img 
                      src={getPublicUrl(previewData.id_card_path)} 
                      alt="Head ID" 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/800x450?text=Asset+Not+Found"; }}
                    />
                    <a href={getPublicUrl(previewData.id_card_path)} target="_blank" rel="noreferrer" className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                      <ZoomIn size={14}/> Full Size
                    </a>
                  </div>
                </div>

                {/* Live Photo Display */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                    <Camera size={14} className="text-emerald-500"/> 2. Live Identity Capture
                  </h4>
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 relative group flex items-center justify-center">
                    <img 
                      src={getPublicUrl(previewData.live_photo_path)} 
                      alt="Live Identity" 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/800x450?text=Capture+Not+Found"; }}
                    />
                    <a href={getPublicUrl(previewData.live_photo_path)} target="_blank" rel="noreferrer" className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                      <ZoomIn size={14}/> Full Size
                    </a>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-8 border-t border-white/5 bg-slate-900/50 flex flex-col sm:flex-row justify-end gap-4 shrink-0">
               {previewData.status === 'pending' && (
                 <>
                    <button 
                      disabled={processingId === previewData.id}
                      onClick={() => handleStatusChange(previewData.id, 'rejected')}
                      className="px-8 py-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-red-500/20"
                    >
                      Reject Application
                    </button>
                    <button 
                      disabled={processingId === previewData.id}
                      onClick={() => handleStatusChange(previewData.id, 'approved')}
                      className="px-8 py-4 bg-emerald-600 text-white hover:bg-emerald-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle size={16}/> Approve & Authorize
                    </button>
                 </>
               )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
          <div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Building className="text-blue-500" size={32} /> Org Applications
            </h1>
            <p className="text-xs text-slate-400 mt-2 tracking-wide uppercase font-bold">Manage Enterprise Partner Requests</p>
          </div>

          <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row justify-between gap-4 bg-[#111827] p-4 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 p-1.5 bg-[#0a0f1d] rounded-2xl w-fit">
            {['pending', 'approved', 'rejected', 'all'].map(statusOption => (
              <button 
                key={statusOption}
                onClick={() => setFilter(statusOption)} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === statusOption ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {statusOption}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="SEARCH ORG OR DOMAIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0a0f1d] border border-white/5 rounded-2xl outline-none text-xs font-black tracking-widest uppercase focus:border-blue-500 transition-all text-white"
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-[#111827] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="p-5">Applied Date</th>
                  <th className="p-5">Organization & Domain</th>
                  <th className="p-5">Event Head Details</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 animate-pulse">Loading secure applications...</td></tr>
                ) : filteredApps.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">No applications found in this category.</td></tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5 whitespace-nowrap">
                        <p className="text-white font-bold text-sm">{new Date(app.created_at).toLocaleDateString()}</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase">{new Date(app.created_at).toLocaleTimeString()}</p>
                      </td>
                      
                      <td className="p-5">
                        <p className="text-white font-bold text-sm truncate max-w-62.5">{app.name}</p>
                        <p className="text-blue-400 text-[11px] font-mono mt-0.5">{app.domain}</p>
                      </td>
                      
                      <td className="p-5">
                        <p className="text-white font-bold text-sm">{app.head_name}</p>
                        <p className="text-slate-400 text-xs">{app.head_email}</p>
                      </td>
                      
                      <td className="p-5 whitespace-nowrap">
                        {app.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest"><Clock size={12}/> Pending</span>}
                        {app.status === 'approved' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest"><ShieldCheck size={12}/> Approved</span>}
                        {app.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest"><AlertCircle size={12}/> Rejected</span>}
                      </td>
                      
                      <td className="p-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                           {/* Inspection Button */}
                           <button 
                             onClick={() => setPreviewData(app)}
                             className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-500/20"
                             title="Inspect Documents"
                           >
                             <Eye size={18} />
                           </button>

                           {app.status === 'pending' ? (
                             <>
                                <button 
                                  disabled={processingId === app.id}
                                  onClick={() => handleStatusChange(app.id, 'approved')}
                                  className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all disabled:opacity-50 border border-emerald-500/20"
                                  title="Quick Approve"
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button 
                                  disabled={processingId === app.id}
                                  onClick={() => handleStatusChange(app.id, 'rejected')}
                                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50 border border-red-500/20"
                                  title="Quick Reject"
                                >
                                  <XCircle size={18} />
                                </button>
                             </>
                           ) : (
                             <span className="px-3 py-2 text-slate-600 text-[9px] font-black uppercase tracking-widest bg-white/5 rounded-lg">Logs Closed</span>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.4); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Applications;