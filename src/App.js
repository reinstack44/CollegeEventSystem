import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';

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

function App() {
  // 1. Initialize theme from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark').matches;
  });

  // 2. The "Engine" that injects the .dark class into the HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <Router>
      {/* Soft Popup Notifications */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white rounded-2xl shadow-xl',
          duration: 3000,
        }} 
      />
      
      {/* Main Wrapper with smooth transition */}
      <div className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        
        {/* Pass theme state to Navbar for the toggle button */}
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <main className="container mx-auto pb-20">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/adminlogin" element={<AdminLogin />} />

            {/* Student Routes */}
            <Route path="/events" element={<EventList />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/complete-registration" element={<CompleteRegistration />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/create" element={<CreateEvent />} />
            <Route path="/admin/scan" element={<Scanner />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;