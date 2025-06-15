
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@radix-ui/react-tooltip";

type Team = { id: string | null; short: string; name?: string | null };
type Match = {
  id: string;
  round_number: number;
  match_number: number;
  status: string;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
};

interface BracketOverviewProps {
  matches: Match[];
  selectedMatchId?: string | null;
  onSelectMatch?: (id: string) => void;
}

/**
 * VISUAL overview: shows rounds with matches as boxes, team "ids" (shortened), and winners.
 */
function getRounds(matches: Match[]): number[] {
  const set = new Set<number>();
  for (const m of matches) set.add(m.round_number);
  return [...set].sort((a, b) => a - b);
}
function shortId(id?: string | null): string {
  if (!id) return "?";
  return id.slice(0, 5);
}
export default function BracketOverview(props: BracketOverviewProps) {
  const { matches, selectedMatchId, onSelectMatch } = props;
  const rounds = getRounds(matches);
  // Group by round
  const grouped: Record<number, Match[]> = {};
  for (const m of matches) {
    if (!grouped[m.round_number]) grouped[m.round_number] = [];
    grouped[m.round_number].push(m);
  }

  return (
    <div className="overflow-x-auto max-w-full my-4">
      <div className="flex gap-8">
        {rounds.map((r) => (
          <div key={r} className="">
            <div className="font-bold text-xs text-blue-200 mb-1 text-center">Round {r}</div>
            <div className="flex flex-col gap-2">
              {grouped[r].map((match) => (
                <Card
                  key={match.id}
                  className={
                    `px-2 py-1 cursor-pointer border border-slate-700 min-w-[135px] text-xs bg-slate-900 
                    ${match.id === selectedMatchId ? "ring-2 ring-cyan-500" : ""}
                    ${match.status === "completed" ? "opacity-60" : ""}
                    `
                  }
                  onClick={() => onSelectMatch?.(match.id)}
                  title={`Match #${match.match_number}`}
                >
                  <CardContent className="p-2">
                    <div className="flex justify-between gap-2">
                      <strong>#{match.match_number}</strong>
                      <span className="text-slate-400">[{match.status}]</span>
                    </div>
                    <div>
                      <Badge variant="outline" className="mr-1">
                        T1: {shortId(match.team1_id)}
                      </Badge>
                      <Badge variant="outline" className="mr-1">
                        T2: {shortId(match.team2_id)}
                      </Badge>
                    </div>
                    <div>
                      {match.winner_id && (
                        <span className="text-green-400 text-xs">
                          Winner: {shortId(match.winner_id)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
