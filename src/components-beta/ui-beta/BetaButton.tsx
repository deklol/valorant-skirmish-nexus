import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface BetaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const BetaButton = forwardRef<HTMLButtonElement, BetaButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium",
          "rounded-[var(--beta-radius-md)] transition-all",
          "duration-[var(--beta-transition-fast)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--beta-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--beta-surface-1))]",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            // Variants
            "bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))] hover:bg-[hsl(var(--beta-accent-muted))] shadow-[var(--beta-shadow-sm)]":
              variant === "primary",
            "bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-glass-border))]":
              variant === "secondary",
            "text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]":
              variant === "ghost",
            "border border-[hsl(var(--beta-accent)/0.5)] text-[hsl(var(--beta-accent))] hover:bg-[hsl(var(--beta-accent)/0.1)] hover:border-[hsl(var(--beta-accent))]":
              variant === "outline",
            "bg-[hsl(var(--beta-error))] text-white hover:bg-[hsl(var(--beta-error)/0.8)]":
              variant === "danger",
            // Sizes
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

BetaButton.displayName = "BetaButton";

export { BetaButton };
