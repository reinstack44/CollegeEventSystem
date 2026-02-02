import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Destructure ONLY error here to satisfy ESLint
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      navigate('/admin'); 
    } catch (error) {
      alert("Unauthorized: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-black mb-6 text-gray-800 border-b pb-2">Admin Portal</h2>
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Admin Email" 
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-800"
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-800"
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition disabled:bg-gray-400"
          >
            {loading ? "VERIFYING..." : "LOGIN AS ADMIN"}
          </button>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/login')}
          className="mt-4 text-sm text-gray-500 hover:underline w-full text-center"
        >
          Back to Student Login
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;