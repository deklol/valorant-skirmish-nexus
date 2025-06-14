
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shuffle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BracketGeneratorProps {
  tournamentId: string;
  tournament: {
    status: string;
    max_teams: number;
    bracket_type: string;
    match_format: string;
  };
  teams: any[];
  onBracketGenerated: () => void;
}

const BracketGenerator = ({ tournamentId, tournament, teams, onBracketGenerated }: BracketGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateBracket = async () => {
    if (teams.length < 2) {
      toast({
        title: "Not Enough Teams",
        description: "At least 2 teams are required to generate a bracket",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Starting bracket generation for tournament:', tournamentId);
      console.log('Teams available:', teams.length);

      // Clear any existing matches first
      const { error: deleteError } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (deleteError) {
        console.error('Error clearing existing matches:', deleteError);
        throw deleteError;
      }

      // Seed teams (simple random seeding for now)
      const seededTeams = [...teams].sort(() => Math.random() - 0.5);
      console.log('Seeded teams:', seededTeams.map(team => team.name));
      
      // Update team seeds
      for (let i = 0; i < seededTeams.length; i++) {
        const { error: seedError } = await supabase
          .from('teams')
          .update({ seed: i + 1 })
          .eq('id', seededTeams[i].id);

        if (seedError) {
          console.error('Error updating team seed:', seedError);
          throw seedError;
        }
      }

      // Calculate number of rounds needed for single elimination
      const rounds = Math.ceil(Math.log2(seededTeams.length));
      const matches = [];

      console.log('Generating bracket with', rounds, 'rounds');

      // Create first round matches
      for (let i = 0; i < seededTeams.length; i += 2) {
        if (i + 1 < seededTeams.length) {
          const match = {
            tournament_id: tournamentId,
            round_number: 1,
            match_number: Math.floor(i / 2) + 1,
            team1_id: seededTeams[i].id,
            team2_id: seededTeams[i + 1].id,
            status: 'pending',
            score_team1: 0,
            score_team2: 0,
            best_of: tournament.match_format === 'BO1' ? 1 : tournament.match_format === 'BO3' ? 3 : 5
          };
          matches.push(match);
          console.log('Created first round match:', seededTeams[i].name, 'vs', seededTeams[i + 1].name);
        }
      }

      // Handle odd number of teams (bye for last team)
      if (seededTeams.length % 2 === 1) {
        const byeTeam = seededTeams[seededTeams.length - 1];
        console.log('Bye team:', byeTeam.name);
        
        // Create a bye match in round 2 for the bye team
        if (rounds > 1) {
          matches.push({
            tournament_id: tournamentId,
            round_number: 2,
            match_number: 1,
            team1_id: byeTeam.id,
            team2_id: null,
            status: 'pending',
            score_team1: 0,
            score_team2: 0,
            best_of: tournament.match_format === 'BO1' ? 1 : tournament.match_format === 'BO3' ? 3 : 5
          });
        }
      }

      // Create placeholder matches for subsequent rounds
      for (let round = 2; round <= rounds; round++) {
        const matchesInPreviousRound = Math.ceil(seededTeams.length / Math.pow(2, round - 1));
        const matchesInRound = Math.ceil(matchesInPreviousRound / 2);
        
        for (let match = 1; match <= matchesInRound; match++) {
          // Skip if we already created a bye match for this position
          const existingMatch = matches.find(m => m.round_number === round && m.match_number === match);
          if (!existingMatch) {
            matches.push({
              tournament_id: tournamentId,
              round_number: round,
              match_number: match,
              team1_id: null,
              team2_id: null,
              status: 'pending',
              score_team1: 0,
              score_team2: 0,
              best_of: tournament.match_format === 'BO1' ? 1 : tournament.match_format === 'BO3' ? 3 : 5
            });
          }
        }
      }

      console.log('Total matches to create:', matches.length);

      // Insert all matches
      const { error: insertError } = await supabase
        .from('matches')
        .insert(matches);

      if (insertError) {
        console.error('Error inserting matches:', insertError);
        throw insertError;
      }

      console.log('Successfully created all matches');

      // Update tournament status to live
      const { error: statusError } = await supabase
        .from('tournaments')
        .update({ status: 'live' })
        .eq('id', tournamentId);

      if (statusError) {
        console.error('Error updating tournament status:', statusError);
        throw statusError;
      }

      console.log('Tournament status updated to live');

      toast({
        title: "Bracket Generated",
        description: `Tournament bracket created with ${matches.length} matches across ${rounds} rounds`,
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
      setLoading(false);
    }
  };

  const canGenerateBracket = tournament.status === 'balancing' && teams.length >= 2;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Bracket Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{teams.length}</div>
            <div className="text-sm text-slate-400">Teams Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{tournament.max_teams}</div>
            <div className="text-sm text-slate-400">Max Teams</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.bracket_type.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.match_format}
            </Badge>
          </div>
        </div>

        {!canGenerateBracket && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500 text-sm">
              {teams.length < 2 ? 'Need at least 2 teams' : 'Tournament must be in balancing phase'}
            </span>
          </div>
        )}

        <Button
          onClick={generateBracket}
          disabled={loading || !canGenerateBracket}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {loading ? (
            "Generating..."
          ) : (
            <>
              <Shuffle className="w-4 h-4 mr-2" />
              Generate Bracket
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BracketGenerator;
