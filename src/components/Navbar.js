import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, signOut } from "firebase/auth";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listens for changes (login/logout) across the whole app
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    alert("Logged out successfully");
    navigate('/login');
  };

  return (
    <nav className="bg-blue-700 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-black">ActiveArch</Link>
        
        <div className="flex gap-6 items-center font-bold">
          <Link to="/events" className="hover:text-blue-200">Events</Link>
          
          {user ? (
            <>
              <Link to="/profile" className="hover:text-blue-200">Profile</Link>
              <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-xl text-sm hover:bg-red-600 transition">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;