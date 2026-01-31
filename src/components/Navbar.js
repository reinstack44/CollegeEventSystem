import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
    
    // Clear any potential leftover local session data
    localStorage.clear(); 
    sessionStorage.clear();

    // Force the browser to dump the current React state and load the root
    window.location.assign('/'); 
  };

  return (
    <nav className="bg-blue-700 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center relative">
        <Link to="/" onClick={() => setIsOpen(false)} className="text-xl font-bold">
          ActiveArch
        </Link>

        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 bg-blue-800 px-4 py-2 rounded-lg hover:bg-blue-900 border border-blue-600 focus:outline-none"
          >
            <span className="font-medium text-sm">Menu</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-100">
              <Link to="/events" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-gray-700 hover:bg-blue-50 border-b border-gray-50">🔍 Browse Events</Link>
              <Link to="/my-tickets" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-gray-700 hover:bg-blue-50 border-b border-gray-50">🎟️ My Tickets</Link>
              <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-gray-700 hover:bg-blue-50 border-b border-gray-50">⚙️ Admin Side</Link>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-bold"
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;