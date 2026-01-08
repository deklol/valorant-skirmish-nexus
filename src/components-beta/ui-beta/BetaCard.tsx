import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

interface BetaCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
}

const BetaCard = forwardRef<HTMLDivElement, BetaCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--beta-radius-lg)] p-[var(--beta-space-4)]",
          "transition-all duration-[var(--beta-transition-base)]",
          {
            "bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-glass-border))]":
              variant === "default",
            "bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-glass-border))] shadow-[var(--beta-shadow-md)]":
              variant === "elevated",
            "bg-transparent border border-[hsl(var(--beta-surface-4))]":
              variant === "outlined",
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BetaCard.displayName = "BetaCard";

const BetaCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-[var(--beta-space-4)]", className)}
      {...props}
    />
  )
);
BetaCardHeader.displayName = "BetaCardHeader";

const BetaCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold text-[hsl(var(--beta-text-primary))]",
        className
      )}
      {...props}
    />
  )
);
BetaCardTitle.displayName = "BetaCardTitle";

const BetaCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-[hsl(var(--beta-text-muted))]", className)}
      {...props}
    />
  )
);
BetaCardDescription.displayName = "BetaCardDescription";

const BetaCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
BetaCardContent.displayName = "BetaCardContent";

const BetaCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-[var(--beta-space-4)]", className)}
      {...props}
    />
  )
);
BetaCardFooter.displayName = "BetaCardFooter";

export {
  BetaCard,
  BetaCardHeader,
  BetaCardTitle,
  BetaCardDescription,
  BetaCardContent,
  BetaCardFooter,
};
