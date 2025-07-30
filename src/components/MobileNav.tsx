
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@supabase/supabase-js";
import { 
  Calendar, 
  Trophy, 
  Users, 
  User as UserIcon, 
  LogOut, 
  Shield, 
  Home,
  TrendingUp,
  ShoppingBag,
  HelpCircle,
  UsersRound,
  ChevronRight,
  Video
} from "lucide-react";

interface MobileNavProps {
  user: User | null;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

const MobileNav = ({ user, isAdmin, onSignOut, onClose }: MobileNavProps) => {
  // Complete navigation matching desktop sidebar
  const mainNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/tournaments", icon: Calendar, label: "Tournaments" },
    { to: "/teams-directory", icon: Users, label: "Teams" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/players", icon: UserIcon, label: "Players" },
    { to: "/vods", icon: Video, label: "VODs" },
    { to: "/statistics", icon: TrendingUp, label: "Statistics" },
    { to: "/shop", icon: ShoppingBag, label: "Shop" },
    { to: "/help", icon: HelpCircle, label: "Help" },
  ];

  const adminNavItems = isAdmin ? [
    { to: "/admin", icon: Shield, label: "Admin Dashboard" },
  ] : [];

  const userNavItems = user ? [
    { to: "/teams", icon: UsersRound, label: "My Team" },
  ] : [];

  return (
    <div className="md:hidden bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="container mx-auto px-4 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Navigation</div>
          {mainNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center justify-between px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        {/* Admin Navigation */}
        {adminNavItems.length > 0 && (
          <nav className="mt-6 space-y-1">
            <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3">Admin</div>
            {adminNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="flex items-center justify-between px-3 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>
        )}

        {/* User Navigation */}
        {user && userNavItems.length > 0 && (
          <nav className="mt-6 space-y-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Account</div>
            {userNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="flex items-center justify-between px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>
        )}

        {/* Discord Link */}
        <div className="mt-6 px-3">
          <a
            href="https://discord.gg/TLR"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-center w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Join Discord Community
          </a>
        </div>
        
        {/* User Profile Section */}
        {user && (
          <div className="mt-6 pt-4 border-t border-slate-700 space-y-2">
            <Link to="/profile" onClick={onClose}>
              <Button variant="ghost" className="w-full text-white hover:bg-slate-700/70 justify-start py-3 px-3 rounded-lg">
                <UserIcon className="w-5 h-5 mr-3" />
                <span className="font-medium">Profile</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full text-slate-300 hover:text-white hover:bg-slate-700/70 justify-start py-3 px-3 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
