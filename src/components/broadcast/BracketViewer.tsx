import IntegratedBracketView from "@/components/IntegratedBracketView";
import type { TransitionType } from "@/hooks/useBroadcastScene";

interface BracketViewerProps {
  tournamentId: string;
  transition: TransitionType;
}

export default function BracketViewer({ tournamentId, transition }: BracketViewerProps) {
  const transitionClasses = {
    fade: "animate-fade-in",
    slide: "transform transition-transform duration-500",
    cascade: "animate-fade-in"
  };

  return (
    <div className={`w-full h-full ${transitionClasses[transition]}`}>
      {/* Header */}
      <div className="text-center py-8 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur">
        <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
          Tournament Bracket
        </h1>
        <p className="text-xl text-slate-300">Live Competition Progress</p>
      </div>

      {/* Bracket Content */}
      <div className="flex-1 p-8 overflow-hidden">
        <div className="w-full h-full bg-black/20 backdrop-blur rounded-xl border border-white/10 p-6">
          <IntegratedBracketView tournamentId={tournamentId} />
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2 bg-red-600/90 backdrop-blur rounded-full px-4 py-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-medium">LIVE</span>
        </div>
      </div>
    </div>
  );
}