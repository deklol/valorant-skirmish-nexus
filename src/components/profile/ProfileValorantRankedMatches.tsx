import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // Assuming you have a class name utility

interface Props {
  userId: string;
  size?: number;
}

interface RankedMatchItem {
  match_id: string;
  map: string;
  mode: string;
  started_at: string;
  rounds_played?: number;
  region: string;
  user: {
    name: string;
    team: string;
    character: string;
    kills: number;
    deaths: number;
    assists: number;
    kda: string;
    headshot_percent?: number;
  } | null;
  result: {
    won: boolean;
    team_score: number;
    enemy_score: number;
  } | null;
}

export default function ProfileValorantRankedMatches({ userId, size = 10 }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["valorant-ranked-matches", userId, size],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("valorant-matches", {
        body: { profile_user_id: userId, size },
      });
      if (error) throw error;
      return data as { puuid: string; region: string; matches: RankedMatchItem[] };
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-slate-700 border-slate-600 h-36">
            <CardHeader>
              <Skeleton className="h-5 w-40 bg-slate-600" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24 bg-slate-600" />
              <Skeleton className="h-4 w-32 bg-slate-600" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-4 text-slate-300">
          Failed to load ranked matches{error ? `: ${(error as any).message}` : ''}
        </CardContent>
      </Card>
    );
  }

  const matches = data.matches || [];

  if (matches.length === 0) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-6 text-slate-300">No recent ranked matches found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matches.map((m) => {
        // --- LOGIC TO CHECK MAP ---
        const isLotus = m.map?.toLowerCase() === 'lotus';

        return (
          // --- CONDITIONAL STYLING APPLIED HERE ---
          <Card
            key={m.match_id}
            className={cn(
              "border-slate-600 hover:border-slate-500 transition-all overflow-hidden relative",
              // If it's Lotus, apply the background image. Otherwise, use the default color.
              isLotus ? "bg-[url('https://i.imgur.com/gMphFlF.png')] bg-cover bg-center" : "bg-slate-700"
            )}
          >
            {/* This overlay ensures text is readable on top of the background image */}
            <div className="bg-black/60 p-4 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-2">
                <CardTitle className="text-white text-base">{m.map} • {m.mode}</CardTitle>
                {m.result && (
                  <Badge className={cn("border-none", m.result.won ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
                    {m.result.won ? "Win" : "Loss"} {m.result.team_score}-{m.result.enemy_score}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0 text-sm text-slate-300">
                <div className="flex justify-between">
                  <div>
                    <div className="text-slate-200">
                      {formatDistanceToNow(new Date(m.started_at || Date.now()), { addSuffix: true })}
                    </div>
                    {typeof m.rounds_played === 'number' && (
                      <div className="text-slate-400">Rounds: {m.rounds_played}</div>
                    )}
                    <div className="text-slate-400">Region: {m.region.toUpperCase()}</div>
                  </div>
                  {m.user && (
                    <div className="text-right">
                      <div className="text-slate-200 font-medium">{m.user.character}</div>
                      <div className="text-slate-200">{m.user.kda}</div>
                      {typeof m.user.headshot_percent === 'number' && (
                        <div className="text-slate-400">HS: {m.user.headshot_percent}%</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
