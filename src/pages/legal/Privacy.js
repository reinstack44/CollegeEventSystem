import React, { useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  // Forces the page to start at the absolute top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest mb-10">
          <ArrowLeft size={14} /> Back to Events
        </button>

        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><FileText className="text-emerald-500" size={32} /></div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Privacy Policy</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Data Protection & Privacy</p>
          </div>
        </div>

        <div className="space-y-8 leading-relaxed text-sm md:text-base">
          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">1. Information We Collect</h2>
            <p className="text-slate-400 mb-3">To provide a seamless ticketing experience, NexusCircle collects the following data:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2">
              <li><strong className="text-white">Identity Data:</strong> Full name, university email address, and student ID.</li>
              <li><strong className="text-white">Transaction Data:</strong> Razorpay Order IDs and Payment Signatures (We do NOT store card or bank details).</li>
              <li><strong className="text-white">Usage Data:</strong> Event preferences, booking history, and check-in timestamps.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">2. How We Use Your Data</h2>
            <p className="text-slate-400">Your data is strictly used for platform functionality. We use your email to authenticate your account and issue secure digital passes. Transaction data is used solely to verify payment status and prevent fraud.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">3. Data Sharing & Third Parties</h2>
            <p className="text-slate-400">We do not sell, trade, or rent your personal information to third parties. Your data is only shared with essential service providers:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2 mt-3">
              <li><strong className="text-white">Razorpay:</strong> For secure payment processing.</li>
              <li><strong className="text-white">Event Organizers:</strong> Organizers receive attendee lists (Name/Email) for verification and crowd management.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">4. Security Infrastructure</h2>
            <p className="text-slate-400">NexusCircle relies on industry-standard encryption and Supabase Auth protocols to protect your personal data against unauthorized access, alteration, or destruction.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;