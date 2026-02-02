import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Successful login
      navigate("/events"); 
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return alert("Please enter your email address first.");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://activearch.vercel.app/complete-registration', 
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset link sent to your inbox!");
    }
  };

  return (
    <div className="relative min-h-screen flex justify-center items-center py-20 px-4 bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-50">
        <h2 className="text-3xl font-black mb-2 text-gray-800">Welcome Back</h2>
        <p className="text-gray-400 mb-8">Login to access your event tickets.</p>

        <input 
          type="email" 
          placeholder="Email Address" 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-4 outline-none focus:border-blue-500 transition-all" 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-2 outline-none focus:border-blue-500 transition-all" 
          required 
        />

        <button 
          type="button" 
          onClick={handleForgotPassword} 
          className="text-sm text-blue-600 font-bold mb-6 hover:underline"
        >
          Forgot Password?
        </button>

        <button 
          type="submit" 
          disabled={loading}
          className={`w-full text-white py-4 rounded-2xl font-black text-lg shadow-xl transition-all ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
          }`}
        >
          {loading ? "AUTHENTICATING..." : "LOG IN"}
        </button>
      </form>

      {/* Admin Login Button */}
      <button 
        onClick={() => navigate('/adminlogin')}
        className="fixed bottom-5 right-5 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-black transition-all"
      >
        Admin Login
      </button>
    </div>
  );
};

export default Login;