import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Trophy, Users, Calendar, Menu, X, LogOut, User, Settings, Shield, Youtube, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileNav from "./MobileNav";
import { EnhancedNotificationCenter } from "./notifications";
import { useAppSettings } from "@/contexts/AppSettingsContext";

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { appName } = useAppSettings();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Logo and Title */}
          <div className="md:hidden flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-red-500" />
            <span className="font-bold text-white text-lg">{appName || "TLR Hub"}</span>
          </div>
          
          {/* Desktop: Empty left side for sidebar */}
          <div className="hidden md:block"></div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/tournaments" className="text-slate-300 hover:text-white transition-colors">
              <Calendar className="w-4 h-4 inline mr-2" />
              Tournaments
            </Link>
            <Link to="/leaderboard" className="text-slate-300 hover:text-white transition-colors">
              <Trophy className="w-4 h-4 inline mr-2" />
              Leaderboard
            </Link>
            <Link to="/players" className="text-slate-300 hover:text-white transition-colors">
              <Users className="w-4 h-4 inline mr-2" />
              Players
            </Link>
            <Link to="/help" className="text-slate-300 hover:text-white transition-colors">
              <Video className="w-4 h-4 inline mr-2" />
              Help
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-slate-300 hover:text-red-400 transition-colors border-b-2 border-transparent hover:border-red-400">
                <Settings className="w-4 h-4 inline mr-2" />
                Admin
              </Link>
            )}
            {/* Discord link for desktop */}
            <a
              href="https://discord.gg/TLR"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-slate-300 hover:text-indigo-400 transition-colors font-semibold"
              title="Join our Discord"
            >
              Discord
            </a>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Discord button for mobile, no icon */}
            <a
              href="https://discord.gg/TLR"
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden flex items-center text-slate-300 hover:text-indigo-400 font-semibold"
              aria-label="Join our Discord"
              title="Join our Discord"
            >
              Discord
            </a>
            {user && <EnhancedNotificationCenter />}
            
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="bg-red-600/20 hover:bg-red-600/30 border-red-600/30 text-red-400">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                
                <div className="hidden md:flex items-center space-x-2">
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden text-slate-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button onClick={() => navigate('/login')} variant="ghost" className="text-slate-300 hover:text-white">
                  Sign In
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden text-slate-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40" 
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Mobile Nav */}
          <div className="md:hidden fixed top-16 left-0 right-0 z-50">
            <MobileNav 
              user={user} 
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
