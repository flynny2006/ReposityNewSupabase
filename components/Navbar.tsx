
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, UserCircle, LogIn, LogOut, LayoutDashboard, Coins } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, profile, signOut, credits } = useAuth();

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center text-white text-xl font-bold">
            <Rocket className="w-7 h-7 mr-2 text-primary-400" />
            QuickHost
          </Link>
          <div className="flex items-center space-x-4">
            {user && profile ? (
              <>
                <span className="text-primary-300 flex items-center">
                  <Coins className="w-5 h-5 mr-1" /> {credits} Credits
                </span>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LogIn className="w-4 h-4 mr-1" /> Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserCircle className="w-4 h-4 mr-1" /> Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
