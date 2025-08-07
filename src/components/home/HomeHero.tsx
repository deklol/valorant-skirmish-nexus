import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, PlayCircle, Trophy } from "lucide-react";

const HomeHero = () => {
  return (
    <header className="relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-indigo-900/40 p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-30">
      </div>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 items-center">
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by ATLAS balancing
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Competitive Valorant Tournaments, Balanced by ATLAS
          </h1>
          <p className="text-slate-300 max-w-xl">
            ATLAS is our bespoke balancing algorithm that aims to weight players fairly using evidence based performance and ranked data.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/tournaments">
              <Button size="lg" className="shadow-md">
                <Trophy className="mr-2 h-4 w-4" /> Explore Tournaments
              </Button>
            </Link>
            <Link to="/vods">
              <Button size="lg" variant="outline" className="border-slate-600">
                <PlayCircle className="mr-2 h-4 w-4" /> Watch Tournament VODs
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xl font-bold text-white">AI</div>
                <div className="text-xs text-slate-400">ATLAS</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xl font-bold text-white">Live</div>
                <div className="text-xs text-slate-400">Matches</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xl font-bold text-white">SOLO</div>
                <div className="text-xs text-slate-400">Sign-ups</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomeHero;
