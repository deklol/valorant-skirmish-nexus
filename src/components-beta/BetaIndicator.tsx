import { Sparkles } from "lucide-react";

const BetaIndicator = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))] text-xs font-semibold uppercase tracking-wide shadow-lg beta-animate-glow-pulse">
        <Sparkles className="h-3 w-3" />
        <span>Beta</span>
      </div>
    </div>
  );
};

export { BetaIndicator };
