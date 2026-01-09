import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { BetaButton } from "./ui-beta/BetaButton";

const BetaHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/beta");
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-1)/0.95)] backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-[var(--beta-radius-md)] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile logo */}
        <Link to="/beta" className="lg:hidden text-lg font-bold text-[hsl(var(--beta-accent))]">
          TLR
        </Link>

        {/* Desktop spacer */}
        <div className="hidden lg:block" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-[var(--beta-radius-md)] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[hsl(var(--beta-accent))]" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/beta/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--beta-radius-lg)] text-sm font-medium text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-[var(--beta-radius-md)] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-error))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/login">
              <BetaButton variant="primary" size="sm">
                Sign In
              </BetaButton>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-2))] py-4 px-4 space-y-1 beta-animate-fade-in">
          <MobileNavLink to="/beta" onClick={() => setMobileMenuOpen(false)}>Home</MobileNavLink>
          <MobileNavLink to="/beta/tournaments" onClick={() => setMobileMenuOpen(false)}>Tournaments</MobileNavLink>
          <MobileNavLink to="/beta/leaderboard" onClick={() => setMobileMenuOpen(false)}>Leaderboard</MobileNavLink>
          <MobileNavLink to="/beta/players" onClick={() => setMobileMenuOpen(false)}>Players</MobileNavLink>
          <MobileNavLink to="/beta/shop" onClick={() => setMobileMenuOpen(false)}>Shop</MobileNavLink>
          <MobileNavLink to="/beta/vods" onClick={() => setMobileMenuOpen(false)}>VODs</MobileNavLink>
          <MobileNavLink to="/beta/help" onClick={() => setMobileMenuOpen(false)}>Help</MobileNavLink>
          <div className="my-3 border-t border-[hsl(var(--beta-border))]" />
          <MobileNavLink to="/beta/profile" onClick={() => setMobileMenuOpen(false)}>Profile</MobileNavLink>
          <MobileNavLink to="/beta/settings" onClick={() => setMobileMenuOpen(false)}>Settings</MobileNavLink>
          {isAdmin && (
            <MobileNavLink to="/beta/admin" onClick={() => setMobileMenuOpen(false)}>Admin</MobileNavLink>
          )}
        </div>
      )}
    </header>
  );
};

const MobileNavLink = ({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-4 py-2.5 rounded-[var(--beta-radius-lg)] text-sm font-medium text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
  >
    {children}
  </Link>
);

export { BetaHeader };
