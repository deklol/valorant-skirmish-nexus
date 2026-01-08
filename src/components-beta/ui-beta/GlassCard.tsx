import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "subtle";
  glow?: boolean;
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", glow = false, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--beta-radius-lg)] transition-all",
          "duration-[var(--beta-transition-base)]",
          {
            "beta-glass": variant === "default",
            "beta-glass-strong": variant === "strong",
            "bg-[hsl(var(--beta-surface-2)/0.5)] border border-[hsl(var(--beta-glass-border))]": variant === "subtle",
          },
          glow && "beta-glow",
          hover && "hover:border-[hsl(var(--beta-accent)/0.3)] hover:shadow-[var(--beta-shadow-md)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
