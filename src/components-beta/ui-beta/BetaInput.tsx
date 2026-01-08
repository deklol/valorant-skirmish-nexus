import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

interface BetaInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const BetaInput = forwardRef<HTMLInputElement, BetaInputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--beta-radius-md)] px-3 py-2",
          "bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))]",
          "border border-[hsl(var(--beta-glass-border))]",
          "placeholder:text-[hsl(var(--beta-text-muted))]",
          "transition-all duration-[var(--beta-transition-fast)]",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[hsl(var(--beta-error))] focus:ring-[hsl(var(--beta-error))]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

BetaInput.displayName = "BetaInput";

export { BetaInput };
