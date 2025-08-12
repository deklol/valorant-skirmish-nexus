import { useState, useEffect, useRef } from "react";
import { Calendar, Trophy, Users, Shield, User, LogOut, Home, PlayCircle, ArrowLeft, Medal, UsersRound, TrendingUp, HelpCircle, ShoppingBag, Search, ChevronRight } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  SidebarInput,
  SidebarMenuBadge,
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

  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [playerResults, setPlayerResults] = useState<{ id: string; discord_username: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filterItems = <T extends { title: string }>(items: T[]) =>
    items.filter((i) => i.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredMainNavItems = filterItems(mainNavItems);
  const filteredAdminNavItems = filterItems(adminNavItems);
  const filteredUserNavItems = filterItems(userNavItems);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    const term = searchTerm.trim();
    if (!term || term.length < 2) {
      setPlayerResults([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, discord_username')
          .ilike('discord_username', `%${term}%`)
          .limit(5);
        if (active) setPlayerResults(data || []);
      } catch {
        if (active) setPlayerResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [searchTerm]);

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

  const handlePlayerClick = (id: string) => {
    setSearchTerm("");
    setPlayerResults([]);
    navigate(`/profile/${id}`);
  };

  return (
    <Sidebar className="border-r border-sidebar-border data-[state=collapsed]:w-24 [&_[data-sidebar=sidebar]]:bg-background/60 [&_[data-sidebar=sidebar]]:backdrop-blur-md [&_[data-sidebar=sidebar]]:supports-[backdrop-filter]:bg-background/50 [&_[data-sidebar=sidebar]]:border [&_[data-sidebar=sidebar]]:border-sidebar-border [&_[data-sidebar=sidebar]]:shadow-lg" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-primary" />
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
              <Trophy className="h-6 w-6 text-primary" />
              <SidebarTrigger className="text-sidebar-foreground hover:text-red-400" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <SidebarInput
                    ref={searchRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search"
                    className="pl-9 h-9 bg-background/80"
                    aria-label="Search"
                  />
                </div>
                {!isCollapsed && (playerResults.length > 0 || isSearching) && (
                  <div className="mt-2 border border-sidebar-border bg-background/90">
                    {isSearching && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                    )}
                    {playerResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePlayerClick(p.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-sidebar-accent flex items-center gap-2"
                      >
                        <User className="h-4 w-4 opacity-70" />
                        <span className="truncate">{p.discord_username || 'Unknown'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainNavItems.map((item) => (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""} tooltip={item.title}>
                       <NavLink to={item.url} className={`flex items-center w-full ${isCollapsed ? 'justify-center py-3' : 'px-4 py-3'} ${getNavClasses(item.url)}`}>
                         <item.icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`} />
                         {!isCollapsed && <span className="text-base">{item.title}</span>}
                       </NavLink>
                     </SidebarMenuButton>
                     {item.title === "Tournaments" && latestTournament?.status === 'live' && !isCollapsed && (
                       <SidebarMenuBadge className="bg-green-500/20 text-green-400">Live</SidebarMenuBadge>
                     )}
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
                {filteredAdminNavItems.map((item) => (
                   <SidebarMenuItem key={item.title}>
                     <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""} tooltip={item.title}>
                       <NavLink to={item.url} className={`flex items-center w-full ${isCollapsed ? 'justify-center py-3' : 'px-4 py-3'} ${getNavClasses(item.url)}`}>
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
                    {filteredUserNavItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild size={isCollapsed ? "sm" : "lg"} className={isCollapsed ? "justify-center" : ""} tooltip={item.title}>
                          <NavLink to={item.url} className={`flex items-center w-full ${isCollapsed ? 'justify-center py-3' : 'px-4 py-3'} ${getNavClasses(item.url)}`}>
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

        {/* Latest Tournament - Redesigned */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Latest Tournament</SidebarGroupLabel>
            <SidebarGroupContent>
              {loading ? (
                <div className="p-4 text-center text-xs text-sidebar-foreground/50">Loading...</div>
              ) : latestTournament ? (
                <div className="p-3 space-y-3 bg-sidebar-accent/50 border border-sidebar-border rounded-lg m-2">
                  <div className="font-semibold text-sm text-sidebar-foreground flex items-center gap-2">
                     <PlayCircle className="w-4 h-4 text-red-500" />
                     <span className="truncate">{latestTournament.name}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-sidebar-foreground/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(latestTournament.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      <span>{latestTournament.tournament_signups?.[0]?.count || 0} / {latestTournament.max_players} players</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 inline-flex items-center h-5">
                      {latestTournament.status}
                    </Badge>
                    <NavLink to={`/tournament/${latestTournament.id}`} className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center">
                      {latestTournament.status === 'completed' ? 'View' : 'Join'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </NavLink>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-sidebar-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-sidebar-foreground/50">No active tournaments</p>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Latest Results - Redesigned */}
        {!isCollapsed && latestResults.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Latest Results</SidebarGroupLabel>
              <SidebarGroupContent>
                  <div className="space-y-1 p-2">
                  {latestResults.slice(0, 2).map((result, index) => (
                    <div key={index} className="p-2 rounded-md hover:bg-sidebar-accent">
                      <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50 mb-1.5">
                        <Trophy className="w-3 h-3" />
                        <span className="truncate font-medium">{result.tournament_name}</span>
                      </div>
                      <div className="text-xs text-sidebar-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className={result.winner_name === result.team1_name ? "text-green-400 font-bold truncate" : "text-sidebar-foreground/70 truncate"}>
                            {result.team1_name}
                          </span>
                          <span className="font-mono text-sidebar-foreground/90 font-semibold">{result.score_team1}-{result.score_team2}</span>
                          <span className={result.winner_name === result.team2_name ? "text-green-400 font-bold truncate text-right" : "text-sidebar-foreground/70 truncate text-right"}>
                            {result.team2_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
        )}

        {/* User Profile Info - Redesigned */}
        {!isCollapsed && user && userProfile && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Your Stats</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="p-3 m-2 bg-sidebar-accent/50 border border-sidebar-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                      <Username 
                        userId={userProfile.id} 
                        username={userProfile.discord_username || user.email || "Unknown"} 
                        size="sm"
                      />
                      {userProfile.current_rank && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                              {userProfile.current_rank}
                          </Badge>
                      )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="font-bold text-green-400">{userProfile.wins}</div>
                        <div className="text-sidebar-foreground/50">Wins</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-400">{userProfile.losses}</div>
                        <div className="text-sidebar-foreground/50">Losses</div>
                      </div>
                      <div>
                        <div className="font-bold text-yellow-400">{userProfile.tournaments_won}</div>
                        <div className="text-sidebar-foreground/50">Won</div>
                      </div>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
        )}

        {/* Discord Link - Redesigned */}
        {!isCollapsed && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Community</SidebarGroupLabel>
              <SidebarGroupContent>
                  <a
                    href="https://discord.gg/TLR"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 m-2 bg-sidebar-accent/50 border border-sidebar-border rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                      <span>Join our Discord</span>
                      <ChevronRight className="w-4 h-4 text-sidebar-foreground/70" />
                  </a>
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