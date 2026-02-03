import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Menu, X, LogOut, Ticket, User, Calendar, Download, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));

    // PWA Install Logic
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Requirement 1: Click anywhere on screen to close menu
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    toast.success("Signed out successfully");
    navigate('/login');
  };

  const isAdmin = user?.email?.includes('admin');

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1d]/90 border-b border-slate-800">
      <div className="container mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/40">A</div>
          <span className="text-2xl font-black tracking-tighter text-white">Active<span className="text-blue-600">Arch</span></span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Requirement 9: Install App Button */}
          {deferredPrompt && (
            <button onClick={handleInstall} className="hidden md:flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors mr-2">
              <Download size={16} /> Install App
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              {isOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="hidden sm:inline font-black text-xs uppercase tracking-widest ml-1">Portal</span>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-4 w-64 bg-slate-900 rounded-[2rem] shadow-2xl py-3 border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-300">
                <MenuLink to="/events" icon={<Calendar size={18}/>} label="Events" onClick={() => setIsOpen(false)} />
                
                {user ? (
                  <>
                    {!isAdmin ? (
                      <>
                        <MenuLink to="/my-tickets" icon={<Ticket size={18}/>} label="My Tickets" onClick={() => setIsOpen(false)} />
                        <MenuLink to="/profile" icon={<User size={18}/>} label="Profile" onClick={() => setIsOpen(false)} />
                      </>
                    ) : (
                      <>
                        <MenuLink to="/admin" icon={<Shield size={18}/>} label="Command Center" onClick={() => setIsOpen(false)} />
                        <MenuLink to="/admin/create" icon={<Calendar size={18}/>} label="Create Event" onClick={() => setIsOpen(false)} />
                      </>
                    )}
                    <div className="px-4 py-2"><div className="h-px bg-slate-800 w-full" /></div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-red-950/30 font-black text-sm transition-colors uppercase tracking-widest">
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                ) : (
                  <MenuLink to="/login" icon={<User size={18}/>} label="Login" onClick={() => setIsOpen(false)} primary />
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