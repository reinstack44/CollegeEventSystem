import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebaseConfig'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(false);
      } else {
        navigate('/adminlogin');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/adminlogin');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition shadow-sm"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/create" className="bg-white p-10 rounded-xl shadow-md border-l-8 border-green-500 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold">➕ Create New Event</h2>
          <p className="text-gray-500 mt-2">Post event details for students to see.</p>
        </Link>
        
        <Link to="/admin/scan" className="bg-white p-10 rounded-xl shadow-md border-l-8 border-blue-500 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold text-gray-800">📸 Scan Tickets</h2>
          <p className="text-gray-500 mt-2">Verify student entry at the gate.</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;