
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { UserProfile, AuthContextType } from '../types';
import { CREDIT_INTERVAL_MS, CREDIT_INCREMENT } from '../constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [credits, setCredits] = useState<number>(0);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data as UserProfile);
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setCredits(0);
    }
  }, []);
  
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);


  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoadingAuth(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setCredits(0);
        }
        setLoadingAuth(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (user && profile) { // Only run if user is logged in and profile is loaded
      intervalId = setInterval(async () => {
        setCredits(prevCredits => {
            const newCredits = prevCredits + CREDIT_INCREMENT;
            // Update Supabase in background, don't block UI
            supabase
              .from('profiles')
              .update({ credits: newCredits })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) console.error('Error updating credits in Supabase:', error);
              });
            return newCredits;
        });
      }, CREDIT_INTERVAL_MS);
    }
    return () => clearInterval(intervalId);
  }, [user, profile]);


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCredits(0);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loadingAuth, credits, setCredits, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
