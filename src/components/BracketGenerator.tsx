
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure } from "@/utils/bracketCalculations";

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

      // Generate bracket using corrected bracket structure logic
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

  // FIXED: Corrected bracket generation logic using proper bracket structure calculations
  const generateSingleEliminationBracket = async (tournamentId: string, teams: { id: string; name: string }[]) => {
    const teamCount = teams.length;
    console.log(`🏗️ Generating bracket for ${teamCount} teams`);
    
    // Use the same bracket structure calculation as the progression logic
    const bracketStructure = calculateBracketStructure(teamCount);
    console.log('🏗️ Bracket structure:', bracketStructure);
    
    // Shuffle teams for random seeding
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // CRITICAL FIX: Generate matches using the correct structure
    const allMatches = [];
    
    // Generate matches for each round with proper sequential numbering
    for (let round = 1; round <= bracketStructure.totalRounds; round++) {
      const matchesInRound = bracketStructure.matchesPerRound[round - 1];
      console.log(`🏗️ Round ${round}: Creating ${matchesInRound} matches`);
      
      for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
        const matchData: any = {
          tournament_id: tournamentId,
          round_number: round,
          match_number: matchInRound, // FIXED: Sequential numbering within each round
          status: 'pending',
          best_of: 1,
          score_team1: 0,
          score_team2: 0,
        };

        // Assign teams to first round matches only
        if (round === 1) {
          const team1Index = (matchInRound - 1) * 2;
          const team2Index = team1Index + 1;
          
          if (team1Index < shuffledTeams.length) {
            matchData.team1_id = shuffledTeams[team1Index].id;
          }
          if (team2Index < shuffledTeams.length) {
            matchData.team2_id = shuffledTeams[team2Index].id;
          }
          
          console.log(`🏗️ R${round}M${matchInRound}: ${shuffledTeams[team1Index]?.name || 'TBD'} vs ${shuffledTeams[team2Index]?.name || 'TBD'}`);
        } else {
          console.log(`🏗️ R${round}M${matchInRound}: Awaiting winners from previous round`);
        }

        allMatches.push(matchData);
      }
    }
    
    // Insert all matches in a single transaction
    console.log(`🏗️ Inserting ${allMatches.length} matches into database`);
    const { error } = await supabase
      .from('matches')
      .insert(allMatches);

    if (error) {
      throw new Error(`Failed to create matches: ${error.message}`);
    }
    
    // Validate the created bracket structure
    console.log('🔍 Validating created bracket...');
    const { data: createdMatches, error: fetchError } = await supabase
      .from('matches')
      .select('round_number, match_number')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (fetchError) {
      console.error('Failed to validate bracket:', fetchError);
    } else {
      console.log('✅ Created matches:', createdMatches?.map(m => `R${m.round_number}M${m.match_number}`));
      
      // Verify bracket structure matches expectations
      const expectedStructure = bracketStructure.matchesPerRound.map((count, index) => 
        Array.from({ length: count }, (_, i) => `R${index + 1}M${i + 1}`)
      ).flat();
      
      const actualStructure = createdMatches?.map(m => `R${m.round_number}M${m.match_number}`) || [];
      
      console.log('🔍 Expected structure:', expectedStructure);
      console.log('🔍 Actual structure:', actualStructure);
      
      const missingMatches = expectedStructure.filter(expected => !actualStructure.includes(expected));
      const extraMatches = actualStructure.filter(actual => !expectedStructure.includes(actual));
      
      if (missingMatches.length > 0) {
        console.error('❌ Missing matches:', missingMatches);
        throw new Error(`Bracket validation failed: Missing matches ${missingMatches.join(', ')}`);
      }
      
      if (extraMatches.length > 0) {
        console.error('❌ Extra matches:', extraMatches);
        throw new Error(`Bracket validation failed: Extra matches ${extraMatches.join(', ')}`);
      }
      
      console.log('✅ Bracket structure validation passed');
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
