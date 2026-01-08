import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure } from "@/utils/bracketCalculations";
import BatchBracketGenerator from "./BatchBracketGenerator";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";

interface BracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string }[];
  onBracketGenerated: () => void;
}

const BracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [hasExistingBracket, setHasExistingBracket] = useState(false);
  const [existingMatchCount, setExistingMatchCount] = useState(0);
  const { toast } = useToast();

  // Use batch processing for tournaments with 8+ teams (32+ players typically)
  const shouldUseBatchMode = teams.length >= 8;

  // Check for existing bracket on mount and after operations
  useEffect(() => {
    checkExistingBracket();
  }, [tournamentId]);

  const checkExistingBracket = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('id', { count: 'exact' })
      .eq('tournament_id', tournamentId);
    
    if (!error && data) {
      setHasExistingBracket(data.length > 0);
      setExistingMatchCount(data.length);
    }
  };

  const clearBracket = async () => {
    const confirmed = window.confirm(
      '⚠️ DANGER: Clear Entire Bracket?\n\n' +
      `This will permanently delete all ${existingMatchCount} matches, scores, and bracket data.\n\n` +
      'This action cannot be undone. Are you sure?'
    );
    
    if (!confirmed) return;

    setClearing(true);
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      toast({
        title: "Bracket Cleared",
        description: "All matches have been deleted. You can now generate a new bracket.",
      });
      
      setHasExistingBracket(false);
      setExistingMatchCount(0);
      onBracketGenerated(); // Refresh parent
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear bracket",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const generateBracket = async () => {
    if (teams.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 teams are required to generate a bracket",
        variant: "destructive",
      });
      return;
    }

    // PHASE 3: Pre-generation validation - Check for existing matches
    const { data: existingMatches, error: checkError } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing matches:', checkError);
    }

    if (existingMatches && existingMatches.length > 0) {
      const confirmed = window.confirm(
        '⚠️ WARNING: This tournament already has matches!\n\n' +
        'Regenerating will DELETE all existing matches, scores, and bracket data.\n\n' +
        'Are you absolutely sure you want to proceed?'
      );
      
      if (!confirmed) {
        toast({
          title: "Bracket Generation Cancelled",
          description: "Existing bracket preserved.",
        });
        return;
      }

      // Delete existing matches if user confirmed
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (deleteError) {
        toast({
          title: "Error",
          description: "Failed to clear existing matches. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setGenerating(true);
    try {
      // First, capture current active map pool for this tournament
      const { data: capturedMapPoolData, error: mapPoolError } = await supabase
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
      if (capturedMapPoolData) {
        const mapPoolArray = Array.isArray(capturedMapPoolData) ? capturedMapPoolData : [capturedMapPoolData];
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
      const mapCount = Array.isArray(capturedMapPoolData) ? capturedMapPoolData.length : (capturedMapPoolData ? 1 : 0);
      // Map pool captured successfully

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
    // Generating bracket for teams
    
    // Use the same bracket structure calculation as the progression logic
    const bracketStructure = calculateBracketStructure(teamCount);
    // Calculated bracket structure
    
    // Shuffle teams for random seeding
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // CRITICAL FIX: Generate matches using the correct structure
    const allMatches = [];
    
    // Generate matches for each round with proper sequential numbering
    for (let round = 1; round <= bracketStructure.totalRounds; round++) {
      const matchesInRound = bracketStructure.matchesPerRound[round - 1];
      // Creating matches for this round
      
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
          
          // Teams assigned to match
        } else {
          // Awaiting winners from previous round
        }

        allMatches.push(matchData);
      }
    }
    
    // Insert all matches in a single transaction
    // Inserting matches into database
    const { error } = await supabase
      .from('matches')
      .insert(allMatches);

    if (error) {
      throw new Error(`Failed to create matches: ${error.message}`);
    }
    
    // Validate the created bracket structure
    // Validating created bracket
    const { data: createdMatches, error: fetchError } = await supabase
      .from('matches')
      .select('round_number, match_number')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });
    
    if (fetchError) {
      console.error('Failed to validate bracket:', fetchError);
    } else {
      // Matches created successfully
      
      // Verify bracket structure matches expectations
      const expectedStructure = bracketStructure.matchesPerRound.map((count, index) => 
        Array.from({ length: count }, (_, i) => `R${index + 1}M${i + 1}`)
      ).flat();
      
      const actualStructure = createdMatches?.map(m => `R${m.round_number}M${m.match_number}`) || [];
      
      // Bracket structure validation check
      
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
      
      // Bracket validation successful
    }
  };

  // Existing bracket warning component
  const ExistingBracketWarning = () => (
    hasExistingBracket ? (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Bracket Already Exists</AlertTitle>
        <AlertDescription>
          This tournament has {existingMatchCount} existing matches. 
          Regenerating will delete all current bracket data including scores.
        </AlertDescription>
      </Alert>
    ) : null
  );

  // Show batch generator for large tournaments, regular generator for small ones
  if (shouldUseBatchMode) {
    return (
      <div className="space-y-4">
        <ExistingBracketWarning />
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold text-blue-400">Large Tournament Detected</h3>
          <p className="text-sm text-blue-300/80 mt-1">
            Using batch processing for optimal performance with {teams.length} teams.
          </p>
        </div>
        {hasExistingBracket && (
          <Button
            onClick={clearBracket}
            disabled={clearing}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {clearing ? "Clearing..." : `Clear Existing Bracket (${existingMatchCount} matches)`}
          </Button>
        )}
        <BatchBracketGenerator 
          tournamentId={tournamentId} 
          teams={teams} 
          onBracketGenerated={() => {
            checkExistingBracket();
            onBracketGenerated();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ExistingBracketWarning />
      {hasExistingBracket && (
        <Button
          onClick={clearBracket}
          disabled={clearing}
          variant="destructive"
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {clearing ? "Clearing..." : `Clear Existing Bracket (${existingMatchCount} matches)`}
        </Button>
      )}
      <Button
        onClick={generateBracket}
        disabled={generating}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
        {generating ? "Generating..." : hasExistingBracket ? "Regenerate Bracket" : "Generate Bracket"}
      </Button>
    </div>
  );
};

export default BracketGenerator;
