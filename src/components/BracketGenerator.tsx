import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateBracketStructure } from "@/utils/bracketCalculations";
import { generateBracketForFormat, getFormatDisplayName, BracketType } from "@/utils/formatGenerators";
import BatchBracketGenerator from "./BatchBracketGenerator";
import { AlertTriangle, Trash2, RefreshCw, Lock, Info } from "lucide-react";

interface BracketGeneratorProps {
  tournamentId: string;
  teams: { id: string; name: string; seed?: number }[];
  onBracketGenerated: () => void;
}

const BracketGenerator = ({ tournamentId, teams, onBracketGenerated }: BracketGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [hasExistingBracket, setHasExistingBracket] = useState(false);
  const [existingMatchCount, setExistingMatchCount] = useState(0);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [bracketType, setBracketType] = useState<BracketType>('single_elimination');
  const [matchFormat, setMatchFormat] = useState<string>('BO1');
  const [swissRounds, setSwissRounds] = useState<number | null>(null);
  const { toast } = useToast();

  // Use batch processing only for single elimination with 8+ teams
  const shouldUseBatchMode = teams.length >= 8 && bracketType === 'single_elimination';

  // Check for existing bracket on mount and after operations
  useEffect(() => {
    checkExistingBracket();
    fetchTournamentConfig();
  }, [tournamentId]);

  const fetchTournamentConfig = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('bracket_type, match_format, swiss_rounds')
      .eq('id', tournamentId)
      .maybeSingle();
    
    if (data) {
      setBracketType((data.bracket_type as BracketType) || 'single_elimination');
      setMatchFormat(data.match_format || 'BO1');
      setSwissRounds(data.swiss_rounds);
    }
  };

  const checkExistingBracket = async () => {
    const [matchesResult, tournamentResult] = await Promise.all([
      supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('tournament_id', tournamentId),
      supabase
        .from('tournaments')
        .select('generating_bracket, bracket_generated')
        .eq('id', tournamentId)
        .maybeSingle()
    ]);
    
    if (!matchesResult.error && matchesResult.data) {
      setHasExistingBracket(matchesResult.data.length > 0);
      setExistingMatchCount(matchesResult.data.length);
    }
    
    if (!tournamentResult.error && tournamentResult.data) {
      setGenerationInProgress(tournamentResult.data.generating_bracket || false);
    }
  };

  const forceUnlockGeneration = async () => {
    const confirmed = window.confirm(
      'Force unlock bracket generation?\n\n' +
      'Use this ONLY if generation is stuck (e.g., browser closed mid-generation).\n\n' +
      'This will clear the generation lock so you can generate again.'
    );

    if (!confirmed) return;

    try {
      await supabase.rpc('complete_bracket_generation', {
        p_tournament_id: tournamentId,
        p_success: false,
      });

      toast({
        title: "Generation Unlocked",
        description: "The generation lock was cleared. You can try generating again.",
      });

      await checkExistingBracket();
    } catch (error: any) {
      toast({
        title: "Unlock Failed",
        description: error.message || "Could not clear generation lock",
        variant: "destructive",
      });
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
      // If a generation lock is stuck, clear it first so the UI can recover.
      if (generationInProgress) {
        await supabase.rpc('complete_bracket_generation', {
          p_tournament_id: tournamentId,
          p_success: false,
        });
      }

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
      await checkExistingBracket();
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

    // PRODUCTION HARDENING: Use database-level lock for bracket generation
    setGenerating(true);
    
    try {
      // Step 1: Acquire lock via RPC
      const { data: lockResult, error: lockError } = await supabase.rpc('generate_bracket_secure', {
        p_tournament_id: tournamentId,
        p_force: hasExistingBracket // Force if regenerating
      });

      if (lockError) {
        throw new Error(`Lock acquisition failed: ${lockError.message}`);
      }

      const result = lockResult as { success: boolean; error?: string; code?: string; existing_matches?: number };
      
      if (!result.success) {
        if (result.code === 'GENERATION_IN_PROGRESS') {
          toast({
            title: "Generation Already In Progress",
            description: "Another admin is currently generating the bracket. Please wait.",
            variant: "destructive",
          });
          setGenerating(false);
          return;
        }
        
        if (result.code === 'BRACKET_EXISTS' && !hasExistingBracket) {
          await checkExistingBracket();
          toast({
            title: "Bracket Already Exists",
            description: `Found ${result.existing_matches} existing matches. Confirm to regenerate.`,
            variant: "destructive",
          });
          setGenerating(false);
          return;
        }
        
        throw new Error(result.error || 'Failed to acquire bracket generation lock');
      }

      // Step 2: Capture map pool
      const { data: capturedMapPoolData, error: mapPoolError } = await supabase
        .rpc('capture_active_map_pool');

      if (mapPoolError) {
        console.error('Error capturing active map pool:', mapPoolError);
      }

      if (capturedMapPoolData) {
        const mapPoolArray = Array.isArray(capturedMapPoolData) ? capturedMapPoolData : [capturedMapPoolData];
        await supabase
          .from('tournaments')
          .update({ map_pool: mapPoolArray })
          .eq('id', tournamentId);
      }

      // Step 3: Generate bracket matches using format-aware generator
      const bestOf = matchFormat === 'BO1' ? 1 : matchFormat === 'BO3' ? 3 : matchFormat === 'BO5' ? 5 : 1;
      const generationResult = await generateBracketForFormat(
        tournamentId,
        teams,
        bracketType,
        bestOf,
        swissRounds || undefined
      );

      if (!generationResult.success) {
        throw new Error(generationResult.error || 'Failed to generate bracket');
      }

      // Insert all generated matches
      if (generationResult.matches.length > 0) {
        const { error: insertError } = await supabase
          .from('matches')
          .insert(generationResult.matches);

        if (insertError) {
          throw new Error(`Failed to insert matches: ${insertError.message}`);
        }
      }

      // Step 4: Complete generation (release lock and set bracket_generated)
      await supabase.rpc('complete_bracket_generation', {
        p_tournament_id: tournamentId,
        p_success: true
      });

      toast({
        title: "Success",
        description: `${getFormatDisplayName(bracketType)} bracket generated with ${generationResult.matches.length} matches`,
      });
      
      await checkExistingBracket();
      onBracketGenerated();

    } catch (error: any) {
      console.error('Error generating bracket:', error);
      
      // Release the lock on error
      await supabase.rpc('complete_bracket_generation', {
        p_tournament_id: tournamentId,
        p_success: false
      });
      
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
    <>
      {generationInProgress && (
        <Alert className="mb-4 bg-yellow-900/30 border-yellow-600">
          <Lock className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-400">Generation In Progress</AlertTitle>
          <AlertDescription className="text-yellow-300 space-y-2">
            <div>Another admin is currently generating the bracket. Please wait and refresh.</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => checkExistingBracket()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh status
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={forceUnlockGeneration}
              >
                Force unlock
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {hasExistingBracket && !generationInProgress && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bracket Exists</AlertTitle>
          <AlertDescription>
            This tournament currently has {existingMatchCount} matches. You can regenerate or clear/reset the bracket if needed.
          </AlertDescription>
        </Alert>
      )}
    </>
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
        disabled={generating || generationInProgress}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {generationInProgress ? (
          <Lock className="h-4 w-4 mr-2" />
        ) : (
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
        )}
        {generationInProgress 
          ? "Generation In Progress..." 
          : generating 
            ? "Generating..." 
            : hasExistingBracket 
              ? "Regenerate Bracket" 
              : "Generate Bracket"}
      </Button>
    </div>
  );
};

export default BracketGenerator;
