import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if user exists and if their email belongs to the admin list
      // Replace these emails with your actual admin emails
      const adminEmails = ['admin@activearch.in', 'staff@adypu.edu.in'];
      
      if (user && adminEmails.includes(user.email)) {
        setAuthorized(true);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return authorized ? children : <Navigate to="/adminlogin" replace />;
};

export default ProtectedRoute;