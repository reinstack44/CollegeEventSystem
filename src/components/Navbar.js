import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Menu, X, LogOut, Ticket, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    toast.success("Signed out successfully");
    navigate(window.location.pathname.startsWith('/admin') ? '/adminlogin' : '/login');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1d]/90 border-b border-slate-800 transition-all duration-300">
      <div className="container mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="relative group flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white transform group-hover:rotate-12 transition-transform shadow-lg shadow-blue-500/40">A</div>
          <span className="text-2xl font-black tracking-tighter text-white">
            Active<span className="text-blue-600">Arch</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="hidden sm:inline font-black text-xs uppercase tracking-widest ml-1">Portal</span>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-4 w-64 bg-slate-900 rounded-[2rem] shadow-2xl py-3 border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-300">
                <MenuLink to="/events" icon={<Calendar size={18}/>} label="Upcoming Events" onClick={() => setIsOpen(false)} />
                {user ? (
                  <>
                    <MenuLink to="/my-tickets" icon={<Ticket size={18}/>} label="My Tickets" onClick={() => setIsOpen(false)} />
                    <MenuLink to="/profile" icon={<User size={18}/>} label="Student Profile" onClick={() => setIsOpen(false)} />
                    <div className="px-4 py-2"><div className="h-px bg-slate-800 w-full" /></div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-950/30 font-black text-sm transition-colors">
                      <LogOut size={18} /> LOGOUT
                    </button>
                  </>
                ) : (
                  <MenuLink to="/login" icon={<User size={18}/>} label="Student Login" onClick={() => setIsOpen(false)} primary />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const MenuLink = ({ to, icon, label, onClick, primary }) => (
  <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-6 py-4 font-black text-xs uppercase tracking-widest transition-all ${primary ? 'text-blue-400 hover:bg-blue-900/20' : 'text-slate-200 hover:bg-slate-800'}`}>
    {icon} {label}
  </Link>
);

export default Navbar;