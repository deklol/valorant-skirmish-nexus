
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BracketOverview from "./BracketOverview";
import BracketMedicTournamentList from "./BracketMedicTournamentList";
import BracketHealthAnalyzer from "./bracket-medic/BracketHealthAnalyzer";
import BracketMedicActions from "./bracket-medic/BracketMedicActions";
import EnhancedBracketControlSystem from "./medic-enhanced/EnhancedBracketControlSystem";

import { getOriginalTeamCount } from "@/utils/bracketCalculations";

// Minimal types for component use
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
  scheduled_time: string | null;
  notes: string | null;
};
type TeamInfo = {
  id: string;
  name: string;
  status: string;
};

export default function BracketMedicManager() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [eliminatedTeamIds, setEliminatedTeamIds] = useState<string[]>([]);
  const [originalTeamCount, setOriginalTeamCount] = useState(0);

  // Load tournaments
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

// Load bracket data
  const loadBracket = useCallback(async (tournamentId: string) => {
    setLoading(true);
    
    const [matchesResult, teamsResult, eliminatedResult] = await Promise.all([
      supabase
        .from("matches")
        .select("id, round_number, match_number, status, team1_id, team2_id, winner_id, score_team1, score_team2, scheduled_time, notes")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true }),
      supabase
        .from("teams")
        .select("id, name, status")
        .eq("tournament_id", tournamentId)
        .order("name", { ascending: true }),
      supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("status", "eliminated")
    ]);

    setMatches(matchesResult.data ?? []);
    setTeams(teamsResult.data ?? []);
    setEliminatedTeamIds(eliminatedResult.data?.map(t => t.id) ?? []);

    // CRITICAL FIX: Get original team count for proper bracket validation
    const originalCount = await getOriginalTeamCount(tournamentId);
    setOriginalTeamCount(originalCount);
    console.log(`🔍 Loaded bracket data for tournament ${tournamentId}: ${originalCount} original teams`);

    setLoading(false);
  }, []);

  // Tournament selection
  const handleSelectTournament = (id: string) => {
    const t = tournaments.find(t => t.id === id) || null;
    setSelectedTournament(t);
    setSelectedMatchId(null);
    if (t) {
      loadBracket(t.id);
    } else {
      setMatches([]);
      setTeams([]);
      setOriginalTeamCount(0);
    }
  };

  // Fix Team Progression using new database-level function
  const handleFixProgression = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    
    try {
      console.log('🔧 Using new database-level fix_all_bracket_progression function');
      
      const { data: result, error } = await supabase.rpc('fix_all_bracket_progression', {
        p_tournament_id: selectedTournament.id
      });

      if (error) {
        throw error;
      }

      await loadBracket(selectedTournament.id);
      
      const parsedResult = result as any;
      if (parsedResult.success) {
        toast({
          title: "Bracket Progression Fixed",
          description: `Applied ${parsedResult.fixes_applied} fixes, set ${parsedResult.matches_set_to_live} matches to live.`,
        });
      } else {
        toast({
          title: "Progression Fix Error",
          description: parsedResult.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Progression Fix Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Diagnose Progression using new database-level function
  const handleDiagnoseBracketProgression = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    
    try {
      console.log('🔍 Using new database-level diagnose_bracket_progression function');
      
      const { data: result, error } = await supabase.rpc('diagnose_bracket_progression', {
        p_tournament_id: selectedTournament.id
      });

      if (error) {
        throw error;
      }

      const parsedResult = result as any;
      if (parsedResult.success) {
        const issues = parsedResult.issues || [];
        
        if (issues.length === 0) {
          toast({
            title: "Bracket Progression Healthy",
            description: `No progression issues detected. Tournament has ${parsedResult.original_team_count} teams, ${parsedResult.total_matches} matches.`,
          });
        } else {
          toast({
            title: `${issues.length} Progression Issues Found`,
            description: issues.slice(0, 2).join("; ") + (issues.length > 2 ? "..." : ""),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Diagnosis Error",
          description: parsedResult.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error('Progression diagnosis error:', err);
      toast({
        title: "Diagnosis Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Action: Reset Match ---
  const handleResetMatch = async () => {
    if (!selectedMatchId) return;
    const selectedMatch = matches.find(m => m.id === selectedMatchId);
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
    if (!selectedMatchId) return;
    const selectedMatch = matches.find(m => m.id === selectedMatchId);
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
      const { data: teamsRaw, error: teamErr } = await supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", selectedTournament.id)
        .not("status", "in", "(eliminated,winner,disqualified,withdrawn,forfeited)");

      if (teamErr) throw teamErr;
      const teams = teamsRaw?.map(t => t.id);
      if (!teams || teams.length < 2) throw new Error("Not enough active teams to build bracket.");

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
          Bracket Medic <span className="text-xs text-cyan-200">(Unified Dynamic Tournament System)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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

        {selectedTournament && (
          <>
            <BracketHealthAnalyzer 
              matches={matches}
              eliminatedTeamIds={eliminatedTeamIds}
              teamCount={originalTeamCount}
            />

            <BracketOverview
              matches={matches}
              selectedMatchId={selectedMatchId}
              onSelectMatch={setSelectedMatchId}
            />

            <BracketMedicActions
              loading={loading}
              selectedMatchId={selectedMatchId}
              onFixProgression={handleFixProgression}
              onDiagnoseProgression={handleDiagnoseBracketProgression}
              onResetMatch={handleResetMatch}
              onSwapTeams={handleSwapTeams}
              onRebuildBracket={handleRebuildBracket}
            />

            <EnhancedBracketControlSystem
              tournamentId={selectedTournament.id}
              matches={matches.map(m => ({
                id: m.id,
                round_number: m.round_number,
                match_number: m.match_number,
                team1_id: m.team1_id || "",
                team2_id: m.team2_id || "",
                status: m.status,
                scheduled_time: m.scheduled_time || "",
                notes: m.notes || ""
              }))}
              teams={teams.map(t => ({ id: t.id, name: t.name, status: t.status }))}
              onUpdate={() => loadBracket(selectedTournament.id)}
            />

            <div className="text-xs text-slate-500 mt-4">
              <p>Unified Bracket System uses original team count ({originalTeamCount} teams) for all calculations and fixes progression issues.<br/>
                <span className="font-bold">Pro tip:</span> click any match in the bracket view to select it for individual match operations.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
