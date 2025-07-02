import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TeamCleanupToolsProps {
  tournamentId: string;
  teams: Array<{
    id: string;
    name: string;
    members: Array<{ id: string; discord_username: string }>;
    totalWeight: number;
    isPlaceholder?: boolean;
  }>;
  onTeamsUpdated: () => void;
}

export default function TeamCleanupTools({ 
  tournamentId, 
  teams, 
  onTeamsUpdated 
}: TeamCleanupToolsProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [duplicateTeams, setDuplicateTeams] = useState<Array<{
    name: string;
    teams: Array<{ id: string; memberCount: number; isPlaceholder: boolean }>;
  }>>([]);
  const { toast } = useToast();

  const analyzeDuplicates = async () => {
    setAnalyzing(true);
    try {
      // Group teams by name (case-insensitive)
      const teamGroups = new Map<string, Array<{ id: string; memberCount: number; isPlaceholder: boolean }>>();
      
      teams.forEach(team => {
        const normalizedName = team.name.toLowerCase().trim();
        if (!teamGroups.has(normalizedName)) {
          teamGroups.set(normalizedName, []);
        }
        teamGroups.get(normalizedName)!.push({
          id: team.id,
          memberCount: team.members.length,
          isPlaceholder: team.isPlaceholder || false
        });
      });

      // Find groups with multiple teams
      const duplicates = Array.from(teamGroups.entries())
        .filter(([_, teams]) => teams.length > 1)
        .map(([name, teams]) => ({ name, teams }));

      setDuplicateTeams(duplicates);
      
      if (duplicates.length === 0) {
        toast({
          title: "No Duplicates Found",
          description: "All teams have unique names"
        });
      } else {
        toast({
          title: "Duplicates Detected",
          description: `Found ${duplicates.length} sets of duplicate team names`
        });
      }
    } catch (error: any) {
      console.error('Error analyzing duplicates:', error);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const removeEmptyTeams = async () => {
    setLoading(true);
    try {
      const emptyTeams = teams.filter(team => team.members.length === 0 && !team.isPlaceholder);
      
      if (emptyTeams.length === 0) {
        toast({
          title: "No Empty Teams",
          description: "All teams have players assigned"
        });
        setLoading(false);
        return;
      }

      for (const team of emptyTeams) {
        // Delete team members first (if any)
        await supabase
          .from('team_members')
          .delete()
          .eq('team_id', team.id);

        // Delete the team
        await supabase
          .from('teams')
          .delete()
          .eq('id', team.id);
      }

      toast({
        title: "Empty Teams Removed",
        description: `Removed ${emptyTeams.length} empty team(s)`
      });

      onTeamsUpdated();
    } catch (error: any) {
      console.error('Error removing empty teams:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicateTeam = async (teamId: string, teamName: string) => {
    setLoading(true);
    try {
      // Delete team members first
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);

      // Delete the team
      await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      toast({
        title: "Duplicate Team Removed",
        description: `Removed duplicate "${teamName}"`
      });

      // Refresh analysis
      onTeamsUpdated();
      await analyzeDuplicates();
    } catch (error: any) {
      console.error('Error removing duplicate team:', error);
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const consolidateDuplicates = async (teamName: string, teamIds: string[]) => {
    setLoading(true);
    try {
      // Keep the first team, merge members into it
      const [keepTeamId, ...removeTeamIds] = teamIds;
      
      // Move all members from duplicate teams to the main team
      for (const teamId of removeTeamIds) {
        await supabase
          .from('team_members')
          .update({ team_id: keepTeamId })
          .eq('team_id', teamId);
      }

      // Delete the duplicate teams
      for (const teamId of removeTeamIds) {
        await supabase
          .from('teams')
          .delete()
          .eq('id', teamId);
      }

      // Recalculate team weight for the consolidated team
      const { data: members } = await supabase
        .from('team_members')
        .select(`
          users (
            rank_points,
            weight_rating
          )
        `)
        .eq('team_id', keepTeamId);

      const totalWeight = members?.reduce((sum, member) => {
        return sum + (member.users?.weight_rating || member.users?.rank_points || 0);
      }, 0) || 0;

      await supabase
        .from('teams')
        .update({ total_rank_points: totalWeight })
        .eq('id', keepTeamId);

      toast({
        title: "Teams Consolidated",
        description: `Merged duplicate "${teamName}" teams into one`
      });

      onTeamsUpdated();
      await analyzeDuplicates();
    } catch (error: any) {
      console.error('Error consolidating duplicates:', error);
      toast({
        title: "Consolidation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emptyTeamCount = teams.filter(team => team.members.length === 0 && !team.isPlaceholder).length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          Team Cleanup Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-300 text-sm">
          <p>Tools to clean up broken, duplicate, or empty teams in the tournament.</p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
            {teams.length} Total Teams
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
            {emptyTeamCount} Empty Teams
          </Badge>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
            {duplicateTeams.length} Duplicate Sets
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={analyzeDuplicates}
            disabled={analyzing}
            variant="outline"
            size="sm"
            className="border-blue-500/40 text-blue-300 hover:bg-blue-500/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze Duplicates'}
          </Button>

          {emptyTeamCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Empty Teams ({emptyTeamCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Remove Empty Teams</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This will permanently delete {emptyTeamCount} team(s) that have no players assigned. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={removeEmptyTeams}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={loading}
                  >
                    {loading ? 'Removing...' : 'Remove Empty Teams'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Duplicate Teams Display */}
        {duplicateTeams.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Duplicate Teams Found
            </h4>
            
            {duplicateTeams.map((duplicateSet, index) => (
              <div key={index} className="p-3 bg-red-900/20 border border-red-600/30 rounded">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-red-400 font-medium">"{duplicateSet.name}"</h5>
                  <Button
                    onClick={() => consolidateDuplicates(
                      duplicateSet.name, 
                      duplicateSet.teams.map(t => t.id)
                    )}
                    disabled={loading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Consolidate All
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {duplicateSet.teams.map((team, teamIndex) => (
                    <div key={team.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Team #{teamIndex + 1}
                        </Badge>
                        <span className="text-slate-300">
                          {team.memberCount} player{team.memberCount !== 1 ? 's' : ''}
                        </span>
                        {team.isPlaceholder && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                            Placeholder
                          </Badge>
                        )}
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/40 text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Remove Duplicate Team</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              This will permanently delete this duplicate "{duplicateSet.name}" team and remove 
                              {team.memberCount > 0 ? ` ${team.memberCount} player(s) from the tournament` : ' the empty team'}. 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => removeDuplicateTeam(team.id, duplicateSet.name)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={loading}
                            >
                              {loading ? 'Removing...' : 'Remove Team'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
