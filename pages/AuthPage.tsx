
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase, signInUser, signUpUser, createMailIdentity, getMailIdentitiesForUser } from '../supabaseService';
import { BoongleMailIdentity } from '../types';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // For Supabase auth (e.g. user@example.com)
  const [password, setPassword] = useState('');
  const [boongleUsername, setBoongleUsername] = useState(''); // For myname@boongle.com
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  useEffect(() => {
    if (auth.session && auth.primaryIdentity) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else if (auth.session && !auth.primaryIdentity && !loading && !auth.loading) {
        // User is logged in but may not have completed identity setup or it's still loading.
        // The AuthProvider will set primaryIdentity. If it remains null after loading,
        // user will proceed to HomePage, and MailPage will handle the "no identity" scenario.
        // This useEffect is primarily for redirecting *away* from AuthPage if fully authenticated.
    }
  }, [auth.session, auth.primaryIdentity, navigate, location.state, loading, auth.loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error: signInError } = await signInUser(email, password);
        if (signInError) throw signInError;
        // Session update and navigation are handled by AuthProvider's onAuthStateChange 
        // and this component's useEffect reacting to auth context changes.
        setMessage('Login successful! Redirecting...');
      } else { // Signup
        if (!boongleUsername.match(/^[a-zA-Z0-9._-]+$/)) {
          throw new Error('Boongle username can only contain letters, numbers, dots, underscores, and hyphens.');
        }
        const { data: signUpData, error: signUpError } = await signUpUser(email, password);
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Signup succeeded but no user data returned.');

        // After user is created in Supabase Auth, their session is active.
        // The create_boongle_mail_identity RPC uses auth.uid() from this new session.
        const { error: identityError, data: newIdentity } = await createMailIdentity(boongleUsername, boongleUsername);

        if (identityError) {
          console.error("Identity creation error after signup:", identityError);
          // It's possible the user was created in auth but identity failed.
          // They will need to login and might be prompted to create identity if MailPage is accessed.
          throw new Error(`Signup partially successful, but failed to create Boongle Mail: ${identityError.message}. Please try logging in. If the issue persists, your Boongle username might be taken or invalid.`);
        }
        
        if (!newIdentity) {
           throw new Error('Signup successful, but Boongle Mail identity data was not returned. Please log in.');
        }
        
        // Identity created successfully.
        // AuthProvider's onAuthStateChange will fire due to the new session from signUpUser.
        // It will call getMailIdentitiesForUser, find the new identity, and update auth.primaryIdentity.
        // This component's useEffect will then navigate away from AuthPage.
        setMessage('Signup and Boongle Mail setup successful! Redirecting...');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      // Navigation is now primarily handled by the useEffect hook based on auth context changes.
      // This avoids potential race conditions with auth state propagation.
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400">
            Boongle
          </h1>
          <p className="text-gray-600 mt-2">{isLogin ? 'Welcome back!' : 'Create your Boongle account'}</p>
        </div>

        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-sm text-center">{error}</p>}
        {message && <p className="text-green-500 bg-green-100 p-3 rounded-md text-sm text-center">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Auth Email <span className="text-xs text-gray-500">(e.g., yourname@example.com)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
              placeholder="you@example.com"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="boongleUsername" className="block text-sm font-medium text-gray-700">
                Choose your Boongle Username
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                 <input
                    id="boongleUsername"
                    type="text"
                    value={boongleUsername}
                    onChange={(e) => setBoongleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    required={!isLogin}
                    className="flex-1 block w-full min-w-0 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
                    placeholder="yourname"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    @boongle.com
                  </span>
              </div>
               <p className="mt-1 text-xs text-gray-500">This will be your primary Boongle Mail address.</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || auth.loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-150"
            >
              {loading || auth.loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (isLogin ? 'Login' : 'Sign Up & Create Boongle Mail')}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); setBoongleUsername(''); setEmail(''); setPassword('');}}
            className="ml-1 font-medium text-blue-600 hover:text-blue-500"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
       <footer className="mt-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Boongle Inc. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthPage;
