import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Settings, Users, Trash2 } from "lucide-react";
import { MatchEditor } from "./MatchEditor";
import { TeamReassignmentTool } from "./TeamReassignmentTool";
import { BracketValidationPanel } from "./BracketValidationPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ManualBracketEditorProps {
  tournamentId: string;
  onBracketUpdated?: () => void;
}

export const ManualBracketEditor: React.FC<ManualBracketEditorProps> = ({
  tournamentId,
  onBracketUpdated
}) => {
  const [activeTab, setActiveTab] = useState("matches");

  // Fetch tournament matches
  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['tournament-matches', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          winner:teams!matches_winner_id_fkey(id, name),
          tournament:tournaments(name, status)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch tournament teams
  const { data: teams } = useQuery({
    queryKey: ['tournament-teams', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const handleMatchUpdated = () => {
    refetch();
    onBracketUpdated?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading bracket data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Manual Bracket Editor
        </CardTitle>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Use these tools to manually fix bracket issues such as wrong teams, incorrect results, 
            or duplicate matches. Changes will be applied immediately and logged for audit purposes.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit Matches
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Reassign Teams
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Cleanup & Validate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="mt-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Edit match results, scores, and winners. Click on any match to modify its details.
              </div>
              {matches?.map((match) => (
                <MatchEditor
                  key={match.id}
                  match={match}
                  teams={teams || []}
                  onMatchUpdated={handleMatchUpdated}
                />
              ))}
              {(!matches || matches.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No matches found for this tournament.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <TeamReassignmentTool
              matches={matches || []}
              teams={teams || []}
              onTeamsReassigned={handleMatchUpdated}
            />
          </TabsContent>

          <TabsContent value="cleanup" className="mt-6">
            <BracketValidationPanel
              tournamentId={tournamentId}
              matches={matches || []}
              onCleanupComplete={handleMatchUpdated}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};