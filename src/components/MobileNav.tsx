
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Calendar, Trophy, Users, User as UserIcon, LogOut, Shield } from "lucide-react";

interface MobileNavProps {
  user: User | null;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

const MobileNav = ({ user, isAdmin, onSignOut, onClose }: MobileNavProps) => {
  const navItems = [
    { to: "/tournaments", icon: Calendar, label: "Tournaments" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/brackets", icon: Users, label: "Brackets" },
  ];

  const adminNavItems = isAdmin ? [
    { to: "/admin", icon: Shield, label: "Admin" },
  ] : [];

  return (
    <div className="md:hidden bg-slate-800 border-t border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors py-2"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          {adminNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors py-2"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {user && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
            <Link to="/profile" onClick={onClose}>
              <Button variant="ghost" className="w-full text-white hover:bg-slate-700 justify-start">
                <UserIcon className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full text-slate-300 hover:text-white hover:bg-slate-700 justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
