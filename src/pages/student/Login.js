import React, { useState } from 'react';
import { auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from 'react-router-dom'; // 1. Import the hook

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // 2. Initialize the hook

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // It's better to use navigate here too instead of window.location
      navigate("/events"); 
    } catch (error) {
      alert("Invalid credentials or " + error.message);
    }
  };

  const handleForgotPassword = () => {
    if (!email) return alert("Enter your email first");
    sendPasswordResetEmail(auth, email)
      .then(() => alert("Reset link sent to your inbox!"))
      .catch((err) => alert(err.message));
  };

  return (
    <div className="relative min-h-screen flex justify-center items-center py-20 px-4">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-50">
        <h2 className="text-3xl font-black mb-2 text-gray-800">Welcome Back</h2>
        <p className="text-gray-400 mb-8">Login to access your event tickets.</p>

        <input 
          type="email" placeholder="Email Address" 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-4 outline-none focus:border-blue-500" required 
        />
        <input 
          type="password" placeholder="Password" 
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 border-2 border-gray-100 rounded-2xl mb-2 outline-none focus:border-blue-500" required 
        />

        <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 font-bold mb-6 hover:underline">
          Forgot Password?
        </button>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition">
          LOG IN
        </button>
      </form>

      {/* Admin Login Button - Moved outside <form> to handle positioning correctly */}
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