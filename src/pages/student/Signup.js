import React, { useState } from 'react';
import { supabase } from '../../sbclient/supabaseClient'; // Import Supabase client

const Signup = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendLink = async (e) => {
    e.preventDefault();
    
    // Safety check for university domain
    if (!email.endsWith('@adypu.edu.in')) {
      alert("Please use your official @adypu.edu.in email.");
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // This must match your Site URL in Supabase Auth settings
          emailRedirectTo: 'https://activearch.vercel.app/complete-registration',
        },
      });

      if (error) throw error;

      // Store email in local storage to identify the user during Step 2
      window.localStorage.setItem('emailForSignIn', email);
      setMessage("✅ Verification link sent! Check your university inbox.");
      
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-20 px-4">
      <form onSubmit={handleSendLink} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-3xl font-bold mb-2 text-blue-700 text-center">Step 1: Verify Email</h2>
        <p className="text-gray-500 text-center mb-8 text-sm">Use your ADYPU ID to start registration.</p>
        
        <input 
          type="email" 
          placeholder="yourname@adypu.edu.in" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border-2 border-gray-100 rounded-xl mb-6 outline-none focus:border-blue-500"
          required 
        />
        
        <button 
          type="submit" 
          disabled={loading}
          className={`w-full text-white py-4 rounded-xl font-bold transition shadow-lg ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
          }`}
        >
          {loading ? "Sending Magic Link..." : "Send Verification Link"}
        </button>

        {message && (
          <p className="mt-4 text-center text-green-600 font-medium animate-pulse">
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default Signup;