
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BracketOverview from "./BracketOverview";
import BracketMedicTournamentList from "./BracketMedicTournamentList";
import BracketHealthAnalyzer from "./bracket-medic/BracketHealthAnalyzer";
import BracketMedicActions from "./bracket-medic/BracketMedicActions";

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
        .select("id, round_number, match_number, status, team1_id, team2_id, winner_id, score_team1, score_team2")
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

  // Fix Team Progression using database-level logic
  const handleFixProgression = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    
    try {
      console.log('🔧 Using database-level bracket medic to fix progression');
      
      // Get all completed matches that need progression
      const { data: completedMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .eq('status', 'completed')
        .not('winner_id', 'is', null);

      let fixesApplied = 0;
      const errors: string[] = [];

      for (const match of completedMatches || []) {
        try {
          const loserId = match.team1_id === match.winner_id ? match.team2_id : match.team1_id;
          
          const { data: result, error } = await supabase.rpc('advance_match_winner_secure', {
            p_match_id: match.id,
            p_winner_id: match.winner_id,
            p_loser_id: loserId,
            p_tournament_id: selectedTournament.id,
            p_score_team1: match.score_team1,
            p_score_team2: match.score_team2
          });

          if (error) {
            errors.push(`Match R${match.round_number}M${match.match_number}: ${error.message}`);
          } else if ((result as { success: boolean }).success) {
            fixesApplied++;
          }
        } catch (err: any) {
          errors.push(`Match R${match.round_number}M${match.match_number}: ${err.message}`);
        }
      }

      await loadBracket(selectedTournament.id);
      
      if (errors.length === 0) {
        toast({
          title: "Bracket Progression Fixed",
          description: `Applied ${fixesApplied} fixes using database-level progression.`,
        });
      } else {
        toast({
          title: "Progression Fix Issues",
          description: errors.slice(0, 2).join("; ") + (errors.length > 2 ? "..." : ""),
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

  // Diagnose Progression using database-level queries
  const handleDiagnoseBracketProgression = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    
    try {
      console.log('🔍 Using database queries for bracket diagnosis');
      
      // Check for matches that should be live but aren't
      const { data: pendingMatches } = await supabase
        .from('matches')
        .select('id, round_number, match_number, team1_id, team2_id, status')
        .eq('tournament_id', selectedTournament.id)
        .eq('status', 'pending')
        .not('team1_id', 'is', null)
        .not('team2_id', 'is', null);

      // Check for completed matches without progression
      const { data: completedMatches } = await supabase
        .from('matches')
        .select('id, round_number, match_number, winner_id')
        .eq('tournament_id', selectedTournament.id)
        .eq('status', 'completed')
        .not('winner_id', 'is', null);

      const issues: string[] = [];
      
      if (pendingMatches && pendingMatches.length > 0) {
        issues.push(`${pendingMatches.length} matches have both teams but status is still 'pending'`);
      }

      // Check if winners have been properly advanced
      for (const match of completedMatches || []) {
        const nextRound = match.round_number + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        
        const { data: nextMatch } = await supabase
          .from('matches')
          .select('team1_id, team2_id')
          .eq('tournament_id', selectedTournament.id)
          .eq('round_number', nextRound)
          .eq('match_number', nextMatchNumber)
          .maybeSingle();

        if (nextMatch && !nextMatch.team1_id && !nextMatch.team2_id) {
          issues.push(`R${match.round_number}M${match.match_number} winner not advanced`);
        }
      }

      if (issues.length === 0) {
        toast({
          title: "Bracket Progression Healthy",
          description: `No progression issues detected in ${matches.length} matches.`,
        });
      } else {
        toast({
          title: `${issues.length} Progression Issues Found`,
          description: issues.slice(0, 2).join("; ") + (issues.length > 2 ? "..." : ""),
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
