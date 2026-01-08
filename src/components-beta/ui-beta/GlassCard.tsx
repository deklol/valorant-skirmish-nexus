import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "subtle" | "interactive";
  glow?: boolean;
  hover?: boolean;
  noPadding?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", glow = false, hover = false, noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--beta-radius-xl)] transition-all",
          "duration-[var(--beta-transition-base)]",
          !noPadding && "p-5",
          {
            "beta-glass": variant === "default",
            "beta-glass-strong": variant === "strong",
            "beta-glass-subtle": variant === "subtle",
            "beta-glass beta-hover-glow cursor-pointer": variant === "interactive",
          },
          glow && "beta-glow",
          hover && "beta-hover-lift beta-hover-glow",
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
