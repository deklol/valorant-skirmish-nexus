import { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Trophy,
  BarChart3,
  Users,
  ShoppingBag,
  Video,
  HelpCircle,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  Settings,
  UsersRound,
  Radio,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserTeam } from "@/hooks/useUserTeam";
import { supabase } from "@/integrations/supabase/client";

// Social icons as simple SVG components
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface LiveMatch {
  id: string;
  team1_name: string;
  team2_name: string;
  score_team1: number;
  score_team2: number;
  tournament_name: string;
}

interface SocialLinks {
  discord_link: string | null;
  twitter_link: string | null;
  youtube_link: string | null;
}

interface LatestTournament {
  id: string;
  name: string;
  status: string;
  current_signups: number;
  max_participants: number | null;
}

const navigationItems = [
  { title: "Home", href: "/beta", icon: Home },
  { title: "Tournaments", href: "/beta/tournaments", icon: Trophy },
  { title: "Teams", href: "/beta/teams", icon: UsersRound },
  { title: "Leaderboard", href: "/beta/leaderboard", icon: BarChart3 },
  { title: "Players", href: "/beta/players", icon: Users },
  { title: "Shop", href: "/beta/shop", icon: ShoppingBag },
  { title: "VODs", href: "/beta/vods", icon: Video },
  { title: "Help", href: "/beta/help", icon: HelpCircle },
];

const adminItems = [
  { title: "Admin", href: "/beta/admin", icon: Shield },
];

const BetaSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { userTeam, loading: teamLoading } = useUserTeam(user?.id);
  
  // Dynamic content state
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [latestTournament, setLatestTournament] = useState<LatestTournament | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({ discord_link: null, twitter_link: null, youtube_link: null });
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState<string | null>(null);

  // Build user items dynamically based on team membership
  const userItems = [
    { title: "Profile", href: "/beta/profile", icon: User },
    ...(userTeam ? [{ title: "My Team", href: "/beta/my-team", icon: UsersRound }] : []),
    { title: "Settings", href: "/beta/settings", icon: Settings },
  ];

  // Fetch dynamic content
  useEffect(() => {
    const fetchDynamicContent = async () => {
      // Fetch live matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select(`
          id,
          score_team1,
          score_team2,
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name),
          tournament:tournaments(name)
        `)
        .eq("status", "live")
        .limit(3);

      if (matchesData) {
        setLiveMatches(matchesData.map((m: any) => ({
          id: m.id,
          team1_name: m.team1?.name || "TBD",
          team2_name: m.team2?.name || "TBD",
          score_team1: m.score_team1 || 0,
          score_team2: m.score_team2 || 0,
          tournament_name: m.tournament?.name || "Tournament",
        })));
      }

      // Fetch latest open/live tournament
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("id, name, status, max_players")
        .in("status", ["open", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (tournamentData) {
        // Get signup count
        const { count } = await supabase
          .from("tournament_signups")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournamentData.id);

        setLatestTournament({
          id: tournamentData.id,
          name: tournamentData.name,
          status: tournamentData.status,
          current_signups: count || 0,
          max_participants: tournamentData.max_players,
        });
      }

      // Fetch social links and logo
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("discord_link, twitter_link, youtube_link, sidebar_logo_url")
        .limit(1)
        .single();

      if (settingsData) {
        setSocialLinks({
          discord_link: settingsData.discord_link,
          twitter_link: settingsData.twitter_link,
          youtube_link: settingsData.youtube_link,
        });
        setSidebarLogoUrl((settingsData as any).sidebar_logo_url || null);
      }
    };

    fetchDynamicContent();

    // Subscribe to live match updates
    const matchesChannel = supabase
      .channel("sidebar-live-matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: "status=eq.live" }, () => {
        fetchDynamicContent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/beta") {
      return location.pathname === "/beta";
    }
    return location.pathname.startsWith(href);
  };

  // Check if any tournament is live
  const hasLiveTournament = latestTournament?.status === "live" || liveMatches.length > 0;

  const NavItem = ({ item, showLiveBadge = false }: { item: typeof navigationItems[0]; showLiveBadge?: boolean }) => (
    <NavLink
      to={item.href}
      end={item.href === "/beta"}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
        "text-sm font-medium",
        isActive(item.href)
          ? "bg-[hsl(38_92%_50%)] text-[hsl(220_20%_4%)]"
          : "text-[hsl(220_10%_65%)] hover:text-[hsl(40_20%_96%)] hover:bg-[hsl(220_16%_12%)]",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.title : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.title}</span>}
      {showLiveBadge && hasLiveTournament && (
        <span className={cn(
          "flex items-center gap-1 text-xs font-bold",
          collapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          {!collapsed && <span className="text-red-400">LIVE</span>}
        </span>
      )}
    </NavLink>
  );

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen z-40 flex flex-col",
        "bg-[hsl(220_18%_7%)] border-r border-[hsl(220_15%_15%)]",
        "transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-[hsl(220_15%_15%)]">
        {!collapsed && (
          <Link to="/beta" className="flex items-center justify-center flex-1">
            {sidebarLogoUrl ? (
              <img 
                src={sidebarLogoUrl} 
                alt="Logo" 
                className="h-10 w-auto object-contain hover:opacity-80 transition-opacity"
              />
            ) : (
              <span className="text-xl font-bold text-[hsl(38_92%_50%)] hover:opacity-80 transition-opacity">
                TLR
              </span>
            )}
          </Link>
        )}
        {collapsed && (
          <Link to="/beta" className="flex items-center justify-center flex-1">
            {sidebarLogoUrl ? (
              <img 
                src={sidebarLogoUrl} 
                alt="Logo" 
                className="h-8 w-8 object-contain hover:opacity-80 transition-opacity"
              />
            ) : (
              <span className="text-lg font-bold text-[hsl(38_92%_50%)] hover:opacity-80 transition-opacity">
                T
              </span>
            )}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 rounded-lg transition-colors shrink-0",
            "text-[hsl(220_10%_45%)] hover:text-[hsl(40_20%_96%)]",
            "hover:bg-[hsl(220_16%_12%)]"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Section Header */}
        {!collapsed && (
          <p className="text-[10px] font-semibold text-[hsl(38_92%_50%)] uppercase tracking-wider px-3 mb-3">
            Navigation
          </p>
        )}
        
        {navigationItems.map((item) => (
          <NavItem 
            key={item.href} 
            item={item} 
            showLiveBadge={item.href === "/beta/tournaments"}
          />
        ))}

        {user && (
          <>
            <div className="my-4 border-t border-[hsl(220_15%_15%)]" />
            {!collapsed && (
              <p className="text-[10px] font-semibold text-[hsl(38_92%_50%)] uppercase tracking-wider px-3 mb-3">
                Account
              </p>
            )}
            {userItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </>
        )}

        {/* Live Matches Section - Only when expanded */}
        {!collapsed && liveMatches.length > 0 && (
          <>
            <div className="my-4 border-t border-[hsl(220_15%_15%)]" />
            <div className="px-1">
              <div className="flex items-center gap-2 px-2 mb-2">
                <Radio className="h-3 w-3 text-red-400" />
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                  Live Matches
                </p>
              </div>
              <div className="space-y-2">
                {liveMatches.slice(0, 2).map((match) => (
                  <Link
                    key={match.id}
                    to={`/beta/match/${match.id}`}
                    className="block p-2 rounded-lg bg-[hsl(220_16%_10%)] hover:bg-[hsl(220_16%_12%)] transition-colors border border-[hsl(220_15%_15%)]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[hsl(40_20%_96%)] font-medium truncate max-w-[70px]">
                        {match.team1_name}
                      </span>
                      <span className="text-[hsl(38_92%_50%)] font-bold px-2">
                        {match.score_team1} - {match.score_team2}
                      </span>
                      <span className="text-[hsl(40_20%_96%)] font-medium truncate max-w-[70px] text-right">
                        {match.team2_name}
                      </span>
                    </div>
                    <p className="text-[10px] text-[hsl(220_10%_45%)] mt-1 truncate">
                      {match.tournament_name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Latest Tournament Card - Only when expanded */}
        {!collapsed && latestTournament && (
          <>
            <div className="my-4 border-t border-[hsl(220_15%_15%)]" />
            <div className="px-1">
              <p className="text-[10px] font-semibold text-[hsl(38_92%_50%)] uppercase tracking-wider px-2 mb-2">
                Latest Tournament
              </p>
              <Link
                to={`/beta/tournament/${latestTournament.id}`}
                className="block p-3 rounded-lg bg-[hsl(220_16%_10%)] border border-[hsl(220_15%_15%)] hover:border-[hsl(38_70%_30%)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[hsl(40_20%_96%)] truncate flex-1">
                    {latestTournament.name}
                  </p>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    latestTournament.status === "live" 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-green-500/20 text-green-400"
                  )}>
                    {latestTournament.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[hsl(220_10%_45%)]">
                    {latestTournament.current_signups}
                    {latestTournament.max_participants && `/${latestTournament.max_participants}`} players
                  </span>
                  <ChevronRight className="h-4 w-4 text-[hsl(220_10%_45%)] group-hover:text-[hsl(38_92%_50%)] transition-colors" />
                </div>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Footer with Social Links */}
      <div className="border-t border-[hsl(220_15%_15%)] p-3">
        {!collapsed ? (
          <div className="space-y-3">
            {/* Social Icons Row */}
            {(socialLinks.discord_link || socialLinks.twitter_link || socialLinks.youtube_link) && (
              <div className="flex items-center justify-center gap-2">
                {socialLinks.discord_link && (
                  <a
                    href={socialLinks.discord_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[hsl(220_16%_10%)] hover:bg-[#5865F2] text-[hsl(220_10%_45%)] hover:text-white transition-all"
                    title="Discord"
                  >
                    <DiscordIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.twitter_link && (
                  <a
                    href={socialLinks.twitter_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[hsl(220_16%_10%)] hover:bg-[hsl(220_16%_14%)] text-[hsl(220_10%_45%)] hover:text-white transition-all"
                    title="X / Twitter"
                  >
                    <TwitterIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.youtube_link && (
                  <a
                    href={socialLinks.youtube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[hsl(220_16%_10%)] hover:bg-[#FF0000] text-[hsl(220_10%_45%)] hover:text-white transition-all"
                    title="YouTube"
                  >
                    <YoutubeIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
            <p className="text-[10px] text-center text-[hsl(220_10%_45%)]">Beta Preview</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {socialLinks.discord_link && (
              <a
                href={socialLinks.discord_link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-[hsl(220_16%_10%)] hover:bg-[#5865F2] text-[hsl(220_10%_45%)] hover:text-white transition-all"
                title="Discord"
              >
                <DiscordIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { BetaSidebar };
