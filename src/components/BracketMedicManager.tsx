
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@radix-ui/react-tooltip";
import { Wrench, ShieldAlert, AlertCircle, ArrowRightLeft, RefreshCw, Hammer, Redo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BracketOverview from "./BracketOverview";
import { analyzeBracketState } from "@/utils/analyzeBracketState";

// Minimal team & match info
type TournamentInfo = { id: string; name: string };
type MatchInfo = {
  id: string;
  round_number: number;
  match_number: number;
  status: "pending" | "live" | "completed";
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
};

export default function BracketMedicManager() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [eliminatedTeamIds, setEliminatedTeamIds] = useState<string[]>([]);

  // --- Load tournaments ---
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(70);
      setTournaments(data ?? []);
    };
    fetchTournaments();
  }, []);

  // --- Load matches + eliminated teams for bracket analysis ---
  const loadBracket = useCallback(async (tournamentId: string) => {
    setLoading(true);
    const { data: matchesRaw } = await supabase
      .from("matches")
      .select("id, round_number, match_number, status, team1_id, team2_id, winner_id, score_team1, score_team2")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });
    setMatches(matchesRaw ?? []);
    // Teams marked eliminated
    const { data: eliminatedTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("status", "eliminated");
    setEliminatedTeamIds(eliminatedTeams?.map(t => t.id) ?? []);
    setLoading(false);
  }, []);

  // Tournament selection
  const handleSelectTournament = (id: string) => {
    const t = tournaments.find(t => t.id === id) || null;
    setSelectedTournament(t);
    setSelectedMatchId(null);
    if (t) loadBracket(t.id);
    else setMatches([]);
  };

  // Bracket Analysis
  const { healthy, issues } = analyzeBracketState(matches, eliminatedTeamIds);

  // UI Rendering
  return (
    <Card className="bg-slate-800 border-slate-700 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ShieldAlert className="w-5 h-5 text-cyan-300" />
          Bracket Medic <span className="text-xs text-cyan-200">(Bracket Health & Repair)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2 items-center">
          <Input
            className="w-64"
            type="text"
            placeholder="Search tournament by name"
            disabled={loading}
            onChange={e => {
              const query = e.target.value.trim().toLowerCase();
              setTournaments(prev =>
                prev.slice().sort((a, b) => {
                  if (!query) return 0;
                  const aMatch = a.name?.toLowerCase().includes(query) ? -1 : 0;
                  const bMatch = b.name?.toLowerCase().includes(query) ? -1 : 0;
                  return aMatch - bMatch;
                })
              );
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedTournament && loadBracket(selectedTournament.id)}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh Bracket
          </Button>
        </div>
        {/* Tournament selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tournaments.map(t =>
            <Button
              key={t.id}
              size="sm"
              className={selectedTournament?.id === t.id ? "bg-cyan-600 text-white" : ""}
              variant={selectedTournament?.id === t.id ? "default" : "outline"}
              onClick={() => handleSelectTournament(t.id)}
            >
              {t.name}
            </Button>
          )}
        </div>

        {!selectedTournament && (
          <div className="text-slate-300 text-center py-8">Select a tournament to use Bracket Medic.</div>
        )}

        {selectedTournament && (
          <>
            {/* Bracket Health Status */}
            <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
              <div>
                {healthy
                  ? <Badge className="bg-green-700 text-white">Bracket Healthy</Badge>
                  : <Badge className="bg-red-700 text-white"><AlertCircle className="inline w-3 h-3 mr-1"/> Issues</Badge>
                }
                <span className="text-slate-400 text-sm ml-2">
                  {healthy ? "No bracket problems detected." :
                    <>
                      <span className="font-bold">{issues.length}</span> bracket issues found.
                    </>
                  }
                </span>
                {issues.length > 0 && (
                  <ul className="text-xs mt-1 ml-1 text-red-300 list-disc">
                    {issues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                )}
              </div>
              {healthy && (
                <div className="text-xs text-slate-400 ml-4">
                  No action needed – bracket flow is consistent and ready.
                </div>
              )}
            </div>

            {/* VISUAL BRACKET */}
            <BracketOverview
              matches={matches}
              selectedMatchId={selectedMatchId}
              onSelectMatch={setSelectedMatchId}
            />

            {/* BRACKET ACTIONS */}
            <div className="flex flex-wrap gap-4 my-6">
              {/* Fix progression */}
              <Tooltip content="Re-apply correct winners to next rounds (fixes any broken progression)">
                <Button variant="outline" size="sm" className="border-cyan-600/40 text-cyan-300">
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Fix Team Progression
                </Button>
              </Tooltip>
              {/* Reset match */}
              <Tooltip content="Clear team assignments from selected match only (does not alter completed matches)">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-600/40 text-amber-400"
                  disabled={!selectedMatchId}
                  // onClick={handleResetMatch}
                >
                  <Redo2 className="w-4 h-4 mr-1" />
                  Reset Match
                </Button>
              </Tooltip>
              {/* Team Swap */}
              <Tooltip content="Swap teams in selected match (safe, only allowed if match not completed)">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-600/40 text-blue-400"
                  disabled={!selectedMatchId}
                  // onClick={handleSwapTeams}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Swap Teams
                </Button>
              </Tooltip>
              {/* Rebuild Bracket */}
              <Tooltip content="Regenerate the bracket from the current pool of teams (advanced)">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-600/40 text-red-400"
                  // onClick={handleRebuildBracket}
                >
                  <Hammer className="w-4 h-4 mr-1" />
                  Rebuild Bracket
                </Button>
              </Tooltip>
            </div>
            <div className="text-xs text-slate-500 mt-4">
              <p>Use Bracket Medic to fix any broken progression, safely reset matches, or rebuild the bracket if needed. Actions only update matches that are not completed.<br/>
                <span className="font-bold">Pro tip:</span> click any match in the bracket view to select it.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
