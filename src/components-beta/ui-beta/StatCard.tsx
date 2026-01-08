import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard = ({ label, value, icon: Icon, trend, className }: StatCardProps) => {
  return (
    <GlassCard
      variant="default"
      hover
      noPadding
      className={cn("p-5 group", className)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--beta-text-muted))]">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-[hsl(var(--beta-text-primary))]">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive
                  ? "text-[hsl(var(--beta-success))]"
                  : "text-[hsl(var(--beta-error))]"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] p-3 transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
            <Icon className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export { StatCard };
