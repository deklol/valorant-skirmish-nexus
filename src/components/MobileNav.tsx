
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { Trophy, User, LogIn, Menu, LogOut, Shield } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden text-white">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-slate-900 border-slate-700">
        <div className="flex flex-col space-y-4 mt-6">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-white hover:text-red-400 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Trophy className="w-5 h-5 text-red-500" />
            <span className="font-bold">TGH Skirmish</span>
          </Link>
          
          <div className="border-t border-slate-700 pt-4 space-y-2">
            <Link 
              to="/tournaments" 
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              Tournaments
            </Link>
            <Link 
              to="/brackets" 
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              Brackets
            </Link>
            <Link 
              to="/leaderboard" 
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              Leaderboard
            </Link>
            <Link 
              to="/archive" 
              className="block text-slate-300 hover:text-white transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              Archive
            </Link>
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors py-2"
                    onClick={() => setOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors py-2"
                onClick={() => setOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
