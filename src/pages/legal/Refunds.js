import React, { useEffect } from 'react';
import { ArrowLeft, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Refunds = () => {
  const navigate = useNavigate();

  // Forces the page to start at the absolute top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-6 md:p-12 selection:bg-red-500/30">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest mb-10">
          <ArrowLeft size={14} /> Back to Events
        </button>

        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20"><RefreshCcw className="text-red-500" size={32} /></div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Refund Policy</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Strict Non-Refundable Agreement</p>
          </div>
        </div>

        <div className="space-y-8 leading-relaxed text-sm md:text-base">
          
          <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4">
            <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-lg font-black text-red-400 uppercase tracking-wide mb-2">Strict No-Refund Policy</h2>
              <p className="text-slate-300">Once a transaction is confirmed and a digital pass is generated, <strong className="text-white">all ticket sales are final and strictly non-refundable.</strong> By proceeding with a payment on NexusCircle, you acknowledge and agree to this condition.</p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">1. Non-Attendance</h2>
            <p className="text-slate-400">If you purchase a pass but fail to attend the event for any personal, academic, or medical reason, no refunds will be issued. Passes cannot be carried forward to future events.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">2. Exceptions (Event Cancellation)</h2>
            <p className="text-slate-400">The only exception to our strict no-refund policy is in the event of an official cancellation by the event organizers. If an event is cancelled entirely:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2 mt-3">
              <li>The ticket face value will be refunded automatically to the original payment source.</li>
              <li>Platform fees and Razorpay gateway fees (approx. 2.5%) are <strong className="text-white">non-refundable</strong> under any circumstances.</li>
              <li>Processing times for refunds in the case of cancellation typically range from 5 to 7 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-wide mb-4">3. Failed Transactions</h2>
            <p className="text-slate-400">If a payment amount is deducted from your bank account but a digital pass is not generated due to a network failure, the Razorpay gateway will automatically initiate a refund. Please allow 3-5 business days for the amount to reflect back in your account.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Refunds;