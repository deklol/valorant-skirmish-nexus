
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching profile:', error);
      } else if (data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        console.log('No profile found, creating one...');
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            role: 'player'
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        setLoading(true);
        
        if (session?.user) {
          console.log('User session found, setting user state');
          setUser(session.user);
          // Use setTimeout to prevent potential deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          console.log('No session, clearing user state');
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else if (session?.user) {
          console.log('Initial session found:', session.user.id);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('No initial session found');
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Clear local state first
      setUser(null);
      setProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Force reload to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force reload even if there's an error
      window.location.href = '/';
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error && data.user) {
        console.log('Email login successful');
      }
      
      return { error };
    } catch (error) {
      console.error('Email login error:', error);
      return { error };
    }
  };

  const signInWithDiscord = async () => {
    try {
      console.log('Initiating Discord login...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('Discord login error:', error);
      } else {
        console.log('Discord OAuth initiated successfully');
      }
      
      return { error };
    } catch (error) {
      console.error('Discord login error:', error);
      return { error };
    }
  };

  const isAdmin = profile?.role === 'admin';

  // Check if user needs to set up Riot ID (first time or every 30 days)
  const needsRiotIdSetup = user && profile && (
    !profile.riot_id || 
    !profile.riot_id_last_updated ||
    new Date(profile.riot_id_last_updated).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)
  );

  console.log('Auth context state:', { user: !!user, profile: !!profile, loading, needsRiotIdSetup: !!needsRiotIdSetup });

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
