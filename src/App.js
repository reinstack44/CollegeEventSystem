import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// CHECK THESE IMPORTS CAREFULLY
import Signup from './pages/student/Signup'; 
import EventList from './pages/student/EventList';
import MyTickets from './pages/student/MyTickets';

import AdminDashboard from './pages/admin/Dashboard';
import CreateEvent from './pages/admin/CreateEvent';
import Scanner from './pages/admin/Scanner';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Path "/" must lead to Signup component */}
          <Route path="/" element={<Signup />} />
          
          <Route path="/events" element={<EventList />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/create" element={<CreateEvent />} />
          <Route path="/admin/scan" element={<Scanner />} />

          {/* Fallback for any other URL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;