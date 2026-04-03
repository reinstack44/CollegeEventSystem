import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Building, User, Mail, Lock, Globe, FileBadge, 
  Camera, Briefcase, ArrowLeft, AlertOctagon, MailPlus, CheckCircle, X 
} from 'lucide-react';

const RegisterOrg = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingOrg, setExistingOrg] = useState(null);

  const [formData, setFormData] = useState({
    name: '', surname: '',
    orgMail: '', domain: '@', password: '',
    employeeId: '',
    idCardFile: null, livePhotoFile: null
  });

  const idCardInputRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const handleDomainChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('@')) val = '@' + val.replace(/@/g, '');
    setFormData({ ...formData, domain: val });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error("File size must be under 5MB");
      setFormData({ ...formData, [type]: file });
    }
  };

  const clearIdCard = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData({ ...formData, idCardFile: null });
    if (idCardInputRef.current) idCardInputRef.current.value = '';
  };

  const clearLivePhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData({ ...formData, livePhotoFile: null });
  };

  const startCamera = async (e) => {
    e.preventDefault();
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setIsCameraOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Camera access denied. Please enable camera permissions in your browser.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `live_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFormData(prev => ({ ...prev, livePhotoFile: file }));
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const checkDomainCollision = async (domainToCheck) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, head_name, head_email, status')
        .eq('domain', domainToCheck)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; 

      if (data) {
        if (data.status === 'rejected') {
          await supabase.from('organizations').delete().eq('id', data.id);
          return false; 
        }
        setExistingOrg(data);
        return true; 
      }
      return false; 
    } catch (error) {
      console.error("Collision Check Error:", error);
      toast.error("Network error while verifying domain.");
      return true; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.domain === '@' || formData.domain.length < 5) {
      return toast.error("Please enter a valid organization domain (e.g., @stanford.edu)");
    }
    if (!formData.idCardFile || !formData.livePhotoFile) {
      return toast.error("ID Card and Live Photo are strictly required for security verification.");
    }

    setLoading(true);
    const loadingToast = toast.loading("Verifying organization details...");

    try {
      const isCollision = await checkDomainCollision(formData.domain);
      if (isCollision) {
        toast.dismiss(loadingToast);
        setLoading(false);
        return;
      }

      toast.loading("Uploading secure documents...", { id: loadingToast });

      const idCardPath = `id_cards/${Date.now()}_${formData.idCardFile.name}`;
      const photoPath = `live_photos/${Date.now()}_${formData.livePhotoFile.name}`;
      
      const { error: uploadError1 } = await supabase.storage.from('org-verifications').upload(idCardPath, formData.idCardFile);
      if (uploadError1) throw new Error(`ID Upload Failed: ${uploadError1.message}`);

      const { error: uploadError2 } = await supabase.storage.from('org-verifications').upload(photoPath, formData.livePhotoFile);
      if (uploadError2) throw new Error(`Photo Upload Failed: ${uploadError2.message}`);

      toast.loading("Creating Organization Profile...", { id: loadingToast });

      const { data: orgData, error: orgError } = await supabase.from('organizations').insert([{
        name: formData.domain.replace('@', '').split('.')[0].toUpperCase(),
        domain: formData.domain,
        head_name: `${formData.name} ${formData.surname}`,
        head_email: formData.orgMail,
        id_card_path: idCardPath,      
        live_photo_path: photoPath     
      }]).select().single();

      if (orgError) throw new Error(`Org DB Error: ${orgError.message}`);

      const { error: authError } = await supabase.auth.signUp({
        email: formData.orgMail,
        password: formData.password,
        options: {
          data: {
            first_name: formData.name,
            last_name: formData.surname,
            is_org_head: true
          }
        }
      });

      if (authError && !authError.message.toLowerCase().includes('already registered')) {
        throw new Error(`Auth Error: ${authError.message}`);
      }

      // Clear any old roles for this email to prevent unique constraint crashes
      await supabase.from('user_roles').delete().eq('email', formData.orgMail);

      const { error: roleError } = await supabase.from('user_roles').insert([{
        email: formData.orgMail,
        role: 'org_head',
        org_id: orgData.id
      }]);

      if (roleError) throw new Error(`Role DB Error: ${roleError.message}`);

      toast.success("Application Submitted Successfully!", { id: loadingToast });
      navigate('/pending-approval');

    } catch (error) {
      console.error("Detailed Error:", error);
      // This will now print the exact reason it failed to the screen!
      toast.error(`FAILED: ${error.message || "Unknown Error"}`, { id: loadingToast, duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 p-4 md:p-8 flex justify-center items-center relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-1000 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#111827] rounded-4xl overflow-hidden border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 flex justify-between items-center border-b border-slate-800">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Live Capture
              </h3>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <X size={20}/>
              </button>
            </div>
            
            <div className="relative bg-black aspect-3/4 sm:aspect-video flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
              <div className="absolute inset-0 pointer-events-none border-[6px] border-white/10 m-8 rounded-full md:rounded-3xl border-dashed"></div>
            </div>

            <div className="p-6 flex justify-center bg-[#0a0f1d]">
              <button 
                onClick={capturePhoto} 
                className="w-16 h-16 rounded-full border-4 border-slate-400 flex items-center justify-center hover:border-blue-500 transition-all group"
              >
                <div className="w-12 h-12 bg-white group-hover:bg-blue-500 rounded-full group-hover:scale-90 transition-all"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {existingOrg && (
        <div className="fixed inset-0 z-999 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-red-500/30 rounded-4xl p-8 md:p-10 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertOctagon size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Domain Registered</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An ecosystem for <strong className="text-white">{formData.domain}</strong> already exists on NexusCircle. Only one Event Head is permitted per organization.
            </p>
            
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 text-left mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Registered Event Head</p>
              <p className="text-white font-bold text-lg">{existingOrg.head_name}</p>
              <p className="text-blue-400 text-sm font-medium">{existingOrg.head_email}</p>
            </div>

            <div className="flex flex-col gap-3">
              <a href="mailto:support.nexuscircle@gmail.com" className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                <MailPlus size={16} /> Dispute / Contact Support
              </a>
              <button onClick={() => setExistingOrg(null)} className="w-full py-4 bg-transparent hover:bg-white/5 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl bg-[#111827]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        
        <div className="p-6 md:p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-all font-black text-[10px] uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to Home
            </button>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">Partner Your Org</h1>
            <p className="text-xs text-slate-400 mt-2 tracking-wide">Bring the NexusCircle ecosystem to your university.</p>
          </div>
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0">
            <Building size={14} /> Enterprise Registration
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* COLUMN 1: Organization Credentials */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">1. Access Credentials</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Globe size={14} /> Organization Domain <span className="text-red-500">*</span>
                </label>
                <input required type="text" value={formData.domain} onChange={handleDomainChange} placeholder="@organization.edu.in" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm transition-all" />
                <p className="text-[9px] text-slate-500 ml-2">Must start with @ (e.g., @harvard.edu)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Mail size={14} /> Official Org Mail ID <span className="text-red-500">*</span>
                </label>
                <input required type="email" value={formData.orgMail} onChange={e => setFormData({...formData, orgMail: e.target.value})} placeholder="admin@organization.edu.in" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Lock size={14} /> Admin Password <span className="text-red-500">*</span>
                </label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" minLength={8} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm transition-all" />
              </div>
            </div>

            {/* COLUMN 2: Identity & Verification */}
            <div className="space-y-6">
               <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-3">2. Identity Verification</h3>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">Name <span className="text-red-500">*</span></label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">Surname <span className="text-red-500">*</span></label>
                   <input required type="text" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><Briefcase size={14}/> Designated Post</label>
                   <input readOnly value="Event Head Of Org" className="w-full p-4 bg-[#1f2937]/50 border border-slate-700/50 rounded-2xl outline-none text-blue-400 font-bold text-xs cursor-not-allowed" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><User size={14}/> Employee ID</label>
                   <input type="text" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} placeholder="Optional (-)" className="w-full p-4 bg-[#1f2937] border border-slate-700 rounded-2xl outline-none focus:border-blue-500 text-white text-sm" />
                 </div>
               </div>

               <div className="space-y-4 pt-2">
                 
                 <div className={`relative flex items-center justify-between bg-[#1f2937] border border-slate-700 rounded-2xl p-4 transition-all ${!formData.idCardFile && 'hover:border-blue-500'}`}>
                    <div className="flex items-center gap-4 grow relative overflow-hidden">
                      <input 
                        ref={idCardInputRef}
                        required={!formData.idCardFile} 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileChange(e, 'idCardFile')} 
                        disabled={!!formData.idCardFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-default" 
                      />
                      <div className={`p-3 rounded-xl shrink-0 ${formData.idCardFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {formData.idCardFile ? <CheckCircle size={20} /> : <FileBadge size={20} />}
                      </div>
                      <div className="truncate">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload ID Card <span className="text-red-500">*</span></p>
                        <p className="text-sm font-medium text-white truncate">{formData.idCardFile ? formData.idCardFile.name : 'Tap to select file'}</p>
                      </div>
                    </div>
                    {formData.idCardFile && (
                      <button onClick={clearIdCard} className="relative z-20 ml-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0">
                        <X size={16} />
                      </button>
                    )}
                 </div>

                 <div className="relative flex items-center justify-between bg-[#1f2937] border border-slate-700 rounded-2xl p-4 transition-all hover:border-blue-500">
                    <button 
                      onClick={startCamera}
                      disabled={!!formData.livePhotoFile}
                      className="absolute inset-0 w-full h-full z-10 rounded-2xl disabled:cursor-default"
                    ></button>
                    <div className="flex items-center gap-4 grow pointer-events-none relative z-0">
                      <div className={`p-3 rounded-xl shrink-0 transition-colors ${formData.livePhotoFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {formData.livePhotoFile ? <CheckCircle size={20} /> : <Camera size={20} />}
                      </div>
                      <div className="truncate">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capture Live Photo <span className="text-red-500">*</span></p>
                        <p className="text-sm font-medium text-white truncate">{formData.livePhotoFile ? 'Live Photo Secured' : 'Tap to open camera'}</p>
                      </div>
                    </div>
                    {formData.livePhotoFile && (
                      <button onClick={clearLivePhoto} className="relative z-20 ml-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0">
                        <X size={16} />
                      </button>
                    )}
                 </div>

               </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <button type="submit" disabled={loading} className="w-full md:w-auto md:min-w-75 float-right bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-5 px-8 rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-[0_0_30px_rgba(37,99,235,0.2)] active:scale-95 flex items-center justify-center gap-3">
              {loading ? <span className="animate-pulse">Processing...</span> : 'Submit Application'}
            </button>
            <div className="clear-both"></div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegisterOrg;