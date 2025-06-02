
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trophy, User, LogIn, LogOut, Shield } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import MobileNav from './MobileNav';

const Header = () => {
  const { user, profile, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
            <Trophy className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">TGH Skirmish</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/tournaments" className="text-slate-300 hover:text-white transition-colors">
              Tournaments
            </Link>
            <Link to="/brackets" className="text-slate-300 hover:text-white transition-colors">
              Brackets
            </Link>
            <Link to="/leaderboard" className="text-slate-300 hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link to="/archive" className="text-slate-300 hover:text-white transition-colors">
              Archive
            </Link>
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:bg-purple-900/20 hover:text-purple-300">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-slate-600 text-white hover:bg-slate-800"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Header;
