
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getSession, onAuthStateChange, signOutUser as sbSignOutUser, getMailIdentitiesForUser } from './supabaseService';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import MailPage from './pages/MailPage';
import { AuthContextType, BoongleMailIdentity } from './types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [primaryIdentity, setPrimaryIdentity] = useState<BoongleMailIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          const identities = await getMailIdentitiesForUser(currentSession.user.id);
          if (identities.length > 0) {
            setPrimaryIdentity(identities[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const authListener = onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const identities = await getMailIdentitiesForUser(session.user.id);
         if (identities.length > 0) {
            setPrimaryIdentity(identities[0]);
          } else {
            setPrimaryIdentity(null); // Clear identity if user logs out or has none
          }
      } else {
        setPrimaryIdentity(null);
      }
      setLoading(false); // Ensure loading is false after auth state changes
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await sbSignOutUser();
    setSession(null);
    setUser(null);
    setPrimaryIdentity(null);
    setLoading(false);
  };

  const value = { session, user, loading, signOut, primaryIdentity, setPrimaryIdentity };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl">Loading Boongle...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const ProtectedRoute: React.FC = () => {
  const { session, primaryIdentity } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  if (!primaryIdentity && location.pathname !== '/auth' && !location.pathname.startsWith('/setup-identity')) {
     // If user is logged in but has no primary identity, redirect to setup.
     // This could happen if they signed up but didn't complete identity creation.
     // For this app, AuthPage handles initial identity creation.
     // If they somehow bypass this, this is a fallback.
     // However, AuthPage should ensure identity creation.
  }

  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/app/mails" element={<Navigate to="/app/mails=0" replace />} />
            <Route path="/app/mails=:accountIndex" element={<MailPage />} />
            {/* Add other protected routes here */}
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
