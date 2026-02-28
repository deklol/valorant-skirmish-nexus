import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, Users, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    label: "Tournaments",
    description: "Browse & register",
    icon: Trophy,
    href: "/tournaments",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-700/30 hover:border-red-500/50",
  },
  {
    label: "Leaderboard",
    description: "Rankings & stats",
    icon: TrendingUp,
    href: "/leaderboard",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-700/30 hover:border-yellow-500/50",
  },
  {
    label: "Players",
    description: "Find competitors",
    icon: Users,
    href: "/players",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-700/30 hover:border-blue-500/50",
  },
  {
    label: "Shop",
    description: "Spend your points",
    icon: ShoppingBag,
    href: "/shop",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-700/30 hover:border-purple-500/50",
  },
];

const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link key={action.href} to={action.href}>
          <Card
            className={`border transition-colors cursor-pointer ${action.bg}`}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <action.icon className={`w-6 h-6 ${action.color}`} />
              <div>
                <div className="text-white text-sm font-semibold">{action.label}</div>
                <div className="text-slate-400 text-xs">{action.description}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default QuickActions;
