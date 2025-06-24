
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure } from "@/utils/bracketCalculations";

interface BatchBracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string }[];
  onBracketGenerated: () => void;
}

const BatchBracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BatchBracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const { toast } = useToast();

  const generateBracketInBatches = async () => {
    if (teams.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 teams are required to generate a bracket",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setProgressText("Initializing bracket generation...");

    try {
      // Step 1: Capture map pool (10%)
      setProgressText("Capturing active map pool...");
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
      setProgress(10);

      // Step 2: Update tournament with map pool (20%)
      setProgressText("Updating tournament settings...");
      if (activeMapPoolData) {
        const mapPoolArray = Array.isArray(activeMapPoolData) ? activeMapPoolData : [activeMapPoolData];
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ map_pool: mapPoolArray })
          .eq('id', tournamentId);

        if (updateError) {
          console.error('Error updating tournament map pool:', updateError);
        }
      }
      setProgress(20);

      // Step 3: Calculate bracket structure (30%)
      setProgressText("Calculating bracket structure...");
      const teamCount = teams.length;
      const bracketStructure = calculateBracketStructure(teamCount);
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      setProgress(30);

      // Step 4: Generate matches in batches (30% to 90%)
      setProgressText("Creating tournament matches...");
      const BATCH_SIZE = 10; // Process 10 matches at a time
      const allMatches = [];
      
      // Generate match data first
      for (let round = 1; round <= bracketStructure.totalRounds; round++) {
        const matchesInRound = bracketStructure.matchesPerRound[round - 1];
        
        for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
          const matchData: any = {
            tournament_id: tournamentId,
            round_number: round,
            match_number: matchInRound,
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
          }

          allMatches.push(matchData);
        }
      }

      // Insert matches in batches
      for (let i = 0; i < allMatches.length; i += BATCH_SIZE) {
        const batch = allMatches.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('matches')
          .insert(batch);

        if (error) {
          throw new Error(`Failed to create batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        }

        // Update progress (30% to 90% based on batch completion)
        const batchProgress = 30 + ((i + batch.length) / allMatches.length) * 60;
        setProgress(Math.round(batchProgress));
        setProgressText(`Creating matches... ${i + batch.length}/${allMatches.length}`);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 5: Validate bracket structure (100%)
      setProgressText("Validating bracket structure...");
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
      }

      setProgress(100);
      setProgressText("Bracket generated successfully!");

      toast({
        title: "Success",
        description: `Bracket generated successfully with ${allMatches.length} matches`,
      });
      
      onBracketGenerated();

    } catch (error: any) {
      console.error('Error generating bracket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bracket",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setProgress(0);
        setProgressText("");
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      {generating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600 text-center">{progressText}</p>
        </div>
      )}
      
      <Button
        onClick={generateBracketInBatches}
        disabled={generating}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
      >
        {generating ? `Generating... ${progress}%` : "Generate Bracket (Batch Mode)"}
      </Button>
    </div>
  );
};

export default BatchBracketGenerator;
