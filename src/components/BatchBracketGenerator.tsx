import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure } from "@/utils/bracketCalculations";
import { Lock, RefreshCw } from "lucide-react";

interface BatchBracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string }[];
  onBracketGenerated: () => void;
}

const BatchBracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BatchBracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const { toast } = useToast();

  // Check if generation is already in progress
  useEffect(() => {
    const checkGenerationStatus = async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('generating_bracket')
        .eq('id', tournamentId)
        .single();
      
      if (data?.generating_bracket) {
        setGenerationInProgress(true);
      }
    };
    checkGenerationStatus();
  }, [tournamentId]);

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
    setProgressText("Acquiring generation lock...");

    try {
      // Step 0: Check for existing matches to determine if force is needed
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);

      const needsForce = existingMatches && existingMatches.length > 0;

      if (needsForce) {
        const confirmed = window.confirm(
          'WARNING: This tournament already has matches!\n\n' +
          'Regenerating will DELETE all existing matches and related data.\n\n' +
          'Are you sure you want to proceed?'
        );
        
        if (!confirmed) {
          toast({ title: "Cancelled", description: "Existing bracket preserved." });
          setGenerating(false);
          return;
        }
      }

      // Step 1: Acquire secure lock via RPC
      setProgressText("Acquiring generation lock...");
      const { data: lockResult, error: lockError } = await supabase.rpc('generate_bracket_secure', {
        p_tournament_id: tournamentId,
        p_force: needsForce
      });

      if (lockError) {
        throw new Error(`Failed to acquire lock: ${lockError.message}`);
      }

      const lockData = lockResult as { success: boolean; code?: string; message?: string } | null;
      
      if (!lockData?.success) {
        if (lockData?.code === 'GENERATION_IN_PROGRESS') {
          setGenerationInProgress(true);
          toast({
            title: "Generation In Progress",
            description: "Another admin is currently generating the bracket. Please wait.",
            variant: "destructive",
          });
        } else if (lockData?.code === 'BRACKET_EXISTS') {
          toast({
            title: "Bracket Exists",
            description: "Use force regeneration to replace the existing bracket.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: lockData?.message || "Failed to start bracket generation",
            variant: "destructive",
          });
        }
        setGenerating(false);
        return;
      }

      setProgress(5);
      setProgressText("Lock acquired. Initializing bracket generation...");

      // Step 2: Capture map pool (10%)
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

      // Step 3: Update tournament with map pool (20%)
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

      // Step 4: Calculate bracket structure (30%)
      setProgressText("Calculating bracket structure...");
      const teamCount = teams.length;
      const bracketStructure = calculateBracketStructure(teamCount);
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      setProgress(30);

      // Step 5: Generate matches in batches (30% to 90%)
      setProgressText("Creating tournament matches...");
      const BATCH_SIZE = 10;
      const allMatches = [];
      
      for (let round = 1; round <= bracketStructure.totalRounds; round++) {
        const matchesInRound = bracketStructure.matchesPerRound[round - 1];
        
        for (let matchInRound = 1; matchInRound <= matchesInRound; matchInRound++) {
          const matchData: Record<string, unknown> = {
            tournament_id: tournamentId,
            round_number: round,
            match_number: matchInRound,
            status: 'pending',
            best_of: 1,
            score_team1: 0,
            score_team2: 0,
          };

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

        const batchProgress = 30 + ((i + batch.length) / allMatches.length) * 60;
        setProgress(Math.round(batchProgress));
        setProgressText(`Creating matches... ${i + batch.length}/${allMatches.length}`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 6: Validate bracket structure (95%)
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
      setProgress(95);

      // Step 7: Release lock with success
      setProgressText("Finalizing bracket generation...");
      await supabase.rpc('complete_bracket_generation', {
        p_tournament_id: tournamentId,
        p_success: true
      });

      setProgress(100);
      setProgressText("Bracket generated successfully!");
      setGenerationInProgress(false);

      toast({
        title: "Success",
        description: `Bracket generated successfully with ${allMatches.length} matches`,
      });
      
      onBracketGenerated();

    } catch (error: unknown) {
      console.error('Error generating bracket:', error);
      
      // Release lock with failure
      await supabase.rpc('complete_bracket_generation', {
        p_tournament_id: tournamentId,
        p_success: false
      });
      
      setGenerationInProgress(false);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to generate bracket";
      toast({
        title: "Error",
        description: errorMessage,
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

  if (generationInProgress && !generating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
          <Lock className="h-4 w-4" />
          <span className="text-sm">Another admin is generating the bracket. Please wait.</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setGenerationInProgress(false);
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {generating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{progressText}</p>
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