import React, { useState, useEffect } from 'react';
import { auth } from '../../firebaseConfig';
import { isSignInWithEmailLink, signInWithEmailLink, updatePassword } from "firebase/auth";
import { supabase } from '../../sbclient/supabaseClient';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ name: '', surname: '', phone: '', urn: '', school: '', password: '' });
  const schools = ["School of Engineering", "School of Law", "School of Management"];

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      window.location.href = "/"; // If no link, go home
    }
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    const email = window.localStorage.getItem('emailForSignIn');

    try {
      // 1. Authenticate the session via link
      const result = await signInWithEmailLink(auth, email, window.location.href);
      
      // 2. Set the user's password in Firebase
      await updatePassword(result.user, formData.password);

      // 3. Save profile to Supabase
      const { error } = await supabase.from('students').insert([{
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        urn: formData.urn,
        school: formData.school,
        email: result.user.email
      }]);

      if (error) throw error;

      alert("Success! Profile created and account secured.");
      window.localStorage.removeItem('emailForSignIn');
      window.location.href = "/events";
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <form onSubmit={handleFinalSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-700">Step 2: Complete Profile</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="name" placeholder="Name" onChange={handleChange} className="p-2 border rounded" required />
          <input name="surname" placeholder="Surname" onChange={handleChange} className="p-2 border rounded" required />
        </div>
        
        <input name="password" type="password" placeholder="Set Password" onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        <input name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        <input name="urn" placeholder="URN (Univ. Reg. No)" onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        
        <select name="school" onChange={handleChange} className="w-full p-2 border rounded mb-6 bg-white" required>
          <option value="">Select School</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
          Finish & Secure Account
        </button>
      </form>
    </div>
  );
};

export default CompleteRegistration;