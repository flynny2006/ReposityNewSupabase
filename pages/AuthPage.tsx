
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
    } else if (auth.session && !auth.primaryIdentity) {
        // User is logged in but hasn't created their first Boongle identity
        // This state should ideally be handled within the form logic after signup
        // Forcing a view to create identity if they are logged in but have none.
        // This scenario is simplified here, assuming signup flow includes identity creation.
    }
  }, [auth.session, auth.primaryIdentity, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error: signInError } = await signInUser(email, password);
        if (signInError) throw signInError;
        // Session update and navigation handled by AuthProvider's useEffect
        setMessage('Login successful! Redirecting...');

      } else { // Signup
        if (!boongleUsername.match(/^[a-zA-Z0-9._-]+$/)) {
          throw new Error('Boongle username can only contain letters, numbers, dots, underscores, and hyphens.');
        }
        const { data: signUpData, error: signUpError } = await signUpUser(email, password);
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Signup succeeded but no user data returned.');

        // User signed up, now create their first Boongle Mail identity
        // We use the auth.uid() which should be available after signup via Supabase client internal state.
        // It's better if createMailIdentity could take user_id directly if not relying on RLS/auth.uid() immediately.
        // For simplicity, we assume auth context will update and provide user or use RPC call with SECURITY DEFINER.
        // The SQL function `create_boongle_mail_identity` uses `auth.uid()`.

        // Simulate a small delay for auth state to propagate if needed, or rely on AuthProvider to fetch identity
        // A better approach is to call createMailIdentity after successful signup within the same flow.
        // Let's assume supabase.auth.user is populated after signup success.
        
        // After signup, user needs to confirm email for Supabase Auth by default.
        // For this example, we'll proceed to identity creation immediately,
        // but in a real app, you might wait for email confirmation.
        
        // To call the RPC, the user must be authenticated. After signUp, the session is typically set.
        const { error: identityError, data: newIdentity } = await createMailIdentity(boongleUsername, boongleUsername);

        if (identityError) {
          // If identity creation fails, we might want to inform the user.
          // Potentially rollback signup or provide guidance.
          console.error("Identity creation error after signup:", identityError);
          setError(`Signup successful, but failed to create Boongle Mail: ${identityError.message}. Please try logging in and setting it up.`);
          // Sign out user if identity creation is critical and failed
          // await auth.signOut();
        } else if (newIdentity) {
          auth.setPrimaryIdentity(newIdentity as BoongleMailIdentity); // Manually update context
          setMessage('Signup and Boongle Mail setup successful! Check your email for confirmation (if enabled). Redirecting...');
        } else {
           setError('Signup successful, but Boongle Mail identity could not be verified. Please log in.');
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      // AuthProvider useEffect will handle redirection if session/identity becomes valid
      // If login/signup successful, it might take a moment for AuthProvider to update and redirect.
      // We can force a check here:
      if (!error && auth.session) {
         const userIdentities = await getMailIdentitiesForUser(auth.session.user.id);
         if(userIdentities.length > 0) {
            auth.setPrimaryIdentity(userIdentities[0]);
             const from = location.state?.from?.pathname || '/';
             navigate(from, { replace: true });
         } else if (!isLogin) { // if signup and still no identity, something went wrong
            setError("Boongle Mail identity wasn't created. Please try logging in and set it up manually.");
         }
      }
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
                    required
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
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-150"
            >
              {loading ? (
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
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null);}}
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
