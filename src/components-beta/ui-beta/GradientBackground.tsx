import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
  showGlow?: boolean;
}

const GradientBackground = ({ children, className, showGlow = true }: GradientBackgroundProps) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-[hsl(var(--beta-surface-1))]",
        "relative overflow-hidden",
        className
      )}
    >
      {/* Ambient glow effects */}
      {showGlow && (
        <>
          <div
            className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, hsl(var(--beta-accent) / 0.3) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="pointer-events-none absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, hsl(var(--beta-secondary) / 0.3) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export { GradientBackground };
