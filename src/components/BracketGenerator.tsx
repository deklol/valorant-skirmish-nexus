
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string }[];
  onBracketGenerated: () => void;
}

const BracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateBracket = async () => {
    if (teams.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 teams are required to generate a bracket",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // First, capture current active map pool for this tournament
      const { data: activeMapPoolData, error: mapPoolError } = await supabase
        .rpc('capture_active_map_pool');

      if (mapPoolError) {
        console.error('Error capturing active map pool:', mapPoolError);
        toast({
          title: "Warning",
          description: "Could not capture current map pool. Tournament will use global settings.",
          variant: "destructive",
        });
      }

      // Update tournament with map pool before generating bracket
      if (activeMapPoolData) {
        const mapPoolArray = Array.isArray(activeMapPoolData) ? activeMapPoolData : [activeMapPoolData];
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ map_pool: mapPoolArray })
          .eq('id', tournamentId);

        if (updateError) {
          console.error('Error updating tournament map pool:', updateError);
          toast({
            title: "Warning", 
            description: "Tournament map pool could not be set. Continuing with bracket generation.",
            variant: "destructive",
          });
        }
      }

      // Generate bracket using direct database operations
      await generateSingleEliminationBracket(tournamentId, teams);

      toast({
        title: "Success",
        description: "Bracket generated successfully",
      });
      onBracketGenerated();
      
      // Add logging for map pool capture
      const mapCount = Array.isArray(activeMapPoolData) ? activeMapPoolData.length : (activeMapPoolData ? 1 : 0);
      console.log(`[BracketGenerator] Captured ${mapCount} maps for tournament ${tournamentId}`);

    } catch (error: any) {
      console.error('Error generating bracket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bracket",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Direct database bracket generation logic (restored from original implementation)
  const generateSingleEliminationBracket = async (tournamentId: string, teams: { id: string; name: string }[]) => {
    // Calculate number of rounds needed
    const teamCount = teams.length;
    const rounds = Math.ceil(Math.log2(teamCount));
    
    // Shuffle teams for random seeding
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // Generate matches for all rounds
    let matchNumber = 1;
    
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      
      for (let match = 1; match <= matchesInRound; match++) {
        const matchData: any = {
          tournament_id: tournamentId,
          round_number: round,
          match_number: matchNumber++,
          status: 'pending',
          best_of: 1,
          score_team1: 0,
          score_team2: 0,
        };

        // Assign teams to first round matches
        if (round === 1) {
          const team1Index = (match - 1) * 2;
          const team2Index = team1Index + 1;
          
          if (team1Index < shuffledTeams.length) {
            matchData.team1_id = shuffledTeams[team1Index].id;
          }
          if (team2Index < shuffledTeams.length) {
            matchData.team2_id = shuffledTeams[team2Index].id;
          }
        }

        // Insert match into database
        const { error } = await supabase
          .from('matches')
          .insert(matchData);

        if (error) {
          throw new Error(`Failed to create match: ${error.message}`);
        }
      }
    }
  };

  return (
    <Button
      onClick={generateBracket}
      disabled={generating}
      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      {generating ? "Generating..." : "Generate Bracket"}
    </Button>
  );
};

export default BracketGenerator;
