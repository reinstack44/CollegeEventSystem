import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

import Signup from './pages/student/Signup'; 
import EventList from './pages/student/EventList';
import MyTickets from './pages/student/MyTickets';

import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/AdminLogin'; // <-- ADD THIS IMPORT
import CreateEvent from './pages/admin/CreateEvent';
import Scanner from './pages/admin/Scanner';
import CompleteRegistration from './pages/student/CompleteRegistration';
import Login from './pages/student/Login';
import Profile from './pages/student/Profile';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
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

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/create" element={<CreateEvent />} />
          <Route path="/admin/scan" element={<Scanner />} />

          {/* Fallback - MUST BE AT THE BOTTOM */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;