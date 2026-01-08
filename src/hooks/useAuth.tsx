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
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

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

  const updateDiscordAvatar = async (user: User) => {
    try {
      // Extract Discord avatar information from user metadata
      const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub;
      const discordUsername = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name;
      const discordAvatarHash = user.user_metadata?.avatar_url;
      
      let discordAvatarUrl = null;
      
      // If we have Discord ID and avatar hash, construct the full Discord CDN URL
      if (discordId && discordAvatarHash) {
        // Check if avatar_url is already a full URL or just a hash
        if (discordAvatarHash.startsWith('http')) {
          discordAvatarUrl = discordAvatarHash;
        } else {
          discordAvatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}.png?size=256`;
        }
      }
      
      console.log('Updating Discord avatar info:', {
        discordId,
        discordUsername,
        discordAvatarUrl,
        userMetadata: user.user_metadata
      });

      // Update the user profile with Discord information
      const updateData: Partial<UserProfile> = {};
      
      if (discordUsername) {
        updateData.discord_username = discordUsername;
      }
      
      if (discordAvatarUrl) {
        updateData.discord_avatar_url = discordAvatarUrl;
      }
      
      if (discordId) {
        updateData.discord_id = discordId;
      }

      // Only update if we have something to update
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);

        if (error) {
          console.error('Error updating Discord avatar:', error);
        } else {
          console.log('Discord avatar updated successfully');
          // Refresh the profile to get updated data
          await fetchProfile(user.id);
        }
      }
    } catch (error) {
      console.error('Error in updateDiscordAvatar:', error);
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
            setInitialized(true);
          }
          return;
        }

        console.log('Initial session:', session?.user?.id ? 'User found' : 'No user');
        
        if (session?.user && mounted) {
          console.log('Setting user from initial session');
          setUser(session.user);
          // Fetch profile after setting user
          await fetchProfile(session.user.id);
        } else if (mounted) {
          console.log('No initial session found');
          setUser(null);
          setProfile(null);
        }
        
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id ? 'User present' : 'No user');
        
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in');
          setUser(session.user);
          setLoading(false);
          
          // Check if this is a Discord OAuth sign-in and update avatar info
          if (session.user.app_metadata?.provider === 'discord') {
            console.log('Discord sign-in detected, updating avatar info');
            setTimeout(() => {
              if (mounted) {
                updateDiscordAvatar(session.user);
              }
            }, 100);
          } else {
            // Fetch profile in next tick to avoid blocking UI
            setTimeout(() => {
              if (mounted) {
                fetchProfile(session.user.id);
              }
            }, 0);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed');
          setUser(session.user);
          setLoading(false);
        } else if (!session) {
          console.log('No session in auth state change');
          setUser(null);
          setProfile(null);
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
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear state
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Error during sign out:', error);
      setLoading(false);
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

  // Don't render children until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Initializing...</div>
      </div>
    );
  }

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
