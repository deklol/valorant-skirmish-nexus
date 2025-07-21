import { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent 
} from "@/components/ui/standard-tabs";
import { Settings, Trophy, Users, Scale, UserCheck } from "lucide-react";
import OverviewTab from "./tabs/OverviewTab";
import BracketTab from "./tabs/BracketTab";
import ParticipantsTab from "./tabs/ParticipantsTab";
import AdminTab from "./tabs/AdminTab";
import PlayersTab from "./tabs/PlayersTab";
import BalancingTab from "./tabs/BalancingTab";
import TournamentBalanceTransparency from "./TournamentBalanceTransparency";
import { useAuth } from "@/hooks/useAuth";

export default function TournamentTabs({
  tournament, matches, maxPlayers, parsedMapVetoRounds, isAdmin, teams, onRefresh
}: {
  tournament: any,
  matches: any[],
  maxPlayers: number,
  parsedMapVetoRounds: number[],
  isAdmin: boolean,
  teams: any[],
  onRefresh: () => void
}) {
  return (
    <StandardTabs defaultValue="overview" className="space-y-6">
      <StandardTabsList className="flex flex-wrap w-full gap-x-2 gap-y-2">
        <StandardTabsTrigger value="overview">
          <Settings className="w-4 h-4 mr-2" />
          Overview
        </StandardTabsTrigger>
        {matches.length > 0 && (
          <StandardTabsTrigger value="bracket">
            <Trophy className="w-4 h-4 mr-2" />
            Bracket
          </StandardTabsTrigger>
        )}
        <StandardTabsTrigger value="participants">
          <Users className="w-4 h-4 mr-2" />
          Participants
        </StandardTabsTrigger>
        {/* The 'Balance Analysis' tab trigger has been removed as it's now on the main page. */}
        {isAdmin && (
          <>
            <StandardTabsTrigger value="admin">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </StandardTabsTrigger>
            <StandardTabsTrigger value="players">
              <UserCheck className="w-4 h-4 mr-2" />
              Players
            </StandardTabsTrigger>
            <StandardTabsTrigger value="balancing">
              <Scale className="w-4 h-4 mr-2" />
              Balance
            </StandardTabsTrigger>
          </>
        )}
      </StandardTabsList>
      <StandardTabsContent value="overview" className="space-y-6">
        <OverviewTab tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} />
      </StandardTabsContent>
      {matches.length > 0 && (
        <StandardTabsContent value="bracket" className="space-y-6">
          <BracketTab tournamentId={tournament.id} />
        </StandardTabsContent>
      )}
      <StandardTabsContent value="participants" className="space-y-6">
        <ParticipantsTab tournamentId={tournament.id} maxPlayers={maxPlayers} isAdmin={isAdmin} />
      </StandardTabsContent>
      {/* The 'Balance Analysis' tab content has been removed as it's now on the main page. */}
      {isAdmin &&
        <>
          <StandardTabsContent value="admin" className="space-y-6">
            <AdminTab 
              tournament={tournament} 
              teams={teams} 
              onRefresh={onRefresh}
              onTournamentUpdated={onRefresh} 
              matches={matches} 
              parsedMapVetoRounds={parsedMapVetoRounds} 
              onBracketGenerated={onRefresh} 
              onStatusChange={onRefresh} 
            />
          </StandardTabsContent>
          <StandardTabsContent value="players" className="space-y-6">
            <PlayersTab tournamentId={tournament.id} maxPlayers={maxPlayers} onCheckInUpdate={onRefresh} />
          </StandardTabsContent>
          <StandardTabsContent value="balancing" className="space-y-6">
            <BalancingTab tournamentId={tournament.id} maxTeams={tournament.max_teams} teamSize={tournament.team_size} onTeamsUpdated={onRefresh} />
          </StandardTabsContent>
        </>
      }
    </StandardTabs>
  );
}
