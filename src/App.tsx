import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OnboardingSystem from "@/components/onboarding/OnboardingSystem";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Players from "./pages/Players";
import Leaderboard from "./pages/Leaderboard";
import Brackets from "./pages/Brackets";
import BracketView from "./pages/BracketView";
import Archive from "./pages/Archive";
import MatchDetails from "./pages/MatchDetails";
import NotFound from "./pages/NotFound";
import TeamManagementPage from "./components/TeamManagementPage";
import TeamsDirectory from "./components/TeamsDirectory";
import TeamProfile from "./components/TeamProfile";
import Statistics from "./pages/Statistics";
import Help from "./pages/Help";
import Shop from "./pages/Shop";
import NotificationSettings from "./pages/NotificationSettings";
import VODs from "./pages/VODs";
import Broadcast from "./pages/Broadcast";
import TeamRoster from "./pages/broadcast/TeamRoster";
import MatchupPreview from "./pages/broadcast/MatchupPreview";
import BracketOverlay from "./pages/broadcast/BracketOverlay";
import PlayerSpotlightCard from "./pages/broadcast/PlayerSpotlightCard";
import TournamentStats from "./pages/broadcast/TournamentStats";
import TeamsOverview from "./pages/broadcast/TeamsOverview";
import TournamentData from "./pages/broadcast/api/TournamentData";
import BroadcastIds from "./pages/broadcast/BroadcastIds";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";
// BetaInvitePopup removed — no longer needed after beta promotion

// Beta imports - BETA ONLY
import { BetaLayout } from "./components-beta/BetaLayout";
import BetaIndex from "./pages-beta/BetaIndex";
import BetaTournaments from "./pages-beta/BetaTournaments";
import BetaLeaderboard from "./pages-beta/BetaLeaderboard";
import BetaPlayers from "./pages-beta/BetaPlayers";
import BetaTournamentDetail from "./pages-beta/BetaTournamentDetail";
import BetaProfile from "./pages-beta/BetaProfile";
import BetaMatchDetails from "./pages-beta/BetaMatchDetails";
import BetaAdmin from "./pages-beta/BetaAdmin";
import BetaShop from "./pages-beta/BetaShop";
import BetaVODs from "./pages-beta/BetaVODs";
import BetaHelp from "./pages-beta/BetaHelp";
import BetaProfileSettings from "./pages-beta/BetaProfileSettings";
import BetaTeams from "./pages-beta/BetaTeams";
import BetaTeamProfile from "./pages-beta/BetaTeamProfile";
import BetaTeamManagement from "./pages-beta/BetaTeamManagement";
import BetaStatistics from "./pages-beta/BetaStatistics";
import BetaBrackets from "./pages-beta/BetaBrackets";
import BetaBracketView from "./pages-beta/BetaBracketView";
const queryClient = new QueryClient();

/** Redirects old /beta/* bookmarks to the new root equivalents */
const BetaRedirect = () => {
  const path = window.location.pathname.replace(/^\/beta\/?/, "/");
  return <Navigate to={path} replace />;
};

const AppContent = () => {
  const { loading } = useAuth();

  // App loading state management

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-foreground text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <OnboardingSystem>
        <SidebarProvider>
          <Routes>
          {/* Original broadcast control panel */}
            <Route path="/broadcast/:id" element={<Broadcast />} />
            
            {/* Individual broadcast components for OBS/streaming */}
            <Route path="/broadcast/:id/teams" element={<TeamRoster />} />
            <Route path="/broadcast/:id/team/:teamId" element={<TeamRoster />} />
            <Route path="/broadcast/:id/matchup/:matchId" element={<MatchupPreview />} />
            <Route path="/broadcast/:id/bracket" element={<BracketOverlay />} />
            <Route path="/broadcast/:id/player/:playerId" element={<PlayerSpotlightCard />} />
            <Route path="/broadcast/:id/stats" element={<TournamentStats />} />
            <Route path="/broadcast/:id/teams-overview" element={<TeamsOverview />} />
            <Route path="/broadcast/:id/ids" element={<BroadcastIds />} />
            
            {/* API endpoint for external integrations */}
            <Route path="/broadcast/:id/api/data" element={<TournamentData />} />

            {/* Beta catch-all redirect: /beta/* -> /* */}
            <Route path="/beta" element={<Navigate to="/" replace />} />
            <Route path="/beta/*" element={<BetaRedirect />} />

            {/* PRIMARY ROUTES - Production (formerly beta) */}
            <Route path="/" element={<BetaLayout />}>
              <Route index element={<BetaIndex />} />
              <Route path="tournaments" element={<BetaTournaments />} />
              <Route path="tournament/:id" element={<BetaTournamentDetail />} />
              <Route path="leaderboard" element={<BetaLeaderboard />} />
              <Route path="players" element={<BetaPlayers />} />
              <Route path="profile" element={<BetaProfile />} />
              <Route path="profile/:userId" element={<BetaProfile />} />
              <Route path="match/:id" element={<BetaMatchDetails />} />
              <Route path="admin" element={<BetaAdmin />} />
              <Route path="shop" element={<BetaShop />} />
              <Route path="vods" element={<BetaVODs />} />
              <Route path="help" element={<BetaHelp />} />
              <Route path="settings" element={<BetaProfileSettings />} />
              <Route path="teams" element={<BetaTeams />} />
              <Route path="team/:id" element={<BetaTeamProfile />} />
              <Route path="my-team" element={<BetaTeamManagement />} />
              <Route path="statistics" element={<BetaStatistics />} />
              <Route path="brackets" element={<BetaBrackets />} />
              <Route path="bracket/:id" element={<BetaBracketView />} />
              <Route path="login" element={<Login />} />
            </Route>

            {/* LEGACY ROUTES - Original design, kept as fallback */}
            <Route path="/legacy/*" element={
              <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <AppSidebar />
                <SidebarInset className="flex-1">
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/:userId" element={<PublicProfile />} />
                        <Route path="/tournaments" element={<Tournaments />} />
                        <Route path="/tournament/:id" element={<TournamentDetail />} />
                        <Route path="/players" element={<Players />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/brackets" element={<Brackets />} />
                        <Route path="/bracket/:id" element={<BracketView />} />
                        <Route path="/archive" element={<Archive />} />
                        <Route path="/match/:id" element={<MatchDetails />} />
                        <Route path="/teams" element={<TeamManagementPage />} />
                        <Route path="/teams-directory" element={<TeamsDirectory />} />
                        <Route path="/team/:id" element={<TeamProfile />} />
                        <Route path="/statistics" element={<Statistics />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="/vods" element={<VODs />} />
                        <Route path="/settings/notifications" element={<NotificationSettings />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                  </div>
                </SidebarInset>
              </div>
            } />
          </Routes>
          <Toaster />
        </SidebarProvider>
      </OnboardingSystem>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Sonner />
        <AppSettingsProvider>
          <AppContent />
        </AppSettingsProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
