import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './sbclient/supabaseClient';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Student Pages
import Signup from './pages/student/Signup'; 
import EventList from './pages/student/EventList';
import MyTickets from './pages/student/MyTickets';
import CompleteRegistration from './pages/student/CompleteRegistration';
import Login from './pages/student/Login';
import Profile from './pages/student/Profile';
import ForgotPassword from './pages/student/ForgotPassword'; 
import ResetPassword from './pages/student/ResetPassword';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/AdminLogin'; 
import CreateEvent from './pages/admin/CreateEvent';
import Scanner from './pages/admin/Scanner';
import MasterManagement from './pages/admin/MasterManagement'; 
import ManageEvents from './pages/admin/ManageEvents';
import Applications from './pages/admin/Applications'; 

// Org Head Pages
import OrgDashboard from './pages/org/OrgDashboard';
import ManageClubs from './pages/org/ManageClubs';

// Club Head Pages
import MyClubs from './pages/club/MyClubs';
import ClubDashboard from './pages/club/ClubDashboard';

// Legal Pages
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';
import Refunds from './pages/legal/Refunds';

// Auth / Organization Pages
import RegisterOrg from './pages/auth/RegisterOrg';
import PendingApproval from './pages/auth/PendingApproval';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar session={session} />
        
        <main className="grow">
          <Routes>
            <Route 
              path="/" 
              element={session ? <Navigate to="/events" replace /> : <Login />} 
            />
            <Route 
              path="/login" 
              element={session ? <Navigate to="/events" replace /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={session ? <Navigate to="/events" replace /> : <Signup />} 
            />
            
            <Route path="/events" element={session ? <EventList /> : <Navigate to="/" replace />} />
            <Route path="/my-tickets" element={session ? <MyTickets /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={session ? <Profile /> : <Navigate to="/" replace />} />
            <Route path="/complete-registration" element={session ? <CompleteRegistration /> : <Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* SUPER ADMIN ROUTES */}
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/admin/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><ManageEvents /></ProtectedRoute>} />
            <Route path="/admin/master-registry" element={<ProtectedRoute><MasterManagement /></ProtectedRoute>} />
            <Route path="/admin/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />

            {/* ORG HEAD ROUTES */}
            <Route path="/org/dashboard" element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
            <Route path="/org/clubs" element={<ProtectedRoute><ManageClubs /></ProtectedRoute>} />

            {/* CLUB HEAD ROUTES */}
            <Route path="/club/my-clubs" element={<ProtectedRoute><MyClubs /></ProtectedRoute>} />
            <Route path="/club/dashboard/:clubId" element={<ProtectedRoute><ClubDashboard /></ProtectedRoute>} />

            {/* Organization Auth Routes */}
            <Route path="/register-org" element={<RegisterOrg />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Legal Pages Routes */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refunds" element={<Refunds />} />

            {/* SECURE CATCH-ALL ROUTE (404 Fallback) */}
            <Route path="*" element={<Navigate to={session ? "/events" : "/"} replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;