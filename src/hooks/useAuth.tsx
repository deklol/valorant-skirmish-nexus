
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

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
        return data;
      } else {
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
          return null;
        } else {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
          return newProfile;
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          if (session?.user) {
            console.log('Initial session found:', session.user.id);
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            console.log('No initial session found');
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          if (event === 'SIGNED_IN') {
            await fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear state
      setUser(null);
      setProfile(null);
      
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = '/';
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting email login...');
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
  const needsRiotIdSetup = user && profile && (
    !profile.riot_id || 
    !profile.riot_id_last_updated ||
    new Date(profile.riot_id_last_updated).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)
  );

  console.log('Auth state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    loading, 
    needsRiotIdSetup: !!needsRiotIdSetup 
  });

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
