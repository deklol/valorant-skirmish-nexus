
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Target, Calendar, Users, Crown, Edit } from "lucide-react";
import Header from "@/components/Header";
import RiotIdDialog from "@/components/RiotIdDialog";
import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const [showRiotIdDialog, setShowRiotIdDialog] = useState(false);

  // Mock tournament history - will be replaced with actual data from database
  const tournamentHistory = [
    {
      id: 1,
      name: "TGH Weekly Skirmish #52",
      placement: 1,
      date: new Date("2025-05-31"),
      mvp: true,
      format: "BO1"
    },
    {
      id: 2,
      name: "TGH Weekly Skirmish #51",
      placement: 3,
      date: new Date("2025-05-24"),
      mvp: false,
      format: "BO1"
    },
    {
      id: 3,
      name: "TGH Championship Semi-Finals",
      placement: 1,
      date: new Date("2025-05-17"),
      mvp: true,
      format: "BO3"
    },
    {
      id: 4,
      name: "TGH Weekly Skirmish #50",
      placement: 4,
      date: new Date("2025-05-10"),
      mvp: false,
      format: "BO1"
    }
  ];

  const getPlacementBadge = (placement: number) => {
    if (placement === 1) {
      return <Badge className="bg-yellow-500/20 text-yellow-400">1st Place</Badge>;
    } else if (placement === 2) {
      return <Badge className="bg-slate-400/20 text-slate-300">2nd Place</Badge>;
    } else if (placement === 3) {
      return <Badge className="bg-orange-500/20 text-orange-400">3rd Place</Badge>;
    } else {
      return <Badge variant="outline" className="border-slate-600 text-slate-400">{placement}th Place</Badge>;
    }
  };

  const getRankColor = (rank: string) => {
    if (rank?.includes("Diamond")) return "text-blue-400";
    if (rank?.includes("Platinum")) return "text-green-400";
    if (rank?.includes("Gold")) return "text-yellow-400";
    if (rank?.includes("Silver")) return "text-slate-300";
    if (rank?.includes("Bronze")) return "text-orange-400";
    if (rank?.includes("Iron")) return "text-gray-400";
    if (rank?.includes("Ascendant")) return "text-purple-400";
    if (rank?.includes("Immortal")) return "text-red-400";
    if (rank?.includes("Radiant")) return "text-white";
    return "text-slate-400";
  };

  const handleRiotIdComplete = () => {
    setShowRiotIdDialog(false);
    window.location.reload(); // Refresh to get updated data
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show message if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Show message if no profile (shouldn't happen normally)
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white">Profile not found. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-red-600 text-white text-2xl">
                  {profile.discord_username?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {profile.discord_username || "Unknown User"}
                </h1>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Riot ID:</span>
                    <span className="text-white">{profile.riot_id || "Not set"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRiotIdDialog(true)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-slate-400" />
                      <span className={`font-semibold ${getRankColor(profile.current_rank || "")}`}>
                        {profile.current_rank || "Unranked"}
                      </span>
                      <span className="text-slate-400">({profile.rank_points || 0} pts)</span>
                    </div>
                    
                    {profile.peak_rank && (
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-slate-400">Peak:</span>
                        <span className={`font-semibold ${getRankColor(profile.peak_rank)}`}>
                          {profile.peak_rank}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {new Date(profile.created_at || "").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Tournament Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tournaments Played</span>
                  <span className="text-white font-semibold">{profile.tournaments_played || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tournaments Won</span>
                  <span className="text-yellow-400 font-semibold">{profile.tournaments_won || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="text-green-400 font-semibold">
                    {profile.tournaments_played ? Math.round(((profile.tournaments_won || 0) / profile.tournaments_played) * 100) : 0}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MVP Awards</span>
                  <span className="text-purple-400 font-semibold flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    {profile.mvp_awards || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tournament History */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-orange-500" />
                  Tournament History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tournamentHistory.map((tournament) => (
                    <div 
                      key={tournament.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{tournament.name}</h3>
                        <p className="text-slate-400 text-sm">
                          {tournament.date.toLocaleDateString("en-GB")} • {tournament.format}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {tournament.mvp && (
                          <Badge className="bg-purple-500/20 text-purple-400">
                            <Crown className="w-3 h-3 mr-1" />
                            MVP
                          </Badge>
                        )}
                        {getPlacementBadge(tournament.placement)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RiotIdDialog
        open={showRiotIdDialog}
        onOpenChange={setShowRiotIdDialog}
        onComplete={handleRiotIdComplete}
      />
    </div>
  );
};

export default Profile;
