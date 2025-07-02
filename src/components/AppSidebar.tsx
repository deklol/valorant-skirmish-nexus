import { useState, useEffect } from "react";
import { Calendar, Trophy, Users, Shield, User, LogOut, Home, Archive, ChevronRight, PlayCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const [latestTournament, setLatestTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  const isCollapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClasses = (path: string) => 
    isActive(path) 
      ? "bg-red-600/20 text-red-400 border-r-2 border-red-500" 
      : "text-slate-300 hover:text-white hover:bg-slate-800/50";

  // Main navigation items
  const mainNavItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Tournaments", url: "/tournaments", icon: Calendar },
    { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
    { title: "Players", url: "/players", icon: Users },
    { title: "Archive", url: "/archive", icon: Archive },
  ];

  // Admin navigation items
  const adminNavItems = [
    { title: "Admin Dashboard", url: "/admin", icon: Shield },
  ];

  // User navigation items
  const userNavItems = user ? [
    { title: "Profile", url: "/profile", icon: User },
  ] : [];

  useEffect(() => {
    const fetchLatestTournament = async () => {
      try {
        const { data } = await supabase
          .from('tournaments')
          .select('id, name, start_time, status, max_players, tournament_signups(count)')
          .in('status', ['open'])
          .order('start_time', { ascending: true })
          .limit(1)
          .single();

        setLatestTournament(data);
      } catch (error) {
        console.log('No active tournaments found');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestTournament();
  }, []);

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

  return (
    <Sidebar className="border-r border-slate-700 bg-slate-900">
      <SidebarHeader className="p-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-red-500" />
            <span className="font-bold text-white">TLR Hub</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <item.icon className={`h-4 w-4 ${isCollapsed ? 'mx-auto' : 'mr-2'}`} />
                      {!isCollapsed && <span>{item.title}</span>}
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
            <SidebarGroupLabel className="text-slate-400">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className={`h-4 w-4 ${isCollapsed ? 'mx-auto' : 'mr-2'}`} />
                        {!isCollapsed && <span>{item.title}</span>}
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
            <SidebarGroupLabel className="text-slate-400">Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className={`h-4 w-4 ${isCollapsed ? 'mx-auto' : 'mr-2'}`} />
                        {!isCollapsed && <span>{item.title}</span>}
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
            <SidebarGroupLabel className="text-slate-400">Latest Tournament</SidebarGroupLabel>
            <SidebarGroupContent>
              {loading ? (
                <div className="p-4 text-center text-slate-500">Loading...</div>
              ) : latestTournament ? (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-red-400" />
                      {latestTournament.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(latestTournament.start_time)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        {latestTournament.tournament_signups?.[0]?.count || 0}/{latestTournament.max_players}
                      </div>
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs">
                        {latestTournament.status}
                      </Badge>
                    </div>
                    <NavLink to={`/tournament/${latestTournament.id}`}>
                      <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-xs">
                        Join Tournament
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No active tournaments</p>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Stats - Only show when expanded */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400">Quick Info</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-3 space-y-2">
                <a
                  href="https://discord.gg/TLR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full border-blue-600/30 text-blue-400 hover:bg-blue-600/20">
                    Join Discord
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </a>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with user info and sign out */}
      {user && (
        <SidebarFooter className="p-4">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 truncate">
                {user.email || 'User'}
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="w-full p-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}