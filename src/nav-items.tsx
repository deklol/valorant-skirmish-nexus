
import { HomeIcon, TrophyIcon, UsersIcon, BarChart3Icon, SettingsIcon } from "lucide-react";
import Index from "./pages/Index";
import Tournaments from "./pages/Tournaments";
import Brackets from "./pages/Brackets";
import Archive from "./pages/Archive";
import Admin from "./pages/Admin";

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Tournaments",
    to: "/tournaments",
    icon: <TrophyIcon className="h-4 w-4" />,
    page: <Tournaments />,
  },
  {
    title: "Brackets",
    to: "/brackets",
    icon: <BarChart3Icon className="h-4 w-4" />,
    page: <Brackets />,
  },
  {
    title: "Archive",
    to: "/archive",
    icon: <UsersIcon className="h-4 w-4" />,
    page: <Archive />,
  },
  {
    title: "Admin",
    to: "/admin",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Admin />,
  },
];
