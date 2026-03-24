import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Menu, X, LogOut, Ticket, User, Calendar, Download, Shield, Share, PlusSquare } from 'lucide-react';
import toast from 'react-hot-toast';

// --- NEW: GLOBAL CATCHER ---
// This catches the install prompt instantly, even if React hasn't finished loading the Navbar yet!
let globalDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  globalDeferredPrompt = e;
});

const Navbar = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt); // Initialize with global
  const [showIOSModal, setShowIOSModal] = useState(false); 
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const user = session?.user ?? null;
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('staff@adypu.edu.in');

  useEffect(() => {
    // If it fires late, catch it here
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      globalDeferredPrompt = e; 
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

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  const isStandalone = () => {
    return ('standalone' in window.navigator) && (window.navigator.standalone);
  };

  const handleInstall = async () => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    
    if (promptToUse) {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
      }
    } else if (isIOS() && !isStandalone()) {
      setShowIOSModal(true);
    } else {
      // UPDATED: Now explicitly tells PC users about chrome://apps
      toast(
        "App is already installed! \n\n📱 Phone: Check your home screen.\n💻 PC: Open a new tab and type 'chrome://apps' to find it.", 
        { 
          icon: '✅',
          duration: 6000,
          style: { 
            borderRadius: '10px', 
            background: '#1e293b', 
            color: '#60a5fa',
            textAlign: 'left'
          }
        }
      );
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
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1d]/90 border-b border-white/5 selection:bg-blue-500/30">
        <div className="container mx-auto px-4 sm:px-6 h-18 flex justify-between items-center py-4">
          
          <Link to={user ? "/events" : "/"} className="flex items-center gap-3 group transition-all active:scale-95 shrink-0">
            <span className="text-3xl font-black tracking-tighter text-white group-hover:text-blue-400 transition-colors">
              Nexus<span className="text-blue-600">Circle</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-4">
            <button 
              onClick={handleInstall} 
              className="flex items-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-3 sm:py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest sm:tracking-[0.2em] transition-all active:scale-95 mr-1"
            >
              <Download size={14} className="sm:w-4 sm:h-4" /> 
              <span className="hidden sm:inline">Install App</span>
              <span className="inline sm:hidden">Install</span>
            </button>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
                  isOpen ? 'bg-slate-800 text-white border border-white/10' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {isOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-5 w-64 sm:w-72 bg-[#111827] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-4 border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-2xl">
                  <div className="px-6 py-3 mb-2 border-b border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] truncate">
                      {user ? `-Welcome-  ${user.email.split('@')[0]}` : "Identity Verification"}
                    </p>
                  </div>
                  
                  {user ? (
                    <>
                      <MenuLink to="/events" icon={<Calendar size={18} className="text-blue-500"/>} label="Live Events" onClick={() => setIsOpen(false)} />
                      {!isAdmin ? (
                        <>
                          <MenuLink to="/my-tickets" icon={<Ticket size={18} className="text-blue-500"/>} label="Your Passes" onClick={() => setIsOpen(false)} />
                          <MenuLink to="/profile" icon={<User size={18} className="text-blue-500"/>} label="My Profile" onClick={() => setIsOpen(false)} />
                        </>
                      ) : (
                        <MenuLink to="/admin" icon={<Shield size={18} className="text-blue-500"/>} label="Admin Control Panel" onClick={() => setIsOpen(false)} />
                      )}
                      <div className="px-6 py-3 mt-2 border-t border-white/5">
                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-black text-[10px] transition-all uppercase tracking-[0.2em]">
                          <LogOut size={18} /> Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 mt-2 mb-2">
                      <MenuLink to="/login" icon={<User size={18}/>} label="Student Login" onClick={() => setIsOpen(false)} primary />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- iOS INSTALL INSTRUCTION MODAL --- */}
      {showIOSModal && (
        <div className="fixed inset-0 z-999 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-10 sm:pb-4 animate-in fade-in duration-300">
          <div className="bg-[#111827] w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative animate-in slide-in-from-bottom-10">
            <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors">
              <X size={18} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-inner">
                <Download size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Install NexusCircle</h3>
              <p className="text-slate-400 text-sm mb-8">Install this app on your iPhone for quick access and a better experience.</p>
              
              <div className="w-full space-y-4 text-left bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="bg-white text-black p-2 rounded-lg shrink-0"><Share size={20} /></div>
                  <p className="text-sm font-medium text-slate-300">1. Tap the <span className="text-white font-bold">Share</span> button in your Safari menu bar.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white text-black p-2 rounded-lg shrink-0"><PlusSquare size={20} /></div>
                  <p className="text-sm font-medium text-slate-300">2. Scroll down and tap <span className="text-white font-bold">"Add to Home Screen"</span>.</p>
                </div>
              </div>
              
              <button onClick={() => setShowIOSModal(false)} className="mt-8 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95">
                Got it
              </button>
            </div>
            
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-15 border-l-transparent border-t-15 border-t-[#111827] border-r-15 border-r-transparent drop-shadow-lg sm:hidden"></div>
          </div>
        </div>
      )}
    </>
  );
};

const MenuLink = ({ to, icon, label, onClick, primary }) => (
  <Link to={to} onClick={onClick} className={`flex items-center gap-4 px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all group ${primary ? 'bg-blue-600 text-white rounded-2xl mx-4 mb-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
    <span className="group-hover:scale-110 transition-transform">{icon}</span> {label}
  </Link>
);

export default Navbar;