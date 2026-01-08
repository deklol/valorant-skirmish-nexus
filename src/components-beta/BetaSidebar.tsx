import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Trophy,
  BarChart3,
  Users,
  ShoppingBag,
  Video,
  HelpCircle,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { title: "Home", href: "/beta", icon: Home },
  { title: "Tournaments", href: "/beta/tournaments", icon: Trophy },
  { title: "Leaderboard", href: "/beta/leaderboard", icon: BarChart3 },
  { title: "Players", href: "/beta/players", icon: Users },
  { title: "Shop", href: "/beta/shop", icon: ShoppingBag },
  { title: "VODs", href: "/beta/vods", icon: Video },
  { title: "Help", href: "/beta/help", icon: HelpCircle },
];

const userItems = [
  { title: "Profile", href: "/beta/profile", icon: User },
];

const adminItems = [
  { title: "Admin", href: "/beta/admin", icon: Shield },
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

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => (
    <NavLink
      to={item.href}
      end={item.href === "/beta"}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-[var(--beta-radius-lg)] transition-all",
        "text-sm font-medium",
        isActive(item.href)
          ? "bg-[hsl(var(--beta-accent-subtle))] text-[hsl(var(--beta-accent))]"
          : "text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? item.title : undefined}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.href) && "text-[hsl(var(--beta-accent))]")} />
      {!collapsed && <span>{item.title}</span>}
    </NavLink>
  );

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen z-40 flex flex-col",
        "bg-[hsl(var(--beta-surface-2))] border-r border-[hsl(var(--beta-border))]",
        "transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[hsl(var(--beta-border))]">
        {!collapsed && (
          <span className="text-lg font-bold text-[hsl(var(--beta-accent))]">
            TLR
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 rounded-[var(--beta-radius-md)] transition-colors",
            "text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]",
            "hover:bg-[hsl(var(--beta-surface-3))]",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {user && (
          <>
            <div className="my-4 border-t border-[hsl(var(--beta-border))]" />
            {userItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            {!user && <div className="my-4 border-t border-[hsl(var(--beta-border))]" />}
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[hsl(var(--beta-border))]">
          <p className="text-xs text-[hsl(var(--beta-text-muted))]">Beta Preview</p>
        </div>
      )}
    </div>
  );
};

export { BetaSidebar };
