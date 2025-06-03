
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{
    to: string;
    icon: React.ComponentType<any>;
    label: string;
  }>;
  adminNavItems: Array<{
    to: string;
    icon: React.ComponentType<any>;
    label: string;
  }>;
  user: User | null;
  onSignOut: () => Promise<void>;
}

const MobileNav = ({ isOpen, onClose, navItems, adminNavItems, user, onSignOut }: MobileNavProps) => {
  if (!isOpen) return null;

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
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
