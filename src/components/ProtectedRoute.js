import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../sbclient/supabaseClient';
import { Zap } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <Zap className="animate-pulse text-blue-500" size={48} />
      </div>
    );
  }

  // If they have no session at all, send them to the login
  // Otherwise, let the individual components verify their specific roles!
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;