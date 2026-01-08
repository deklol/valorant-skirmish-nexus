import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BetaButton } from "./ui-beta/BetaButton";
import { Bell, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const BetaHeader = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/beta");
  };

  return (
    <header className="sticky top-0 z-30 w-full beta-glass-strong border-b border-[hsl(var(--beta-glass-border))]">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu button */}
        <button
          className="md:hidden rounded-[var(--beta-radius-md)] p-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Page title area - can be customized per page */}
        <div className="hidden md:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications */}
              <button className="relative rounded-[var(--beta-radius-md)] p-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))] hover:text-[hsl(var(--beta-text-primary))] transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[hsl(var(--beta-accent))]" />
              </button>

              {/* User menu */}
              <div className="flex items-center gap-2">
                <Link
                  to="/beta/profile"
                  className="flex items-center gap-2 rounded-[var(--beta-radius-md)] px-3 py-1.5 text-sm text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))] hover:text-[hsl(var(--beta-text-primary))] transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="rounded-[var(--beta-radius-md)] p-2 text-[hsl(var(--beta-text-muted))] hover:bg-[hsl(var(--beta-surface-3))] hover:text-[hsl(var(--beta-error))] transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <Link to="/beta/login">
              <BetaButton variant="primary" size="sm">
                Sign In
              </BetaButton>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[hsl(var(--beta-glass-border))] bg-[hsl(var(--beta-surface-2))] p-4">
          <nav className="space-y-2">
            <Link
              to="/beta"
              className="block rounded-[var(--beta-radius-md)] px-3 py-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/beta/tournaments"
              className="block rounded-[var(--beta-radius-md)] px-3 py-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tournaments
            </Link>
            <Link
              to="/beta/leaderboard"
              className="block rounded-[var(--beta-radius-md)] px-3 py-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <Link
              to="/beta/players"
              className="block rounded-[var(--beta-radius-md)] px-3 py-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Players
            </Link>
            {isAdmin && (
              <Link
                to="/beta/admin"
                className="block rounded-[var(--beta-radius-md)] px-3 py-2 text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export { BetaHeader };
