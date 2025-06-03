
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Users, Calendar, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import NotificationSystem from "./NotificationSystem";
import MobileNav from "./MobileNav";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navItems = [
    { to: "/", icon: Trophy, label: "Tournaments" },
    { to: "/brackets", icon: BarChart3, label: "Brackets" },
    { to: "/leaderboard", icon: Users, label: "Leaderboard" },
    { to: "/archive", icon: Calendar, label: "Archive" },
  ];

  const adminNavItems = [
    { to: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <Trophy className="h-8 w-8 text-red-500" />
            <span className="text-xl font-bold text-white">TournamentHub</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {isAdmin && adminNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification System */}
                <NotificationSystem />
                
                {/* Profile Button */}
                <Link to="/profile">
                  <Button variant="ghost" className="text-white hover:bg-slate-700">
                    Profile
                  </Button>
                </Link>
                
                {/* Sign Out Button */}
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-slate-300 hover:text-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={isMenuOpen}
        onClose={closeMenu}
        navItems={navItems}
        adminNavItems={isAdmin ? adminNavItems : []}
        user={user}
        onSignOut={handleSignOut}
      />
    </header>
  );
};

export default Header;
