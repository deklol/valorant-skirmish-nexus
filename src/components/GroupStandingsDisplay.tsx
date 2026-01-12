/**
 * Group Stage Standings Display Component
 * Shows live standings for each group and allows admins to trigger knockout generation
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, ChevronRight, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGroupStandings, generateKnockoutFromGroups, GroupStanding } from "@/utils/groupStageGenerator";
import { supabase } from "@/integrations/supabase/client";

interface GroupStandingsDisplayProps {
  tournamentId: string;
  teamsAdvancePerGroup: number;
  isAdmin?: boolean;
  onKnockoutGenerated?: () => void;
}

export function GroupStandingsDisplay({ 
  tournamentId, 
  teamsAdvancePerGroup, 
  isAdmin = false,
  onKnockoutGenerated 
}: GroupStandingsDisplayProps) {
  const [standings, setStandings] = useState<GroupStanding[][]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [knockoutExists, setKnockoutExists] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStandings();
    checkKnockoutExists();

    // Subscribe to match updates for live standings
    const channel = supabase
      .channel(`group-standings-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchStandings();
          checkKnockoutExists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  async function fetchStandings() {
    setLoading(true);
    const result = await getGroupStandings(tournamentId);
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setStandings(result.standings);
      setIsComplete(result.complete);
    }
    setLoading(false);
  }

  async function checkKnockoutExists() {
    const { data } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('bracket_position', 'knockout')
      .limit(1);
    
    setKnockoutExists(!!data && data.length > 0);
  }

  async function handleGenerateKnockout() {
    setGenerating(true);
    const result = await generateKnockoutFromGroups(tournamentId);
    
    if (result.success) {
      toast({
        title: "Knockout Stage Generated",
        description: `Created ${result.matchesCreated} knockout matches`,
      });
      setKnockoutExists(true);
      onKnockoutGenerated?.();
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    setGenerating(false);
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading standings...</span>
        </CardContent>
      </Card>
    );
  }

  if (standings.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No group stage matches found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isComplete ? "default" : "secondary"}>
            {isComplete ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Group Stage Complete
              </>
            ) : (
              "Group Stage In Progress"
            )}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Top {teamsAdvancePerGroup} from each group advance
          </span>
        </div>

        {isAdmin && isComplete && !knockoutExists && (
          <Button
            onClick={handleGenerateKnockout}
            disabled={generating}
            className="bg-primary hover:bg-primary/90"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Generate Knockout Stage
              </>
            )}
          </Button>
        )}

        {knockoutExists && (
          <Badge variant="outline" className="text-green-500 border-green-500">
            <Check className="h-3 w-3 mr-1" />
            Knockout Generated
          </Badge>
        )}
      </div>

      {/* Group Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {standings.map((groupStandings, groupIndex) => (
          <Card key={groupIndex} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4" />
                Group {groupIndex + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 font-medium">#</th>
                    <th className="text-left py-2 font-medium">Team</th>
                    <th className="text-center py-2 font-medium">P</th>
                    <th className="text-center py-2 font-medium">W</th>
                    <th className="text-center py-2 font-medium">L</th>
                    <th className="text-center py-2 font-medium">GD</th>
                    <th className="text-center py-2 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStandings.map((standing, position) => {
                    const qualifies = position < teamsAdvancePerGroup;
                    return (
                      <tr 
                        key={standing.teamId}
                        className={`border-b border-border/50 ${qualifies ? 'bg-green-500/10' : ''}`}
                      >
                        <td className="py-2">
                          {qualifies ? (
                            <ChevronRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">{position + 1}</span>
                          )}
                        </td>
                        <td className="py-2 font-medium text-foreground">
                          {standing.teamName}
                        </td>
                        <td className="text-center py-2 text-muted-foreground">
                          {standing.played}
                        </td>
                        <td className="text-center py-2 text-green-500">
                          {standing.wins}
                        </td>
                        <td className="text-center py-2 text-red-500">
                          {standing.losses}
                        </td>
                        <td className="text-center py-2">
                          <span className={standing.goalDifference > 0 ? 'text-green-500' : standing.goalDifference < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                          </span>
                        </td>
                        <td className="text-center py-2 font-bold text-foreground">
                          {standing.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning if not complete */}
      {isAdmin && !isComplete && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">
            Complete all group stage matches before generating the knockout bracket
          </span>
        </div>
      )}
    </div>
  );
}

export default GroupStandingsDisplay;
