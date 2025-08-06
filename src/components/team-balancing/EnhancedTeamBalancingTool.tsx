// Enhanced Team Balancing Tool with improved snake draft and transparency
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Shuffle, AlertTriangle, CheckCircle, Eye, Settings, Zap, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { evidenceBasedSnakeDraft, EvidenceTeamResult, EvidenceBalanceStep } from "./EvidenceBasedSnakeDraft";
import DetailedBalanceAnalysis from "./DetailedBalanceAnalysis";
import { AutobalanceProgress } from "./AutobalanceProgress";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateAdaptiveWeight } from "@/utils/adaptiveWeightSystem";

interface EnhancedTeamBalancingToolProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
  tournamentName?: string;
}

const EnhancedTeamBalancingTool = ({ 
  tournamentId, 
  maxTeams, 
  onTeamsBalanced,
  tournamentName 
}: EnhancedTeamBalancingToolProps) => {
  const [loading, setLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState<EvidenceTeamResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'validating' | 'preview' | 'saving' | 'complete'>('idle');
  
  // Progress tracking state
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [lastProgressStep, setLastProgressStep] = useState<EvidenceBalanceStep | undefined>();
  const [totalPlayers, setTotalPlayers] = useState(0);
  
  // Adaptive weights state
  const [enableAdaptiveWeights, setEnableAdaptiveWeights] = useState(false);
  const [loadingAdaptiveSettings, setLoadingAdaptiveSettings] = useState(true);
  
  const { toast } = useToast();
  const { notifyTeamAssigned } = useEnhancedNotifications();

  // Load adaptive weights setting
  useEffect(() => {
    loadAdaptiveWeightsSetting();
  }, [tournamentId]);

  const loadAdaptiveWeightsSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('enable_adaptive_weights')
        .eq('id', tournamentId)
        .single();
      
      if (!error && data) {
        setEnableAdaptiveWeights(data.enable_adaptive_weights || false);
      }
    } catch (e) {
      console.error('Error loading adaptive weights setting:', e);
    } finally {
      setLoadingAdaptiveSettings(false);
    }
  };

  const handleAdaptiveWeightsChange = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ enable_adaptive_weights: checked })
        .eq('id', tournamentId);
      
      if (error) throw error;
      
      setEnableAdaptiveWeights(checked);
      
      toast({
        title: checked ? "ATLAS System Enabled" : "ATLAS System Disabled",
        description: checked 
          ? "ATLAS AI will now optimize team balancing with adaptive analysis"
          : "Team balancing will use standard rank-based weights",
      });
    } catch (error: any) {
      console.error('Error updating adaptive weights setting:', error);
      toast({
        title: "Error",
        description: "Failed to update adaptive weights setting",
        variant: "destructive",
      });
    }
  };

  const runBalanceAnalysis = async () => {
    setLoading(true);
    setPhase('analyzing');

    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name, team_size')
        .eq('id', tournamentId)
        .single();

      if (!tournament) throw new Error('Tournament not found');

      const teamSize = tournament.team_size || 5;

      const { data: signups } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users:user_id (
            id,
            discord_username,
            current_rank,
            peak_rank,
            weight_rating,
            manual_rank_override,
            manual_weight_override,
            use_manual_override,
            rank_override_reason
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('is_checked_in', true);

      if (!signups || signups.length === 0) {
        throw new Error('No checked-in players found');
      }

      const players = signups
        .filter(signup => signup.users)
        .map(signup => signup.users);

      const teamsToCreate = teamSize === 1 ? players.length : Math.min(maxTeams, Math.floor(players.length / teamSize));

      if (teamSize > 1 && teamsToCreate < 2) {
        throw new Error(`Need at least ${teamSize * 2} players for ${teamSize}v${teamSize} format`);
      }

      // Set up progress tracking
      setTotalPlayers(players.length);
      setProgressStep(0);
      setLastProgressStep(undefined);
      
      // Show progress for larger tournaments
      if (players.length > 10) {
        setShowProgress(true);
      }

      // ATLAS UNIFIED: Always use evidence-based ATLAS system for consistency  
      const result = await evidenceBasedSnakeDraft(
        players, 
        teamsToCreate, 
        teamSize,
        (step: EvidenceBalanceStep) => {
          setProgressStep(step.step);
          setLastProgressStep(step);
        },
        () => {
          setPhase('validating');
        },
        (player: any, calculation: any) => {
          // ATLAS weight calculation callback
          setProgressStep(prev => prev + 1);
        },
        {
          enableEvidenceBasedWeights: true,
          tournamentWinBonus: 15,
          rankDecayThreshold: 2,
          maxDecayPercent: 0.25,
          skillTierCaps: {
            enabled: true,
            eliteThreshold: 300,
            maxElitePerTeam: 1
          }
        }
      );
      
      setBalanceResult(result);
      setPhase('preview');
      setShowProgress(false);

      toast({
        title: "Balance Analysis Complete",
        description: `Generated ${teamsToCreate} teams with ${result.finalAnalysis.pointBalance.balanceQuality} balance`,
      });

    } catch (error: any) {
      console.error('Error analyzing balance:', error);
      setPhase('idle');
      setShowProgress(false);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze team balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const commitTeamsToDatabase = async () => {
    if (!balanceResult) return;

    setLoading(true);
    setPhase('saving');

    try {
      await clearExistingTeams();

      const { data: tournament } = await supabase
        .from('tournaments')
        .select('team_size')
        .eq('id', tournamentId)
        .single();

      const teamSize = tournament?.team_size || 5;

      for (let i = 0; i < balanceResult.teams.length; i++) {
        const team = balanceResult.teams[i];
        if (team.length === 0) continue;

        const captainName = team[0]?.discord_username || 'Unknown';
        const teamName = teamSize === 1 ? `${captainName} (Solo)` : `Team ${captainName}`;

        const totalPoints = team.reduce((sum, player) => {
          // Use ATLAS evidence weights for consistency  
          if (player.evidenceWeight) {
            return sum + player.evidenceWeight;
          }
          const result = getRankPointsWithManualOverride(player);
          return sum + result.points;
        }, 0);

        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            tournament_id: tournamentId,
            total_rank_points: totalPoints,
            seed: i + 1
          })
          .select()
          .single();

        if (teamError) throw teamError;

        for (let j = 0; j < team.length; j++) {
          const player = team[j];
          const isCaptain = j === 0;

          await supabase
            .from('team_members')
            .insert({
              team_id: newTeam.id,
              user_id: player.id,
              is_captain: isCaptain
            });
        }

        try {
          const teamUserIds = team.map(player => player.id);
          await notifyTeamAssigned(newTeam.id, teamName, teamUserIds);
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      // Enhanced balance analysis data with validation results
      const enhancedBalanceData = {
        timestamp: new Date().toISOString(),
        method: "Enhanced Snake Draft with Validation",
        tournament_info: {
          max_teams: maxTeams,
          team_size: teamSize,
          total_players: balanceResult.balanceSteps.length,
          teams_balanced: balanceResult.teams.length
        },
        balance_steps: balanceResult.balanceSteps.map(step => ({
          step: step.step,
          player: {
            id: step.player.id,
            discord_username: step.player.discord_username,
            points: step.player.points,
            rank: step.player.rank,
            source: step.player.source
          },
          assignedTeam: step.assignedTeam,
          reasoning: step.reasoning,
          teamStatesAfter: step.teamStatesAfter,
          phase: step.phase
        })),
        validation_result: balanceResult.finalAnalysis ? {
          antiStackingValid: balanceResult.finalAnalysis.antiStackingResults.isValid,
          violations: balanceResult.finalAnalysis.antiStackingResults.violations,
          smartBalanceApplied: balanceResult.finalAnalysis.smartBalanceApplied || false,
          optimizationSteps: balanceResult.finalAnalysis.optimizationSteps || 0
        } : null,
        final_balance: {
          averageTeamPoints: balanceResult.finalAnalysis.pointBalance.averageTeamPoints,
          minTeamPoints: balanceResult.finalAnalysis.pointBalance.minTeamPoints,
          maxTeamPoints: balanceResult.finalAnalysis.pointBalance.maxTeamPoints,
          maxPointDifference: balanceResult.finalAnalysis.pointBalance.maxPointDifference,
          balanceQuality: balanceResult.finalAnalysis.pointBalance.balanceQuality
        },
        teams_created: balanceResult.teams.map((team, index) => ({
          name: teamSize === 1 ? `${team[0]?.discord_username} (Solo)` : `Team ${team[0]?.discord_username}`,
          members: team.map(m => ({
            discord_username: m.discord_username,
            rank: getRankPointsWithManualOverride(m).rank,
            points: getRankPointsWithManualOverride(m).points,
            source: getRankPointsWithManualOverride(m).source
          })),
          total_points: team.reduce((sum, player) => {
            // Use ATLAS evidence weights for consistency
            if (player.evidenceWeight) {
              return sum + player.evidenceWeight;
            }
            const result = getRankPointsWithManualOverride(player);
            return sum + result.points;
          }, 0),
          seed: index + 1
        }))
      };

      const { error: balanceError } = await supabase
        .from('tournaments')
        .update({ balance_analysis: enhancedBalanceData })
        .eq('id', tournamentId);

      if (balanceError) {
        console.error('Error saving balance analysis:', balanceError);
      }

      setPhase('complete');
      onTeamsBalanced();

      toast({
        title: "Teams Created Successfully",
        description: `Created ${balanceResult.teams.length} balanced teams`,
      });

    } catch (error: any) {
      console.error('Error saving teams:', error);
      setPhase('preview');
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save teams to database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearExistingTeams = async () => {
    await supabase
      .from('team_members')
      .delete()
      .in('team_id', 
        (await supabase
          .from('teams')
          .select('id')
          .eq('tournament_id', tournamentId)
        ).data?.map(t => t.id) || []
      );

    await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId);
  };

  const resetToIdle = () => {
    setPhase('idle');
    setBalanceResult(null);
    setShowProgress(false);
    setProgressStep(0);
    setLastProgressStep(undefined);
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case 'idle':
        return <Users className="w-5 h-5" />;
      case 'analyzing':
        return <Settings className="w-5 h-5 animate-spin" />;
      case 'validating':
        return <Settings className="w-5 h-5 animate-pulse" />;
      case 'preview':
        return <Eye className="w-5 h-5" />;
      case 'saving':
        return <Shuffle className="w-5 h-5 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case 'idle':
        return 'Ready to analyze team balance';
      case 'analyzing':
        return enableAdaptiveWeights 
          ? 'ATLAS is running AI-enhanced team analysis...'
          : 'Running enhanced snake draft analysis...';
      case 'validating':
        return enableAdaptiveWeights
          ? 'ATLAS is validating balance and making AI-guided adjustments...'
          : 'Validating balance and making final adjustments...';
      case 'preview':
        return 'Review balance results before saving';
      case 'saving':
        return 'Saving teams to database...';
      case 'complete':
        return 'Teams created successfully!';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Display */}
      <AutobalanceProgress
        isVisible={showProgress}
        totalPlayers={totalPlayers}
        currentStep={progressStep}
        lastStep={lastProgressStep}
        phase={phase === 'analyzing' ? 'analyzing' : phase === 'validating' ? 'validating' : 'complete'}
        onComplete={() => setShowProgress(false)}
        atlasEnabled={enableAdaptiveWeights}
      />

      {/* Main Control Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {getPhaseIcon()}
            Enhanced Auto Team Balancing
            {enableAdaptiveWeights && (
              <Badge className="bg-purple-600 text-white ml-auto">
                <Brain className="w-3 h-3 mr-1" />
                ATLAS Enhanced
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-slate-300 text-sm">
            <p className="mb-2">{getPhaseDescription()}</p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>• Uses enhanced snake draft algorithm with live progress tracking</p>
              <p>• Includes post-balance validation and adjustment phase</p>
              <p>• Provides detailed reasoning for each player assignment</p>
              <p>• Records complete decision-making process for transparency</p>
              {enableAdaptiveWeights && (
                <p className="text-purple-400">• ATLAS (Adaptive Tournament League Analysis System) enabled</p>
              )}
            </div>
          </div>

          {/* Adaptive Weights Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-slate-700 rounded-lg">
            <Checkbox
              id="adaptive-weights"
              checked={enableAdaptiveWeights}
              onCheckedChange={handleAdaptiveWeightsChange}
              disabled={loadingAdaptiveSettings || loading}
            />
            <label 
              htmlFor="adaptive-weights" 
              className="text-sm font-medium text-slate-300 cursor-pointer flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Enable ATLAS (Adaptive Tournament League Analysis System)
            </label>
            <Badge variant="outline" className={`text-xs ml-auto ${
              enableAdaptiveWeights ? 'border-purple-500 text-purple-400' : ''
            }`}>
              {enableAdaptiveWeights ? 'ATLAS AI' : 'Standard'}
            </Badge>
          </div>
          <div className="text-xs text-slate-400 ml-6">
            AI-powered system that intelligently analyzes player skills, prevents stacking, and optimizes team balance
          </div>

          {/* Phase-specific Actions */}
          <div className="flex gap-2">
            {phase === 'idle' && (
              <Button
                onClick={runBalanceAnalysis}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Analyze Team Balance
              </Button>
            )}

            {phase === 'preview' && balanceResult && (
              <>
                <Button
                  onClick={commitTeamsToDatabase}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Teams ({balanceResult.teams.length})
                </Button>
                <Button
                  onClick={resetToIdle}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Start Over
                </Button>
              </>
            )}

            {phase === 'complete' && (
              <Button
                onClick={resetToIdle}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Create New Balance
              </Button>
            )}
          </div>

          {/* Balance Quality Preview */}
          {balanceResult && (
            <div className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg">
              <Badge 
                className={`${
                  balanceResult.finalAnalysis.pointBalance.balanceQuality === 'ideal' ? 'bg-green-600' :
                  balanceResult.finalAnalysis.pointBalance.balanceQuality === 'good' ? 'bg-blue-600' :
                  balanceResult.finalAnalysis.pointBalance.balanceQuality === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                } text-white`}
              >
                {balanceResult.finalAnalysis.pointBalance.balanceQuality.toUpperCase()}
              </Badge>
              <span className="text-slate-300 text-sm">
                {balanceResult.teams.length} teams • Max difference: {balanceResult.finalAnalysis.pointBalance.maxPointDifference} pts
                {balanceResult.finalAnalysis.antiStackingResults.isValid && (
                  <span className="ml-2 text-green-400">• ATLAS Validated</span>
                )}
              </span>
            </div>
          )}

          {/* Warning for Poor Balance */}
          {balanceResult?.finalAnalysis.pointBalance.balanceQuality === 'poor' && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-300 text-sm">
                <p className="font-medium">Poor Balance Detected</p>
                <p>Teams have significant point differences ({balanceResult.finalAnalysis.pointBalance.maxPointDifference} pts). Consider manual adjustments or re-running with different parameters.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <DetailedBalanceAnalysis 
        balanceResult={balanceResult} 
        tournamentName={tournamentName}
      />
    </div>
  );
};

export default EnhancedTeamBalancingTool;
