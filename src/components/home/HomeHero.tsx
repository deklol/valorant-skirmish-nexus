import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, PlayCircle, Trophy } from "lucide-react";

const HomeHero = () => {
  const heroBackgroundImage = "https://i.imgur.com/8NnaEWn.png";

  return (
    <header 
      className="relative overflow-hidden rounded-xl border border-slate-700 bg-cover"
      style={{ 
        backgroundImage: `url(${heroBackgroundImage})`,
        backgroundPosition: 'center calc(50% + 15px)' 
      }}
    >
      <div 
        className="absolute inset-0"
        style={{ background: 'linear-gradient(60deg, rgba(15, 23, 42, 1) 40%, rgba(15, 23, 42, 0) 100%)' }}
      />

      <div className="relative z-10 grid gap-6 p-6 md:p-10 md:grid-cols-2 items-center">
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by ATLAS balancing
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Competitive Valorant Tournaments, Balanced by ATLAS
          </h1>
          <p className="text-slate-300 max-w-xl">
            Join TLR Skirmish Hub for competitive Valorant tournaments in 2025. Sign up solo, compete in balanced teams, track live brackets, and connect with our Valorant tournament Discord for scrims and prizes.
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

        <div className="relative hidden md:block">
        </div>
      </div>
    </header>
  );
};

export default HomeHero;
