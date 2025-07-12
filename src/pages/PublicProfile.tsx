import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Trophy, Target, Twitter, Twitch, Clock, Lock, Swords, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProfileMatchHistory from '@/components/profile/ProfileMatchHistory';
import ProfileTournamentHistory from '@/components/profile/ProfileTournamentHistory';
import ProfileAchievements from '@/components/profile/ProfileAchievements';
import ProfileRankHistory from '@/components/profile/ProfileRankHistory';
import { getTrackerGGUrl } from '@/utils/getTrackerGGUrl';
import { useUserTeam } from "@/hooks/useUserTeam";
import ClickableTeamName from "@/components/ClickableTeamName";
import { Users } from "lucide-react";

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase.rpc('get_user_profile', {
        profile_user_id: userId
      });
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!userId
  });

  const { userTeam, loading: teamLoading } = useUserTeam(userId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-slate-700 rounded mb-4"></div>
          <div className="h-96 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-slate-400">This user profile does not exist or has been made private.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPrivate = profile.profile_visibility === 'private';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile.discord_avatar_url && (
                <img 
                  src={profile.discord_avatar_url} 
                  alt={profile.discord_username || 'User'} 
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <CardTitle className="text-white text-2xl">
                  {profile.discord_username || 'Unknown Player'}
                  {isPrivate && <Lock className="w-5 h-5 inline ml-2 text-slate-400" />}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {profile.current_rank && (
                    <Badge className="bg-blue-600 text-white">
                      {profile.current_rank}
                    </Badge>
                  )}
                  {profile.peak_rank && profile.peak_rank !== profile.current_rank && (
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                      Peak: {profile.peak_rank}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Profile Links List: Twitter, Twitch, Tracker.gg */}
            {!isPrivate && (profile.twitter_handle || profile.twitch_handle || profile.riot_id) && (
              <div className="flex flex-col items-end gap-0.5 text-sm">
                <span className="text-slate-400 font-semibold mb-1">Links</span>
                {profile.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-400"
                  >
                    Twitter
                  </a>
                )}
                {profile.twitch_handle && (
                  <a
                    href={`https://twitch.tv/${profile.twitch_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-purple-400"
                  >
                    Twitch
                  </a>
                )}
                {profile.riot_id && (
                  <a
                    href={getTrackerGGUrl(profile.riot_id) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-red-400"
                  >
                    Tracker.gg
                  </a>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">About</h3>
              <p className="text-slate-300">{profile.bio}</p>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Swords className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">{profile.wins}</div>
              <div className="text-sm text-slate-400">Match Wins</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{profile.losses}</div>
              <div className="text-sm text-slate-400">Match Losses</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400">{profile.tournaments_played}</div>
              <div className="text-sm text-slate-400">Tournaments Played</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">{profile.tournaments_won}</div>
              <div className="text-sm text-slate-400">Tournament Wins</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
            </div>
            {profile.last_seen && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Last seen {formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}
              </div>
            )}
            {profile.riot_id && (
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {profile.riot_id}
              </div>
            )}
          </div>

          {/* Team Information */}
          {!isPrivate && userTeam && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Current Team
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <ClickableTeamName 
                    teamId={userTeam.id} 
                    teamName={userTeam.name}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  />
                  {userTeam.description && (
                    <p className="text-slate-400 text-sm mt-1">{userTeam.description}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">
                    {userTeam.member_count}/{userTeam.max_members} members
                    {userTeam.is_user_captain && " • Team Captain"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-400">Team Record</div>
                  <div className="text-white font-medium">
                    {userTeam.wins || 0}W - {userTeam.losses || 0}L
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      {!isPrivate && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <Tabs defaultValue="matches" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                <TabsTrigger value="awards" className="data-[state=active]:bg-slate-600">
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="matches" className="data-[state=active]:bg-slate-600">
                  Match History
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-600">
                  Tournaments
                </TabsTrigger>
                <TabsTrigger value="ranks" className="data-[state=active]:bg-slate-600">
                  Rank History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="awards" className="mt-6">
                <ProfileAchievements userId={userId!} />
              </TabsContent>
              
              <TabsContent value="matches" className="mt-6">
                <ProfileMatchHistory userId={userId!} />
              </TabsContent>
              
              <TabsContent value="tournaments" className="mt-6">
                <ProfileTournamentHistory userId={userId!} />
              </TabsContent>
              
              <TabsContent value="ranks" className="mt-6">
                <ProfileRankHistory userId={userId!} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {isPrivate && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Private Profile</h3>
            <p className="text-slate-400">This user has made their profile private.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublicProfile;
