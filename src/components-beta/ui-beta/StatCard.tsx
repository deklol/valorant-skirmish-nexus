import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { GlassCard } from "./GlassCard";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  valueClassName?: string;
}

const StatCard = ({ 
  label, 
  value, 
  icon, 
  trend, 
  trendValue,
  className,
  valueClassName 
}: StatCardProps) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-[hsl(var(--beta-success))]';
      case 'down': return 'text-[hsl(var(--beta-error))]';
      default: return 'text-[hsl(var(--beta-text-muted))]';
    }
  };

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
          <p className={cn(
            "text-2xl font-bold tracking-tight text-[hsl(var(--beta-text-primary))]",
            valueClassName
          )}>
            {value}
          </p>
          {trendValue && (
            <p className={cn("text-xs font-medium", getTrendColor())}>
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] p-3 transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
            <div className="h-5 w-5 text-[hsl(var(--beta-accent))] [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export { StatCard };
