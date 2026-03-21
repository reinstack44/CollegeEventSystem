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
import ResetPassword from './pages/student/ResetPassword';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/AdminLogin'; 
import CreateEvent from './pages/admin/CreateEvent';
import Scanner from './pages/admin/Scanner';
import StudentRecords from './pages/admin/StudentRecords'; 
import ManageRegistrations from './pages/admin/ManageRegistrations'; 

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
            {/* 1. THE ROOT PATH: Forces the URL to change to /login */}
            <Route 
              path="/" 
              element={session ? <Navigate to="/events" replace /> : <Navigate to="/login" replace />} 
            />

            {/* 2. AUTHENTICATION */}
            <Route 
              path="/login" 
              element={session ? <Navigate to="/events" replace /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={session ? <Navigate to="/events" replace /> : <Signup />} 
            />
            
            {/* 3. PROTECTED STUDENT ROUTES */}
            <Route path="/events" element={session ? <EventList /> : <Navigate to="/login" replace />} />
            <Route path="/my-tickets" element={session ? <MyTickets /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/complete-registration" element={session ? <CompleteRegistration /> : <Navigate to="/login" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* 4. ADMIN ROUTES */}
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/admin/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute><StudentRecords /></ProtectedRoute>} /> 
            <Route path="/admin/logs" element={<ProtectedRoute><ManageRegistrations /></ProtectedRoute>} /> 

            {/* 5. GLOBAL CATCH-ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;