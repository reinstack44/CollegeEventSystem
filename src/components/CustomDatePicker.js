import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, CheckCircle2 } from 'lucide-react';

// --- HELPER: SOFT SCROLLABLE WHEEL ---
const Wheel = ({ options, value, onChange, isYear = false }) => {
  const containerRef = useRef(null);
  const itemHeight = 48; // Exactly 48px per item (h-12)

  // Align the wheel to the initial value when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const index = options.indexOf(value);
        if (index !== -1) {
          containerRef.current.scrollTop = index * itemHeight;
        }
      }
    }, 10);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value]); 

  const handleScroll = (e) => {
    const top = e.target.scrollTop;
    const index = Math.round(top / itemHeight);
    if (options[index] && options[index] !== value) {
      onChange(options[index]);
    }
  };

  const handleTap = (opt, index) => {
    onChange(opt);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 relative z-20">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative h-36 w-full overflow-y-auto snap-y snap-mandatory hide-scroll fade-mask"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="h-12 w-full shrink-0" /> {/* Top Spacer */}
        
        {options.map((opt, index) => (
          <div
            key={opt}
            onClick={() => handleTap(opt, index)}
            className="h-12 w-full shrink-0 flex items-center justify-center snap-center cursor-pointer transition-all duration-200"
          >
            <span className={`font-mono leading-none transition-all duration-200 ${
              value === opt 
                ? `text-2xl font-bold ${isYear ? 'text-blue-400' : 'text-white'} drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]` 
                : 'text-xl font-medium text-slate-600/80 scale-95 hover:text-slate-400'
            }`}>
              {opt}
            </span>
          </div>
        ))}
        
        <div className="h-12 w-full shrink-0" /> {/* Bottom Spacer */}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const CustomDatePicker = ({ value, onChange, placeholder = "YYYY-MM-DD" }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Convert DB format (YYYY-MM-DD) to state format
  const parseDate = (dateStr) => {
    if (!dateStr) {
      const now = new Date();
      return {
        y: now.getFullYear().toString(),
        m: (now.getMonth() + 1).toString().padStart(2, '0'),
        d: now.getDate().toString().padStart(2, '0')
      };
    }
    const [y, m, d] = dateStr.split('-');
    return { y, m, d };
  };

  const [tempDate, setTempDate] = useState(parseDate(value));

  // Reset temp state when modal opens
  useEffect(() => {
    if (isOpen) setTempDate(parseDate(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value]);

  // Dynamically calculate max days in the selected month/year (prevents Feb 31st)
  const maxDays = new Date(parseInt(tempDate.y), parseInt(tempDate.m), 0).getDate();
  
  // If user switches month and the current day exceeds max days, adjust it down
  useEffect(() => {
    if (parseInt(tempDate.d) > maxDays) {
      setTempDate(prev => ({ ...prev, d: maxDays.toString().padStart(2, '0') }));
    }
  }, [tempDate.m, tempDate.y, maxDays, tempDate.d]);

  const displayDate = value ? `${parseDate(value).d} / ${parseDate(value).m} / ${parseDate(value).y}` : '';

  const handleConfirm = () => {
    // Send back standard YYYY-MM-DD format for database
    onChange(`${tempDate.y}-${tempDate.m}-${tempDate.d}`);
    setIsOpen(false);
  };

  // Generate Wheel Options
  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 15 }, (_, i) => (currentYear + i).toString());
  const monthsOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const daysOptions = Array.from({ length: maxDays }, (_, i) => (i + 1).toString().padStart(2, '0'));

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-mask {
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%);
        }
      `}</style>

      {/* Trigger Button - select-none prevents highlighting */}
      <div className="relative w-full select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full p-4 bg-[#1f2937] border rounded-2xl outline-none focus:border-blue-500 text-left flex items-center justify-between transition-all active:scale-95 ${displayDate ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-700'}`}
        >
          <span className={`text-sm font-bold tracking-widest ${displayDate ? 'text-white' : 'text-slate-400'}`}>
            {displayDate || placeholder}
          </span>
          <Calendar size={16} className={displayDate ? "text-blue-500" : "text-slate-500"} />
        </button>
        <input type="text" required value={value} onChange={() => {}} className="absolute bottom-0 left-1/2 w-px h-px opacity-0 pointer-events-none" tabIndex={-1} />
      </div>

      {/* Soft Modal Overlay - select-none prevents highlighting */}
      {isOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
          
          <div className="bg-[#0b1120] border border-slate-800 rounded-[2.5rem] w-full max-w-85 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.1)] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            
            <div className="p-6 pb-2 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">Configure Date</span>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-full transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pb-8 flex flex-col items-center">
              
              {/* Soft Digital Readout */}
              <div className="w-full py-6 flex items-center justify-center mb-2">
                <div className="text-5xl font-medium font-mono tracking-tight flex items-baseline gap-2 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                  <span>{tempDate.d}</span>
                  <span className="text-blue-500/40 text-4xl">/</span>
                  <span>{tempDate.m}</span>
                  <span className="text-blue-500/40 text-4xl">/</span>
                  <span className="text-4xl text-blue-400 ml-1 font-bold drop-shadow-[0_0_12px_rgba(59,130,246,0.4)] tracking-widest">{tempDate.y}</span>
                </div>
              </div>

              {/* Compact Horizontal Drum Picker */}
              <div className="w-full max-w-72.5 mx-auto bg-[#131c31]/50 p-5 rounded-4xl border border-slate-800/80 shadow-inner">
                
                {/* Labels Row */}
                <div className="flex justify-between w-full mb-4 px-3">
                  <span className="flex-1 text-center text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Day</span>
                  <div className="w-2 shrink-0" />
                  <span className="flex-1 text-center text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Month</span>
                  <div className="w-2 shrink-0" />
                  <span className="flex-1 text-center text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Year</span>
                </div>

                {/* Wheels Container */}
                <div className="relative flex justify-between items-center w-full h-36">
                  
                  {/* Perfectly Centered Highlight Band */}
                  <div className="absolute top-12 left-0 right-0 h-12 bg-blue-500/10 rounded-xl pointer-events-none z-10 shadow-[inset_0_0_12px_rgba(59,130,246,0.05)] border border-blue-500/20" />

                  <Wheel options={daysOptions} value={tempDate.d} onChange={v => setTempDate({...tempDate, d: v})} />
                  <div className="h-36 flex items-center justify-center z-20 w-4 shrink-0"><div className="text-xl font-bold text-slate-700 leading-none pb-1">/</div></div>
                  <Wheel options={monthsOptions} value={tempDate.m} onChange={v => setTempDate({...tempDate, m: v})} />
                  <div className="h-36 flex items-center justify-center z-20 w-4 shrink-0"><div className="text-xl font-bold text-slate-700 leading-none pb-1">/</div></div>
                  <Wheel options={yearsOptions} value={tempDate.y} onChange={v => setTempDate({...tempDate, y: v})} isYear={true} />
                </div>

              </div>
            </div>

            {/* Soft Confirm Button */}
            <div className="p-6 pt-0 mt-auto">
              <button 
                type="button"
                onClick={handleConfirm}
                className="w-full flex justify-center items-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-bold text-xs uppercase tracking-[0.15em] shadow-[0_8px_20px_rgba(37,99,235,0.2)] active:scale-95 transition-all"
              >
                <CheckCircle2 size={18} /> Confirm Date
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default CustomDatePicker;