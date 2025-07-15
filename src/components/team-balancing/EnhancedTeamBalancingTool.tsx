// Enhanced Team Balancing Tool with improved snake draft and transparency
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shuffle, AlertTriangle, CheckCircle, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { enhancedSnakeDraft, EnhancedTeamResult } from "./EnhancedSnakeDraft";
import DetailedBalanceAnalysis from "./DetailedBalanceAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

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
  const [previewMode, setPreviewMode] = useState(false);
  const [balanceResult, setBalanceResult] = useState<EnhancedTeamResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'preview' | 'saving' | 'complete'>('idle');
  const { toast } = useToast();
  const { notifyTeamAssigned } = useEnhancedNotifications();

  const runBalanceAnalysis = async () => {
    setLoading(true);
    setPhase('analyzing');

    try {
      // Get tournament details
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name, team_size')
        .eq('id', tournamentId)
        .single();

      if (!tournament) throw new Error('Tournament not found');

      const teamSize = tournament.team_size || 5;

      // Get checked-in players
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

      // Run enhanced balance analysis
      const result = enhancedSnakeDraft(players, teamsToCreate, teamSize);
      setBalanceResult(result);
      setPhase('preview');

      toast({
        title: "Balance Analysis Complete",
        description: `Generated ${teamsToCreate} teams with ${result.finalBalance.balanceQuality} balance`,
      });

    } catch (error: any) {
      console.error('Error analyzing balance:', error);
      setPhase('idle');
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
      // Clear existing teams
      await clearExistingTeams();

      // Get tournament details for team size
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('team_size')
        .eq('id', tournamentId)
        .single();

      const teamSize = tournament?.team_size || 5;

      // Save teams to database
      for (let i = 0; i < balanceResult.teams.length; i++) {
        const team = balanceResult.teams[i];
        if (team.length === 0) continue;

        // Generate team name
        const captainName = team[0]?.discord_username || 'Unknown';
        const teamName = teamSize === 1 ? `${captainName} (Solo)` : `Team ${captainName}`;

        // Calculate total points
        const totalPoints = team.reduce((sum, player) => {
          const result = getRankPointsWithManualOverride(player);
          return sum + result.points;
        }, 0);

        // Create team
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

        // Add team members
        for (let j = 0; j < team.length; j++) {
          const player = team[j];
          const isCaptain = j === 0; // First player is captain

          await supabase
            .from('team_members')
            .insert({
              team_id: newTeam.id,
              user_id: player.id,
              is_captain: isCaptain
            });
        }

        // Send notifications
        try {
          const teamUserIds = team.map(player => player.id);
          await notifyTeamAssigned(newTeam.id, teamName, teamUserIds);
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      // Save balance analysis data for transparency
      const qualityScore = balanceResult.finalBalance.balanceQuality === 'ideal' ? 95 :
                           balanceResult.finalBalance.balanceQuality === 'good' ? 80 :
                           balanceResult.finalBalance.balanceQuality === 'warning' ? 65 : 50;

      await supabase
        .from('tournaments')
        .update({
          balance_analysis: {
            qualityScore,
            maxPointDifference: balanceResult.finalBalance.maxPointDifference,
            avgPointDifference: (balanceResult.finalBalance.maxTeamPoints - balanceResult.finalBalance.minTeamPoints) / 2,
            balanceSteps: balanceResult.balanceSteps.map(step => ({
              round: step.step,
              player: {
                name: step.player.discord_username,
                rank: step.player.rank,
                points: step.player.points
              },
              assignedTo: `Team ${step.assignedTeam + 1}`,
              reasoning: step.reasoning,
              teamStates: step.teamStatesAfter.map(state => ({
                name: `Team ${state.teamIndex + 1}`,
                totalPoints: state.totalPoints,
                playerCount: state.playerCount
              }))
            })),
            finalTeamStats: balanceResult.teams.map((team, index) => ({
              name: `Team ${team[0]?.discord_username || `${index + 1}`}`,
              totalPoints: team.reduce((sum, player) => {
                const result = getRankPointsWithManualOverride(player);
                return sum + result.points;
              }, 0),
              playerCount: team.length,
              avgPoints: team.length > 0 ? team.reduce((sum, player) => {
                const result = getRankPointsWithManualOverride(player);
                return sum + result.points;
              }, 0) / team.length : 0
            })),
            method: "Enhanced Snake Draft",
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', tournamentId);

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
    // Delete team members first
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

    // Delete teams
    await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId);
  };

  const resetToIdle = () => {
    setPhase('idle');
    setBalanceResult(null);
    setPreviewMode(false);
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case 'idle':
        return <Users className="w-5 h-5" />;
      case 'analyzing':
        return <Settings className="w-5 h-5 animate-spin" />;
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
        return 'Running enhanced snake draft analysis...';
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
      {/* Main Control Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {getPhaseIcon()}
            Enhanced Auto Team Balancing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-slate-300 text-sm">
            <p className="mb-2">{getPhaseDescription()}</p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>• Uses enhanced snake draft algorithm with proper alternating pattern</p>
              <p>• Supports manual rank overrides and peak rank fallback</p>
              <p>• Provides detailed balance analysis and step-by-step reasoning</p>
              <p>• Preview results before committing to database</p>
            </div>
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
                  balanceResult.finalBalance.balanceQuality === 'ideal' ? 'bg-green-600' :
                  balanceResult.finalBalance.balanceQuality === 'good' ? 'bg-blue-600' :
                  balanceResult.finalBalance.balanceQuality === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                } text-white`}
              >
                {balanceResult.finalBalance.balanceQuality.toUpperCase()}
              </Badge>
              <span className="text-slate-300 text-sm">
                {balanceResult.teams.length} teams • Max difference: {balanceResult.finalBalance.maxPointDifference} pts
              </span>
            </div>
          )}

          {/* Warning for Poor Balance */}
          {balanceResult?.finalBalance.balanceQuality === 'poor' && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-300 text-sm">
                <p className="font-medium">Poor Balance Detected</p>
                <p>Teams have significant point differences ({balanceResult.finalBalance.maxPointDifference} pts). Consider manual adjustments or re-running with different parameters.</p>
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