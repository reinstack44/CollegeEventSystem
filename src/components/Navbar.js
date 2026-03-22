import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Menu, X, LogOut, Ticket, User, Calendar, Download, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const user = session?.user ?? null;
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('staff@adypu.edu.in');

  useEffect(() => {
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    setIsOpen(false);
    if (error) {
      toast.error("Logout failed");
    } else {
      toast.success("Signed out successfully");
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1d]/90 border-b border-white/5 selection:bg-blue-500/30">
      <div className="container mx-auto px-6 h-18 flex justify-between items-center py-4">
        
        <Link 
          to={user ? "/events" : "/login"} 
          className="flex items-center gap-3 group transition-all active:scale-95"
        >
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/40 group-hover:shadow-blue-500/60 transition-all italic text-xl">
            A
          </div>
          <span className="text-2xl font-black tracking-tighter text-white uppercase group-hover:text-blue-400 transition-colors">
            Active<span className="text-blue-600">Arch</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {deferredPrompt && (
            <button 
              onClick={handleInstall} 
              className="hidden lg:flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors mr-2"
            >
              <Download size={16} /> Install App
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                isOpen 
                ? 'bg-slate-800 text-white border border-white/10' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-5 w-72 bg-[#111827] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-4 border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-2xl">
                <div className="px-6 py-3 mb-2 border-b border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    {user ? `-Welcome-  ${user.email.split('@')[0]}` : "Identity Verification"}
                  </p>
                </div>
                
                {user ? (
                  <>
                    <MenuLink to="/events" icon={<Calendar size={18} className="text-blue-500"/>} label="Live Events" onClick={() => setIsOpen(false)} />
                    
                    {!isAdmin ? (
                      <>
                        <MenuLink to="/my-tickets" icon={<Ticket size={18} className="text-blue-500"/>} label="Your Tickets" onClick={() => setIsOpen(false)} />
                        <MenuLink to="/profile" icon={<User size={18} className="text-blue-500"/>} label="My Profile" onClick={() => setIsOpen(false)} />
                      </>
                    ) : (
                      <>
                        <MenuLink to="/admin" icon={<Shield size={18} className="text-blue-500"/>} label="Admin Control Panel" onClick={() => setIsOpen(false)} />
                      </>
                    )}
                    
                    <div className="px-6 py-3 mt-2 border-t border-white/5">
                      <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-4 px-4 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-black text-[10px] transition-all uppercase tracking-[0.2em]"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-4 mt-2 mb-2">
                    <MenuLink 
                      to="/login" 
                      icon={<User size={18}/>} 
                      label="Student Login" 
                      onClick={() => setIsOpen(false)} 
                      primary 
                    />
                  </div>
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
  <Link 
    to={to} 
    onClick={onClick} 
    className={`flex items-center gap-4 px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all group ${
      primary 
      ? 'bg-blue-600 text-white rounded-2xl mx-4 mb-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20' 
      : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`}
  >
    <span className="group-hover:scale-110 transition-transform">{icon}</span> {label}
  </Link>
);

export default Navbar;