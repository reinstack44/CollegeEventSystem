import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/create" className="bg-white p-10 rounded-xl shadow-md border-l-8 border-green-500 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold">➕ Create New Event</h2>
          <p className="text-gray-500 mt-2">Post event details for students to see.</p>
        </Link>
        <Link to="/admin/scan" className="bg-white p-10 rounded-xl shadow-md border-l-8 border-blue-500 hover:shadow-lg transition">
          <h2 className="text-2xl font-bold">📸 Scan Tickets</h2>
          <p className="text-gray-500 mt-2">Verify student entry at the gate.</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;