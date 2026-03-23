import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Zap } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Authorized Admin/Staff Emails
      const adminEmails = ['admin@nexuscircle.in', 'staff@adypu.edu.in', 'prathamesh@adypu.edu.in'];
      
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
        <Zap className="animate-pulse text-blue-500" size={48} />
      </div>
    );
  }

  // If not an admin, send to admin login
  return authorized ? children : <Navigate to="/adminlogin" replace />;
};

export default ProtectedRoute;