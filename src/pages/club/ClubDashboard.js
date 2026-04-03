import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../sbclient/supabaseClient';
import { 
  Flag, PlusCircle, ScanLine, 
  ArrowRight, Zap, ArrowLeft, Edit3,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClubDashboard = () => {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const [loading, setLoading] = useState(true);
  const [clubDetails, setClubDetails] = useState(null);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // Verify they are the head of THIS specific club
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', user.email)
          .eq('club_id', clubId)
          .eq('role', 'club_head')
          .single();

        if (roleError || !roleData) {
          toast.error("Unauthorized access to this club.");
          return navigate('/');
        }

        // Fetch Club Details
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', clubId)
          .single();

        if (clubError) throw clubError;
        setClubDetails(clubData);

      } catch (error) {
        console.error("Dashboard Error:", error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [clubId, navigate]);

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#0a0f1d]"><Zap className="animate-pulse text-pink-500" size={48}/></div>;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl text-left">
      
      <div className="w-full mb-4 sm:mb-6 flex justify-start">
        <button onClick={() => navigate('/club/my-clubs')} className="flex items-center gap-2 text-slate-500 hover:text-pink-500 transition-all font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to My Clubs
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-3.5 bg-pink-600 text-white rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.3)] shrink-0">
            <Flag className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic leading-none truncate max-w-sm md:max-w-xl">
              {clubDetails?.name || 'Club'} Control
            </h2>
            <p className="text-slate-500 font-medium text-[10px] sm:text-sm mt-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Commander Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* CLUB CONTROL CARDS */}
      {/* Note: In Phase 6, we will update these routes to pass the ?clubId param so the tools scope automatically */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <ClubCard to={`/admin/create?club_id=${clubId}`} icon={<PlusCircle className="text-green-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Create" desc="New Club Event." color="border-green-500" />
        <ClubCard to={`/admin/events?club_id=${clubId}`} icon={<Edit3 className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Manage Events" desc="Modify & Delete." color="border-orange-500" />
        <ClubCard to={`/admin/scan?club_id=${clubId}`} icon={<ScanLine className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Scanner" desc="QR Gate Control." color="border-blue-500" />
        <ClubCard to={`/admin/master-registry?club_id=${clubId}`} icon={<Database className="text-purple-500 w-5 h-5 sm:w-7 sm:h-7" />} title="Database" desc="Club Data System." color="border-purple-500" /> 
      </div>

    </div>
  );
};

const ClubCard = ({ to, icon, title, desc, color }) => (
  <Link to={to} className={`group bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-4xl shadow-xl border-l-4 sm:border-l-[6px] ${color} transition-all hover:-translate-y-1 flex flex-col justify-between`}>
    <div className="flex items-start justify-between mb-4 sm:mb-6">
      <div className="p-2.5 sm:p-3 bg-slate-800 rounded-xl sm:rounded-2xl shrink-0">{icon}</div>
      <ArrowRight className="text-slate-400 group-hover:text-pink-500 transition-colors w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
    </div>
    <div>
      <h3 className="text-base sm:text-xl font-black text-white mb-0.5 sm:mb-1 truncate">{title}</h3>
      <p className="text-slate-400 font-bold text-[9px] sm:text-xs leading-tight sm:leading-relaxed uppercase tracking-widest truncate">{desc}</p>
    </div>
  </Link>
);

export default ClubDashboard;