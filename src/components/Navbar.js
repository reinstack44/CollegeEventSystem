import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from "firebase/auth";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const isAdmin = window.location.pathname.startsWith('/admin');
    await signOut(auth);
    setIsOpen(false);
    
    // If they were on an admin page, send to admin login, else student login
    if (isAdmin) {
      navigate('/adminlogin');
    } else {
      navigate('/login');
    }
  };
  
  return (
    <nav className="bg-blue-700 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-black">ActiveArch</Link>

        {/* Menu Button */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="bg-blue-800 p-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            <span className="font-bold">Menu</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl py-2 z-50 text-gray-800 border">
              <Link to="/events" onClick={() => setIsOpen(false)} className="block px-4 py-3 hover:bg-gray-100 font-bold">Events</Link>
              
              {user ? (
                <>
                  <Link to="/my-tickets" onClick={() => setIsOpen(false)} className="block px-4 py-3 hover:bg-gray-100 font-bold">My Tickets</Link>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-4 py-3 hover:bg-gray-100 font-bold">Profile</Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-bold">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-blue-700 hover:bg-blue-50 font-bold">Login</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;