import { useState, useEffect } from "react";
import { Calendar, Trophy, Users, Shield, User, LogOut, Home, Archive, ChevronRight, PlayCircle, ArrowLeft, Crown, Medal, Target, UsersRound, TrendingUp, HelpCircle, ShoppingBag } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Username } from "@/components/Username";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  status: string;
  max_players: number;
  tournament_signups: { count: number }[];
}

interface LatestResult {
  tournament_name: string;
  team1_name: string;
  team2_name: string;
  winner_name: string;
  score_team1: number;
  score_team2: number;
  completed_at: string;
}

interface UserProfile {
  id: string;
  discord_username: string;
  current_rank: string;
  wins: number;
  losses: number;
  tournaments_won: number;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [latestTournament, setLatestTournament] = useState<Tournament | null>(null);
  const [latestResults, setLatestResults] = useState<LatestResult[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isCollapsed = state === "collapsed";
  const currentPath = location.pathname;
  const canGoBack = currentPath !== "/";

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClasses = (path: string) => 
    isActive(path) 
      ? "bg-red-500/20 text-red-400 border-r-2 border-red-500 font-medium" 
      : "text-sidebar-foreground hover:text-red-400 hover:bg-sidebar-accent";

  // Main navigation items
  const mainNavItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Tournaments", url: "/tournaments", icon: Calendar },
    { title: "VODs", url: "/vods", icon: PlayCircle },
    { title: "Teams", url: "/teams-directory", icon: Users },
    { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
    { title: "Players", url: "/players", icon: User },
    { title: "Statistics", url: "/statistics", icon: TrendingUp },
    { title: "Shop", url: "/shop", icon: ShoppingBag },
  ];

  // Admin navigation items
  const adminNavItems = [
    { title: "Admin Dashboard", url: "/admin", icon: Shield },
  ];

  // User navigation items
  const userNavItems = user ? [
    { title: "Profile", url: "/profile", icon: User },
    { title: "My Team", url: "/teams", icon: UsersRound },
  ] : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get latest tournament - prioritize open/live, fallback to completed
        let { data: tournamentData } = await supabase
          .from('tournaments')
          .select('id, name, start_time, status, max_players, tournament_signups(count)')
          .in('status', ['open', 'live'])
          .order('start_time', { ascending: true })
          .limit(1)
          .single();

        // If no open/live tournaments, get most recent completed tournament
        if (!tournamentData) {
          const { data: completedTournament } = await supabase
            .from('tournaments')
            .select('id, name, start_time, status, max_players, tournament_signups(count)')
            .eq('status', 'completed')
            .order('start_time', { ascending: false })
            .limit(1)
            .single();
          
          tournamentData = completedTournament;
        }

        setLatestTournament(tournamentData);

        // Get latest results - using matches to find completed tournaments
        const { data: resultsData } = await supabase
          .from('matches')
          .select(`
            tournaments(name),
            team1:teams!team1_id(name),
            team2:teams!team2_id(name),
            winner:teams!winner_id(name),
            score_team1,
            score_team2,
            completed_at
          `)
          .not('winner_id', 'is', null)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(3);

        const formattedResults = resultsData?.map(match => ({
          tournament_name: match.tournaments?.name || 'Unknown Tournament',
          team1_name: match.team1?.name || 'Unknown Team',
          team2_name: match.team2?.name || 'Unknown Team',
          winner_name: match.winner?.name || 'Unknown Team',
          score_team1: match.score_team1 || 0,
          score_team2: match.score_team2 || 0,
          completed_at: match.completed_at
        })) || [];

        setLatestResults(formattedResults);

        // Get user profile if logged in
        if (user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('id, discord_username, current_rank, wins, losses, tournaments_won')
            .eq('id', user.id)
            .single();

          setUserProfile(profileData);
        }
      } catch (error) {
        console.log('Error fetching sidebar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar data-[state=collapsed]:w-24" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-red-500" />
                <span className="font-bold text-sidebar-foreground">TLR Hub</span>
              </div>
              <div className="flex items-center space-x-2">
                {canGoBack && (
                  <Button
                    onClick={handleGoBack}
                    variant="ghost"
                    size="sm"
                    className="text-sidebar-foreground hover:text-red-400 hover:bg-sidebar-accent"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                <SidebarTrigger className="text-sidebar-foreground hover:text-red-400" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full space-y-3">
              <Trophy className="h-6 w-6 text-red-500" />
              <SidebarTrigger className="text-sidebar-foreground hover:text-red-400" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""}>
                       <NavLink to={item.url} className={`${isCollapsed ? 'py-3 flex items-center justify-center w-full' : 'py-3 px-4'} ${getNavClasses(item.url)}`}>
                         <item.icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`} />
                         {!isCollapsed && <span className="text-base">{item.title}</span>}
                       </NavLink>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""}>
                       <NavLink to={item.url} className={`${isCollapsed ? 'py-3 flex items-center justify-center w-full' : 'py-3 px-4'} ${getNavClasses(item.url)}`}>
                         <item.icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`} />
                         {!isCollapsed && <span className="text-base">{item.title}</span>}
                       </NavLink>
                     </SidebarMenuButton>
                   </SidebarMenuItem>
                 ))}
               </SidebarMenu>
             </SidebarGroupContent>
           </SidebarGroup>
         )}

           {/* User Navigation */}
           {user && (
             <SidebarGroup>
               <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Account</SidebarGroupLabel>
               <SidebarGroupContent>
                 <SidebarMenu>
                   {userNavItems.map((item) => (
                     <SidebarMenuItem key={item.title}>
                       <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""}>
                         <NavLink to={item.url} className={`${isCollapsed ? 'py-3 flex items-center justify-center w-full' : 'py-3 px-4'} ${getNavClasses(item.url)}`}>
                           <item.icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`} />
                           {!isCollapsed && <span className="text-base">{item.title}</span>}
                         </NavLink>
                       </SidebarMenuButton>
                     </SidebarMenuItem>
                   ))}
                 </SidebarMenu>
               </SidebarGroupContent>
             </SidebarGroup>
           )}

        {/* Latest Tournament - Only show when expanded */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Latest Tournament</SidebarGroupLabel>
            <SidebarGroupContent>
              {loading ? (
                <div className="p-4 text-center text-sidebar-foreground/50">Loading...</div>
              ) : latestTournament ? (
                <Card className="bg-sidebar-accent border-sidebar-border">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm text-sidebar-foreground flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-red-500" />
                      {latestTournament.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="space-y-2 text-xs text-sidebar-foreground/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(latestTournament.start_time)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        {latestTournament.tournament_signups?.[0]?.count || 0}/{latestTournament.max_players}
                      </div>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                        {latestTournament.status}
                      </Badge>
                    </div>
                    <NavLink to={`/tournament/${latestTournament.id}`}>
                      <Button size="sm" className="w-full bg-red-500 hover:bg-red-600 text-white text-xs">
                        {latestTournament.status === 'completed' ? 'View Tournament' : 'Join Tournament'}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-sidebar-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-sidebar-foreground/50">No active tournaments</p>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Latest Results - Only show when expanded */}
        {!isCollapsed && latestResults.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Latest Results</SidebarGroupLabel>
            <SidebarGroupContent>
                <div className="space-y-2">
                {latestResults.slice(0, 2).map((result, index) => (
                  <Card key={index} className="bg-sidebar-accent border-sidebar-border">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                          <Crown className="w-3 h-3 text-yellow-500" />
                          <span className="truncate">{result.tournament_name}</span>
                        </div>
                        <div className="text-xs text-sidebar-foreground font-medium">
                          <div className="flex items-center justify-between">
                            <span className={result.winner_name === result.team1_name ? "text-green-400" : "text-sidebar-foreground/70"}>
                              {result.team1_name}
                            </span>
                            <span className="text-sidebar-foreground">{result.score_team1} - {result.score_team2}</span>
                            <span className={result.winner_name === result.team2_name ? "text-green-400" : "text-sidebar-foreground/70"}>
                              {result.team2_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-sidebar-foreground/50">
                          {formatDate(result.completed_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User Profile Info - Only show when expanded and logged in */}
        {!isCollapsed && user && userProfile && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Your Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <Card className="bg-sidebar-accent border-sidebar-border">
                <CardContent className="p-3 space-y-3">
                  <div className="text-sm text-sidebar-foreground font-medium truncate">
                    <Username 
                      userId={userProfile.id} 
                      username={userProfile.discord_username || user.email || "Unknown"} 
                      size="sm"
                    />
                  </div>
                  {userProfile.current_rank && (
                    <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                      <Medal className="w-3 h-3 text-blue-400" />
                      {userProfile.current_rank}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-green-400 font-medium">{userProfile.wins}</div>
                      <div className="text-sidebar-foreground/50">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-medium">{userProfile.losses}</div>
                      <div className="text-sidebar-foreground/50">Losses</div>
                    </div>
                  </div>
                  {userProfile.tournaments_won > 0 && (
                    <div className="flex items-center justify-center gap-2 text-xs text-yellow-400">
                      <Trophy className="w-3 h-3" />
                      {userProfile.tournaments_won} Tournament{userProfile.tournaments_won !== 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Discord Link - Only show when expanded */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Community</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-1">
                <a
                  href="https://discord.gg/TLR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/20">
                    Join Discord
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with sign out */}
      {user && (
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          {!isCollapsed ? (
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:text-red-400 hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
           ) : (
             <div className="flex justify-center">
               <Button
                 onClick={handleSignOut}
                 variant="ghost"
                 size="sm"
                 className="p-2"
                 title="Sign Out"
               >
                 <LogOut className="w-6 h-6" />
               </Button>
             </div>
           )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
