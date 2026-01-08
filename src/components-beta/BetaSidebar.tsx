import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Trophy,
  Users,
  BarChart3,
  User,
  ShoppingBag,
  Video,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "Home", href: "/beta", icon: Home },
  { label: "Tournaments", href: "/beta/tournaments", icon: Trophy },
  { label: "Leaderboard", href: "/beta/leaderboard", icon: BarChart3 },
  { label: "Players", href: "/beta/players", icon: Users },
  { label: "Shop", href: "/beta/shop", icon: ShoppingBag },
  { label: "VODs", href: "/beta/vods", icon: Video },
  { label: "Help", href: "/beta/help", icon: HelpCircle },
];

const userNavItems: NavItem[] = [
  { label: "Profile", href: "/beta/profile", icon: User },
];

const adminNavItems: NavItem[] = [
  { label: "Admin", href: "/beta/admin", icon: Settings },
];

const BetaSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const isActive = (href: string) => {
    if (href === "/beta") {
      return location.pathname === "/beta";
    }
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-[var(--beta-radius-md)] px-3 py-2.5",
        "transition-all duration-[var(--beta-transition-fast)]",
        "text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))]",
        "hover:bg-[hsl(var(--beta-surface-3))]",
        isActive(item.href) && [
          "bg-[hsl(var(--beta-accent-subtle))] text-[hsl(var(--beta-accent))]",
          "border-l-2 border-[hsl(var(--beta-accent))]",
        ]
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen",
        "beta-glass-strong border-r border-[hsl(var(--beta-glass-border))]",
        "transition-all duration-[var(--beta-transition-slow)]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[hsl(var(--beta-glass-border))]">
          {!collapsed && (
            <Link to="/beta" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-accent))] flex items-center justify-center">
                <Trophy className="h-4 w-4 text-[hsl(var(--beta-surface-1))]" />
              </div>
              <span className="text-lg font-bold beta-gradient-text">TLR</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-[var(--beta-radius-sm)] p-1.5 text-[hsl(var(--beta-text-muted))] hover:bg-[hsl(var(--beta-surface-3))] hover:text-[hsl(var(--beta-text-primary))] transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {user && (
            <>
              <div className="my-4 border-t border-[hsl(var(--beta-glass-border))]" />
              {userNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <div className="my-4 border-t border-[hsl(var(--beta-glass-border))]" />
              {adminNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--beta-glass-border))] p-4">
          {!collapsed && (
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">
              Beta Design Preview
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export { BetaSidebar };
