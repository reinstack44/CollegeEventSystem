import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative w-full pt-8 pb-6 mt-10 z-20 border-t border-white/5">
      {/* Reduced gap from gap-6 to gap-4 to pull elements closer */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col gap-4">
        
        {/* Top Row: Brand, Badge & Links */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

          {/* Brand & Compact MSME Badge */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white leading-none drop-shadow-sm">
              NexusCircle
            </h3>
            
            <div className="flex items-center gap-2 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] w-fit cursor-default transition-all hover:bg-emerald-500/20">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0 md:w-4 md:h-4" />
              <div className="flex flex-col items-start justify-center">
                <span className="text-[5px] md:text-[6px] text-emerald-500/80 font-black uppercase tracking-[0.2em] leading-none mb-0.5">Govt. of India</span>
                <span className="text-[8px] md:text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-none">MSME Registered</span>
              </div>
            </div>
          </div>

          {/* Minimalist Horizontal Links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Link to="/terms" className="hover:text-blue-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy</Link>
            <Link to="/refunds" className="hover:text-blue-400 transition-colors">Refunds</Link>
            
            {/* Idle Contact Element */}
            <span className="opacity-50 cursor-not-allowed select-none" title="Coming Soon">Contact Us</span>
          </div>

        </div>

        {/* Bottom Row: Copyright & Love */}
        {/* Reduced pt-5 md:pt-6 to just pt-4 to minimize the vertical space above the line */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/5 opacity-60 hover:opacity-100 transition-opacity duration-300">
          <p className="text-slate-500 text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} NexusCircle. All Rights Reserved.
          </p>
          <p className="flex items-center gap-1.5 text-[7px] md:text-[8px] text-slate-500 font-bold uppercase tracking-widest">
            Specialized for ADYPU <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" />
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;