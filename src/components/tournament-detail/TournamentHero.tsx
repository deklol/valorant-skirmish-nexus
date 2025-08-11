import { Sparkles } from "lucide-react";
import LivePageViewCounter from "@/components/LivePageViewCounter";
import { StandardHeading } from "@/components/ui/standard-heading";
import { cn } from "@/lib/utils";
import { getStatusBadge } from "@/hooks/useTournamentUtils";

type TournamentHeroProps = {
  tournament: any;
  stats: {
    players: number;
    teams: number;
    matches: number;
  };
};

export default function TournamentHero({ tournament, stats }: TournamentHeroProps) {
  const heroBackgroundImage = tournament.banner_image_url || undefined;

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-xl border bg-cover mb-4 md:mb-6",
        "border-border"
      )}
      style={{
        backgroundImage: heroBackgroundImage ? `url(${heroBackgroundImage})` : undefined,
        backgroundPosition: "center calc(50% + 15px)",
      }}
      aria-label={`${tournament.name} hero`}
    >
      {/* Angled gradient overlay using semantic tokens */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(60deg, hsl(var(--background)) 40%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 grid gap-6 p-6 md:p-10 md:grid-cols-2 items-center">
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
               role="status"
               aria-label="Powered by ATLAS balancing badge"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Powered by ATLAS balancing</span>
          </div>

          <StandardHeading as="h1" level="h1" className="font-extrabold tracking-tight">
            {tournament.name}
          </StandardHeading>

          {tournament.description && (
            <p className="text-muted-foreground max-w-xl">{tournament.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <LivePageViewCounter tournamentId={tournament.id} />
            {getStatusBadge(tournament.status)}
          </div>
        </div>

        {/* Stats */}
        <div className="relative hidden md:block">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Players" value={stats.players} />
            <StatCard label="Teams" value={stats.teams} />
            <StatCard label="Matches" value={stats.matches} />
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 backdrop-blur-sm p-4 text-center hover-scale"
         aria-label={`${label} statistic`}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
