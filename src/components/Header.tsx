
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trophy, User, LogIn } from "lucide-react";

const Header = () => {
  // Mock authentication state - will be replaced with actual Discord OAuth
  const isAuthenticated = false;
  const user = null;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
            <Trophy className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">TGH Skirmish</span>
          </Link>

          {/* Navigation */}
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

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-800">
                  Logout
                </Button>
              </div>
            ) : (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <LogIn className="w-4 h-4 mr-2" />
                Login with Discord
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
