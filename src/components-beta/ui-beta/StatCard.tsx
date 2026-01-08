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
      className={cn("p-[var(--beta-space-4)]", className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">{label}</p>
          <p className="text-2xl font-semibold text-[hsl(var(--beta-text-primary))]">
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
          <div className="rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-accent-subtle))] p-2">
            <Icon className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export { StatCard };
