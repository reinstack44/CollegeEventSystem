import React, { useState, useEffect } from 'react';
import { supabase } from '../../sbclient/supabaseClient';

const CompleteRegistration = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    surname: '', 
    phone: '', 
    urn: '', 
    school: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const schools = ["School of Engineering", "School of Law", "School of Management"];

  useEffect(() => {
    // Check if user is actually authenticated via the magic link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Session expired or invalid link. Please sign up again.");
        window.location.href = "/";
      }
    };
    checkSession();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Set the user's permanent password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: formData.password
      });
      if (authError) throw authError;

      // 2. Get current user details
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Save profile details to your 'students' table
      const { error: dbError } = await supabase.from('students').insert([{
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        urn: formData.urn,
        school: formData.school,
        email: user.email // Email is pulled from the auth session
      }]);

      if (dbError) throw dbError;

      alert("Success! Profile created and account secured.");
      window.location.href = "/events";
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-10 px-4 min-h-screen bg-gray-50">
      <form onSubmit={handleFinalSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-black mb-2 text-blue-700">Step 2: Complete Profile</h2>
        <p className="text-gray-500 mb-6 text-sm">Fill in your details to secure your account.</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="name" placeholder="First Name" onChange={handleChange} className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
          <input name="surname" placeholder="Last Name" onChange={handleChange} className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        
        <input name="password" type="password" placeholder="Set New Password" onChange={handleChange} className="w-full p-3 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500" required />
        <input name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full p-3 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500" required />
        <input name="urn" placeholder="URN (Univ. Reg. No)" onChange={handleChange} className="w-full p-3 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500" required />
        
        <select name="school" onChange={handleChange} className="w-full p-3 border rounded-xl mb-6 bg-white outline-none focus:ring-2 focus:ring-blue-500" required>
          <option value="">Select Your School</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button 
          type="submit" 
          disabled={loading}
          className={`w-full text-white py-4 rounded-xl font-black text-lg transition shadow-lg ${
            loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 shadow-green-100"
          }`}
        >
          {loading ? "Saving Profile..." : "FINISH REGISTRATION"}
        </button>
      </form>
    </div>
  );
};

export default CompleteRegistration;