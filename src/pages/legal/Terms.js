import React, { useEffect } from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
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
          <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Scale className="text-blue-500" size={32} /></div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Terms of Service</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-8 leading-relaxed text-sm md:text-base">
          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-400">By accessing and using the NexusCircle platform, you accept and agree to be bound by the terms and provisions of this agreement. NexusCircle operates as an independent ticketing and event management ecosystem specialized for ADYPU events.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">2. Ticket Booking & Digital Passes</h2>
            <p className="text-slate-400 mb-3">All tickets booked through NexusCircle are issued as secure digital QR passes. You are responsible for maintaining the confidentiality of your digital pass. NexusCircle is not liable for unauthorized access resulting from shared QR codes.</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2">
              <li>Passes are strictly non-transferable unless explicitly stated by the event organizer.</li>
              <li>A valid student ID may be required alongside the digital pass for entry.</li>
              <li>NexusCircle reserves the right to revoke passes if fraudulent activity is detected.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">3. Payments & Security</h2>
            <p className="text-slate-400">All paid transactions are processed securely through Razorpay. NexusCircle does not store your banking credentials, UPI PINs, or credit card data. By initiating a transaction, you agree to Razorpay's processing terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">4. Code of Conduct</h2>
            <p className="text-slate-400">Users must maintain a standard of decorum at all events booked through this platform. Event organizers and campus security reserve the right of admission and may eject individuals violating university guidelines without refund.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;