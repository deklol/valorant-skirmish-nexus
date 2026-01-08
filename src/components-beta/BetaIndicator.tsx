import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

const BetaIndicator = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full bg-[hsl(var(--beta-surface-3))] px-3 py-1.5 text-xs text-[hsl(var(--beta-text-secondary))] transition-colors hover:bg-[hsl(var(--beta-surface-4))] hover:text-[hsl(var(--beta-text-primary))] border border-[hsl(var(--beta-glass-border))]"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Production
      </Link>
      <div className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--beta-accent-subtle))] px-3 py-1.5 border border-[hsl(var(--beta-accent)/0.3)] beta-animate-glow-pulse">
        <Sparkles className="h-3 w-3 text-[hsl(var(--beta-accent))]" />
        <span className="text-xs font-medium text-[hsl(var(--beta-accent))]">
          BETA PREVIEW
        </span>
      </div>
    </div>
  );
};

export { BetaIndicator };
