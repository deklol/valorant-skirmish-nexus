
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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log('Initial session user ID:', session?.user?.id);
        
        if (session?.user && mounted) {
          console.log('Setting user from initial session');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (mounted) {
          console.log('No initial session found');
          setUser(null);
          setProfile(null);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'User ID:', session?.user?.id);
        
        if (!mounted) return;
        
        // Handle different auth events appropriately
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, updating state');
          setUser(session.user);
          // Defer profile fetching to avoid blocking
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id);
            }
          }, 0);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed, maintaining state');
          setUser(session.user);
        } else if (event === 'INITIAL_SESSION') {
          // Don't clear state on INITIAL_SESSION - let initializeAuth handle it
          console.log('Initial session event - handled by initializeAuth');
        }
        
        // Only set loading to false after we've handled the event
        if (event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      // Clear state immediately
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
