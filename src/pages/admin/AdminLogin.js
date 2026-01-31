import React, { useState } from 'react';
import { auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      // Direct login - since you add them manually, 
      // they don't need to go through the student verification flow
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin'); 
    } catch (error) {
      alert("Unauthorized: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form 
        onSubmit={handleAdminLogin} 
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
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
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition"
          >
            LOGIN AS ADMIN
          </button>
        </div>
        
        <button 
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-gray-500 hover:underline w-full text-center"
        >
          Back to Student Login
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;