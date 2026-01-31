import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';

const Signup = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    surname: '', 
    email: '', 
    phone: '', 
    urn: '', 
    school: '' 
  });

  const schools = ["School of Engineering", "School of Law", "School of Management"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('students').insert([formData]);
      if (error) throw error;

      alert("Registration Successful!");
      window.location.href = "/events"; 
    } catch (err) {
      alert("Registration Error: " + err.message);
    }
  };

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-blue-700">Student Registration</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="p-2 border rounded" required />
          <input name="surname" placeholder="Surname" value={formData.surname} onChange={handleChange} className="p-2 border rounded" required />
        </div>
        <input name="email" type="email" placeholder="Email ID" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        <input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        <input name="urn" placeholder="URN (Univ. Reg. No)" value={formData.urn} onChange={handleChange} className="w-full p-2 border rounded mb-4" required />
        <select name="school" value={formData.school} onChange={handleChange} className="w-full p-2 border rounded mb-6 bg-white" required>
          <option value="">Select School</option>
          {schools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
          Create Profile
        </button>
      </form>
    </div>
  );
};

export default Signup;