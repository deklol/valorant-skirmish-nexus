
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type UserProfile = Tables<'users'>;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithDiscord: () => Promise<{ error: any }>;
  isAdmin: boolean;
  needsRiotIdSetup: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      console.log('Refreshing profile for user:', user.id);
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('User signed out, clearing state');
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (session?.user) {
          console.log('User signed in, updating state');
          setUser(session.user);
          await fetchProfile(session.user.id);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      // Clear state immediately for responsive UI
      setUser(null);
      setProfile(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const isAdmin = profile?.role === 'admin';

  // Check if user needs to set up Riot ID (first time or every 30 days)
  const needsRiotIdSetup = user && profile && (
    !profile.riot_id || 
    !profile.riot_id_last_updated ||
    new Date(profile.riot_id_last_updated).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)
  );

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      signInWithEmail,
      signInWithDiscord,
      isAdmin,
      needsRiotIdSetup: !!needsRiotIdSetup,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
