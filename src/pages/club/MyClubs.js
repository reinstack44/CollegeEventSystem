import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { Flag, Zap, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const MyClubs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [managedClubs, setManagedClubs] = useState([]);

  useEffect(() => {
    const fetchMyClubs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // 1. Find all club roles assigned to this user
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('club_id, org_id')
          .eq('email', user.email)
          .eq('role', 'club_head');

        if (rolesError || !rolesData || rolesData.length === 0) {
          toast.error("Unauthorized. You are not assigned as a Club Head.");
          return navigate('/');
        }

        // 2. Fetch the details of those specific clubs
        const clubIds = rolesData.map(role => role.club_id);
        const { data: clubsData, error: clubsError } = await supabase
          .from('clubs')
          .select('*, organizations(name)') // Join to get the Org Name
          .in('id', clubIds);

        if (clubsError) throw clubsError;
        
        setManagedClubs(clubsData || []);
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load your clubs.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyClubs();
  }, [navigate]);

  if (loading) return <div className="h-screen bg-[#0a0f1d] flex items-center justify-center"><Zap className="animate-pulse text-blue-500" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col justify-start items-start gap-2 border-b border-white/5 pb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-pink-500 transition-all font-black text-[10px] uppercase tracking-widest mb-2">
            <ArrowLeft size={14} /> Back to Profile
          </button>
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
            <Flag className="text-pink-500" size={32} /> Your Managed Clubs
          </h1>
          <p className="text-xs text-slate-400 mt-1 tracking-wide uppercase font-bold">Select a faction to launch its command center</p>
        </div>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {managedClubs.map((club) => (
            <div key={club.id} className="bg-[#111827] border border-slate-800 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-pink-500/50 transition-all shadow-xl">
              
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-bl-full pointer-events-none group-hover:bg-pink-500/20 transition-all"></div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {club.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                      <ShieldCheck size={12} className="text-emerald-500"/> Verified Head
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-black text-white leading-tight mb-2">{club.name}</h2>
                  <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">{club.organizations?.name}</p>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5">
                  <Link 
                    to={`/club/dashboard/${club.id}`}
                    className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_0_20px_rgba(236,72,153,0.2)] active:scale-95 flex items-center justify-center gap-3 group/btn"
                  >
                    Enter Dashboard <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MyClubs;