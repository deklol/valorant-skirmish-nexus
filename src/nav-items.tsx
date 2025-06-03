
import { HomeIcon, TrophyIcon, UsersIcon, BarChart3Icon, SettingsIcon } from "lucide-react";

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <div>Home</div>,
  },
  {
    title: "Tournaments",
    to: "/tournaments",
    icon: <TrophyIcon className="h-4 w-4" />,
    page: <div>Tournaments</div>,
  },
  {
    title: "Teams",
    to: "/teams",
    icon: <UsersIcon className="h-4 w-4" />,
    page: <div>Teams</div>,
  },
  {
    title: "Leaderboard",
    to: "/leaderboard",
    icon: <BarChart3Icon className="h-4 w-4" />,
    page: <div>Leaderboard</div>,
  },
  {
    title: "Admin",
    to: "/admin",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <div>Admin</div>,
  },
];
