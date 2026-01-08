import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BetaBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "error" | "outline";
  size?: "sm" | "md";
}

const BetaBadge = ({
  className,
  variant = "default",
  size = "md",
  ...props
}: BetaBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "transition-colors duration-[var(--beta-transition-fast)]",
        {
          // Variants
          "bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-text-secondary))]":
            variant === "default",
          "bg-[hsl(var(--beta-accent-subtle))] text-[hsl(var(--beta-accent))]":
            variant === "accent",
          "bg-[hsl(var(--beta-success)/0.15)] text-[hsl(var(--beta-success))]":
            variant === "success",
          "bg-[hsl(var(--beta-warning)/0.15)] text-[hsl(var(--beta-warning))]":
            variant === "warning",
          "bg-[hsl(var(--beta-error)/0.15)] text-[hsl(var(--beta-error))]":
            variant === "error",
          "bg-transparent border border-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-text-secondary))]":
            variant === "outline",
          // Sizes
          "px-2 py-0.5 text-xs": size === "sm",
          "px-2.5 py-1 text-xs": size === "md",
        },
        className
      )}
      {...props}
    />
  );
};

export { BetaBadge };
