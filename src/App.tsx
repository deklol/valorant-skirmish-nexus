import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OnboardingSystem from "@/components/onboarding/OnboardingSystem";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
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
import { AppSettingsProvider } from "./contexts/AppSettingsContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const { loading } = useAuth();

  console.log('App loading state:', loading);

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <OnboardingSystem>
        <SidebarProvider>
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
                    <Route path="/settings/notifications" element={<NotificationSettings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </SidebarInset>
          </div>
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
        <Toaster />
        <Sonner />
        <AppSettingsProvider>
          <AppContent />
        </AppSettingsProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
