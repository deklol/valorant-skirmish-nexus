
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Menu, X, LogOut, User, Settings, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileNav from "./MobileNav";
import RealTimeNotifications from "./RealTimeNotifications";

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-red-500" />
            <span className="text-xl font-bold text-white">ValTourneys</span>
          </Link>

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
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && <RealTimeNotifications />}
            
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

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <MobileNav 
          user={user} 
          isAdmin={isAdmin}
          onSignOut={handleSignOut}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
