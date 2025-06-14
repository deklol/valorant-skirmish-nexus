
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import MatchScoreCards from "./MatchScoreCards";
import MatchInformation from "./MatchInformation";
import MapVetoManager from "@/components/MapVetoManager";
import ScoreReporting from "@/components/ScoreReporting";
import MatchTeamBalancing from "@/components/MatchTeamBalancing";

interface Match {
  id: string;
  match_number: number;
  round_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  status: string;
  winner_id: string | null;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  tournament_id?: string;
  team1?: { 
    id: string;
    name: string; 
  } | null;
  team2?: { 
    id: string;
    name: string; 
  } | null;
  tournament?: {
    id: string;
    name: string;
  } | null;
}

interface MatchTabsProps {
  match: Match;
  userTeamId: string | null;
  isAdmin: boolean;
  onScoreSubmitted: () => void;
  onTeamsRebalanced: () => void;
}

const MatchTabs = ({
  match,
  userTeamId,
  isAdmin,
  onScoreSubmitted,
  onTeamsRebalanced
}: MatchTabsProps) => {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-slate-800 border-slate-700">
        <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
          Overview
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="admin" className="text-slate-300 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            Admin
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <MatchScoreCards
          team1Name={match.team1?.name || 'TBD'}
          team2Name={match.team2?.name || 'TBD'}
          team1Score={match.score_team1}
          team2Score={match.score_team2}
        />

        {/* Map Veto Manager */}
        {match.team1_id && match.team2_id && (
          <MapVetoManager
            matchId={match.id}
            team1Id={match.team1_id}
            team2Id={match.team2_id}
            team1Name={match.team1?.name || 'Team 1'}
            team2Name={match.team2?.name || 'Team 2'}
            matchStatus={match.status}
            userTeamId={userTeamId}
            isAdmin={isAdmin}
          />
        )}

        <MatchInformation
          scheduledTime={match.scheduled_time}
          status={match.status}
          startedAt={match.started_at}
          completedAt={match.completed_at}
          winnerId={match.winner_id}
          team1Id={match.team1_id}
          team2Id={match.team2_id}
          team1Name={match.team1?.name || 'Team 1'}
          team2Name={match.team2?.name || 'Team 2'}
        />

        {/* Score Reporting */}
        {match.status !== 'completed' && (userTeamId || isAdmin) && (
          <ScoreReporting
            match={match}
            onScoreSubmitted={onScoreSubmitted}
          />
        )}
      </TabsContent>

      {isAdmin && (
        <TabsContent value="admin" className="space-y-6">
          <MatchTeamBalancing
            matchId={match.id}
            team1Id={match.team1_id}
            team2Id={match.team2_id}
            tournamentId={match.tournament?.id || ''}
            onTeamsRebalanced={onTeamsRebalanced}
          />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default MatchTabs;
