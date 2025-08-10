import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React from "react";
import { User, Map, Target, Shield } from "lucide-react";

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

// --- DATA LOOKUPS ---
const mapBackgrounds: { [key: string]: string } = {
  abyss: 'https://i.imgur.com/gMphFlF.png',
  ascent: 'https://i.imgur.com/J9hHHl6.png',
  bind: 'https://i.imgur.com/sspiB6N.png',
  breeze: 'https://i.imgur.com/OERebCr.png',
  fracture: 'https://i.imgur.com/N0NvjMP.png',
  haven: 'https://i.imgur.com/aWfxtFb.png',
  icebox: 'https://i.imgur.com/NH9UNsN.png',
  lotus: 'https://i.imgur.com/QXTPxZA.png',
  pearl: 'https://i.imgur.com/KOJYmhY.png',
  split: 'https://i.imgur.com/xsusfXI.png',
  sunset: 'https://i.imgur.com/YLJMLvH.png',
  corrode: 'https://i.imgur.com/OjCy1Cj.png'
};

const agentRoles: { [key: string]: string } = {
  Astra: 'Controller', Breach: 'Initiator', Brimstone: 'Controller', Chamber: 'Sentinel',
  Clove: 'Controller', Cypher: 'Sentinel', Deadlock: 'Sentinel', Fade: 'Initiator',
  Gekko: 'Initiator', Harbor: 'Controller', Iso: 'Duelist', Jett: 'Duelist',
  'KAY/O': 'Initiator', Killjoy: 'Sentinel', Neon: 'Duelist', Omen: 'Controller',
  Phoenix: 'Duelist', Raze: 'Duelist', Reyna: 'Duelist', Sage: 'Sentinel',
  Skye: 'Initiator', Sova: 'Initiator', Tejo: 'Sentinel', Viper: 'Controller',
  Vyse: 'Sentinel', Waylay: 'Duelist', Yoru: 'Duelist'
};

// --- STATS CALCULATION & DISPLAY COMPONENT ---
const StatsSummary = ({ matches }: { matches: RankedMatchItem[] }) => {
    const stats = React.useMemo(() => {
        const competitiveMatches = matches.filter(m => m.mode === 'Competitive' && m.user);
        if (competitiveMatches.length === 0) return null;

        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const agentCount: { [key: string]: number } = {};
        const mapCount: { [key: string]: number } = {};
        const roleCount: { [key: string]: number } = {};

        competitiveMatches.forEach(match => {
            totalKills += match.user!.kills;
            totalDeaths += match.user!.deaths;
            totalAssists += match.user!.assists;
            if (match.result?.won) wins++;
            
            const agent = match.user!.character;
            agentCount[agent] = (agentCount[agent] || 0) + 1;
            
            const role = agentRoles[agent];
            if (role) roleCount[role] = (roleCount[role] || 0) + 1;

            mapCount[match.map] = (mapCount[match.map] || 0) + 1;
        });

        const getMostFrequent = (counts: { [key: string]: number }) => Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'N/A');
        
        const numMatches = competitiveMatches.length;
        return {
            avgKda: `${(totalKills / numMatches).toFixed(1)} / ${(totalDeaths / numMatches).toFixed(1)} / ${(totalAssists / numMatches).toFixed(1)}`,
            mostPlayedAgent: getMostFrequent(agentCount),
            mostPlayedMap: getMostFrequent(mapCount),
            mostPlayedRole: getMostFrequent(roleCount),
            wins,
            losses: numMatches - wins,
            winRate: Math.round((wins / numMatches) * 100),
            totalMatches: numMatches
        };
    }, [matches]);

    if (!stats) return <div className="text-slate-400 text-center p-4">No recent competitive matches to analyze.</div>;

    return (
        <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
                <CardTitle className="text-lg text-white">Last {stats.totalMatches} Ranked Matches Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="bg-slate-700 p-3 rounded-lg flex flex-col justify-center">
                        <div className="text-2xl font-bold text-green-400">{stats.wins}W <span className="text-white">-</span> {stats.losses}L</div>
                        <div className="text-sm text-slate-400">Win Rate: {stats.winRate}%</div>
                    </div>
                     <div className="bg-slate-700 p-3 rounded-lg flex flex-col justify-center">
                        <div className="text-xl font-bold text-white flex items-center justify-center gap-2"><Target size={20}/>{stats.avgKda}</div>
                        <div className="text-sm text-slate-400">Avg KDA</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded-lg flex flex-col justify-center">
                        <div className="text-xl font-bold text-white flex items-center justify-center gap-2"><User size={20}/>{stats.mostPlayedAgent}</div>
                        <div className="text-sm text-slate-400">Most Played Agent</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded-lg flex flex-col justify-center">
                        <div className="text-xl font-bold text-white flex items-center justify-center gap-2"><Shield size={20}/>{stats.mostPlayedRole}</div>
                        <div className="text-sm text-slate-400">Most Played Role</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded-lg flex flex-col justify-center">
                        <div className="text-xl font-bold text-white flex items-center justify-center gap-2"><Map size={20}/>{stats.mostPlayedMap}</div>
                        <div className="text-sm text-slate-400">Most Played Map</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

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
      <div className="space-y-4">
        <Skeleton className="h-44 w-full bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 bg-slate-700" />)}
        </div>
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
    <div className="space-y-6">
      <StatsSummary matches={matches} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((m) => {
          const mapName = m.map?.toLowerCase();
          const bgImage = mapName ? mapBackgrounds[mapName] : undefined;
          return (
            <Card
              key={m.match_id}
              style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
              className={cn("border-slate-600 hover:border-slate-500 transition-all overflow-hidden relative", bgImage ? "bg-cover bg-center" : "bg-slate-700")}
            >
              <div className="bg-black/60 p-4 h-full flex flex-col justify-between">
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
                      <div className="text-slate-200">{formatDistanceToNow(new Date(m.started_at || Date.now()), { addSuffix: true })}</div>
                      {typeof m.rounds_played === 'number' && <div className="text-slate-400">Rounds: {m.rounds_played}</div>}
                      <div className="text-slate-400">Region: {m.region.toUpperCase()}</div>
                    </div>
                    {m.user && (
                      <div className="text-right">
                        <div className="text-slate-200 font-medium">{m.user.character}</div>
                        <div className="text-slate-200">{m.user.kda}</div>
                        {typeof m.user.headshot_percent === 'number' && <div className="text-slate-400">HS: {m.user.headshot_percent}%</div>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
