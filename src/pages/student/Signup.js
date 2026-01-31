import React, { useState } from 'react';
import { auth } from '../../firebaseConfig';
import { sendSignInLinkToEmail } from "firebase/auth";

const Signup = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email.endsWith('@adypu.edu.in')) {
      alert("Please use your official @adypu.edu.in email.");
      return;
    }

    setLoading(true);
    const actionCodeSettings = {
      url: 'http://localhost:3000/complete-registration', // Redirect URL
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      alert("Verification link sent! Check your university email inbox.");
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
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          {loading ? "Sending..." : "Send Verification Link"}
        </button>
      </form>
    </div>
  );
};

export default Signup;