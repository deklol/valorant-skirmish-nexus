import { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent 
} from "@/components/ui/standard-tabs";
import { Settings, Trophy, Users, Scale, UserCheck, ScrollText } from "lucide-react";
import OverviewTab from "./tabs/OverviewTab";
import BracketTab from "./tabs/BracketTab";
import ParticipantsTab from "./tabs/ParticipantsTab";
import AdminTab from "./tabs/AdminTab";
import PlayersTab from "./tabs/PlayersTab";
import BalancingTab from "./tabs/BalancingTab";
import TournamentBalanceTransparency from "./TournamentBalanceTransparency";
import RulesTab from "./tabs/RulesTab";
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
      <StandardTabsList className="flex flex-wrap w-full gap-x-1 gap-y-1 md:gap-x-2 md:gap-y-2 overflow-x-auto">
        <StandardTabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
          <Settings className="w-4 h-4" />
          <span className="hidden md:inline">Overview</span>
          <span className="md:hidden">Info</span>
        </StandardTabsTrigger>
        <StandardTabsTrigger value="rules" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
          <ScrollText className="w-4 h-4" />
          <span className="hidden md:inline">Rules</span>
          <span className="md:hidden">Rule</span>
        </StandardTabsTrigger>
        {matches.length > 0 && (
          <StandardTabsTrigger value="bracket" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
            <Trophy className="w-4 h-4" />
            <span className="hidden md:inline">Bracket</span>
            <span className="md:hidden">Brkt</span>
          </StandardTabsTrigger>
        )}
        <StandardTabsTrigger value="participants" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
          <Users className="w-4 h-4" />
          <span className="hidden md:inline">Participants</span>
          <span className="md:hidden">Play</span>
        </StandardTabsTrigger>
        {/* The 'Balance Analysis' tab trigger has been removed as it's now on the main page. */}
        {isAdmin && (
          <>
            <StandardTabsTrigger value="admin" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
              <span className="md:hidden">Adm</span>
            </StandardTabsTrigger>
            <StandardTabsTrigger value="players" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
              <UserCheck className="w-4 h-4" />
              <span className="hidden md:inline">Players</span>
              <span className="md:hidden">Plys</span>
            </StandardTabsTrigger>
            <StandardTabsTrigger value="balancing" className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-4">
              <Scale className="w-4 h-4" />
              <span className="hidden md:inline">Balance</span>
              <span className="md:hidden">Bal</span>
            </StandardTabsTrigger>
          </>
        )}
      </StandardTabsList>
      <StandardTabsContent value="overview" className="space-y-6">
        <OverviewTab tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} teams={teams} />
      </StandardTabsContent>
      <StandardTabsContent value="rules" className="space-y-6">
        <RulesTab />
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
