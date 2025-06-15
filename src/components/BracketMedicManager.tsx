import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Wrench, ShieldAlert, AlertCircle, ArrowRightLeft, RefreshCw, Hammer, Redo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BracketOverview from "./BracketOverview";
import { analyzeBracketState } from "@/utils/analyzeBracketState";
import BracketMedicTournamentList from "./BracketMedicTournamentList";

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

  // --- Utility: Get selected match object ---
  const selectedMatch = selectedMatchId
    ? matches.find(m => m.id === selectedMatchId) || null
    : null;

  // --- Action: Fix Team Progression ---
  const handleFixProgression = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      // 1. For each completed match, propagate the winner to the correct next match
      const completedMatches = matches.filter(m => m.status === "completed" && m.winner_id);
      for (const match of completedMatches) {
        const nextRound = match.round_number + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        // Find next match
        const next = matches.find(m =>
          m.round_number === nextRound && m.match_number === nextMatchNumber
        );
        if (next && next.status !== "completed") {
          // Assign the winner to the correct side
          const isOdd = match.match_number % 2 === 1;
          const updateField = isOdd ? "team1_id" : "team2_id";
          await supabase
            .from("matches")
            .update({ [updateField]: match.winner_id })
            .eq("id", next.id);
        }
      }
      await loadBracket(selectedTournament.id);
      toast({
        title: "Team Progression Fixed",
        description: "Winners have been re-propagated to future rounds.",
      });
    } catch (err: any) {
      toast({
        title: "Progression Repair Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Action: Reset Match ---
  const handleResetMatch = async () => {
    if (!selectedMatch) return;
    if (selectedMatch.status === "completed") {
      toast({
        title: "Can't reset completed match",
        description: "Completed matches cannot be reset for safety.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("matches")
        .update({
          team1_id: null,
          team2_id: null,
          score_team1: 0,
          score_team2: 0,
          winner_id: null,
        })
        .eq("id", selectedMatch.id);
      await loadBracket(selectedTournament!.id);
      toast({
        title: "Match Reset",
        description: "Match teams, scores and winner have been cleared.",
      });
    } catch (err: any) {
      toast({
        title: "Reset Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Action: Swap Teams ---
  const handleSwapTeams = async () => {
    if (!selectedMatch) return;
    if (selectedMatch.status === "completed") {
      toast({
        title: "Can't swap on completed match",
        description: "Completed matches cannot be altered.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("matches")
        .update({
          team1_id: selectedMatch.team2_id,
          team2_id: selectedMatch.team1_id,
        })
        .eq("id", selectedMatch.id);
      await loadBracket(selectedTournament!.id);
      toast({
        title: "Teams Swapped",
        description: "Team 1 and Team 2 have been switched.",
      });
    } catch (err: any) {
      toast({
        title: "Swap Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Action: Rebuild Bracket ---
  const handleRebuildBracket = async () => {
    if (!selectedTournament) return;
    if (!window.confirm("Rebuild the bracket from all non-eliminated teams? This will reset all pending/live matches.")) return;

    setLoading(true);
    try {
      // 1. Get current, non-eliminated teams
      const { data: teamsRaw, error: teamErr } = await supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", selectedTournament.id)
        .neq("status", "eliminated")
        .neq("status", "winner");

      if (teamErr) throw teamErr;
      const teams = teamsRaw?.map(t => t.id);
      if (!teams || teams.length < 2) throw new Error("Not enough active teams to build bracket.");

      // 2. Reset all matches (other than completed)
      const resetMatches = matches.filter(m => m.status !== "completed");
      for (const m of resetMatches) {
        await supabase
          .from("matches")
          .update({
            team1_id: null,
            team2_id: null,
            winner_id: null,
            score_team1: 0,
            score_team2: 0,
            status: "pending"
          })
          .eq("id", m.id);
      }
      // 3. Assign teams randomly into round 1 matches
      const shuffledTeams = teams.slice().sort(() => Math.random() - 0.5);
      let assigned = 0;
      const round1Matches = matches.filter(m => m.round_number === 1);
      for (const match of round1Matches) {
        const t1 = shuffledTeams[assigned++];
        const t2 = shuffledTeams[assigned++];
        await supabase
          .from("matches")
          .update({
            team1_id: t1 || null,
            team2_id: t2 || null,
          })
          .eq("id", match.id);
      }
      await loadBracket(selectedTournament.id);
      toast({
        title: "Bracket Rebuilt",
        description: "Bracket has been rebuilt from current active teams. Please verify assignments.",
      });
    } catch (err: any) {
      toast({
        title: "Rebuild Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        {/* Tournament selection UI */}
        {!selectedTournament && (
          <div>
            <BracketMedicTournamentList
              tournaments={tournaments}
              loading={loading}
              onSelect={handleSelectTournament}
            />
            <div className="text-slate-300 text-center py-8">
              Select a tournament to use Bracket Medic.
            </div>
          </div>
        )}

        {/* (Unchanged) Bracket analysis, tools, and actions */}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-600/40 text-cyan-300"
                    disabled={loading}
                    onClick={handleFixProgression}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Fix Team Progression
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Re-apply correct winners to next rounds (fixes broken progression)
                </TooltipContent>
              </Tooltip>
              {/* Reset match */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-600/40 text-amber-400"
                    disabled={loading || !selectedMatchId}
                    onClick={handleResetMatch}
                  >
                    <Redo2 className="w-4 h-4 mr-1" />
                    Reset Match
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Clears teams & winner from selected match (not allowed on completed)
                </TooltipContent>
              </Tooltip>
              {/* Team Swap */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-600/40 text-blue-400"
                    disabled={loading || !selectedMatchId}
                    onClick={handleSwapTeams}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" />
                    Swap Teams
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Swap teams in selected match (only pending/live match)
                </TooltipContent>
              </Tooltip>
              {/* Rebuild Bracket */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-600/40 text-red-400"
                    disabled={loading}
                    onClick={handleRebuildBracket}
                  >
                    <Hammer className="w-4 h-4 mr-1" />
                    Rebuild Bracket
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Regenerates bracket from remaining teams (resets all pending/live matches)
                </TooltipContent>
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

// Note: This file is getting long. You should consider refactoring it into smaller, focused files after your next round of edits.
