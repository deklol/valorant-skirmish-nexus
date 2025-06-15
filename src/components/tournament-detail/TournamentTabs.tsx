
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Trophy, Users, Scale, UserCheck } from "lucide-react";
import OverviewTab from "./tabs/OverviewTab";
import BracketTab from "./tabs/BracketTab";
import ParticipantsTab from "./tabs/ParticipantsTab";
import AdminTab from "./tabs/AdminTab";
import PlayersTab from "./tabs/PlayersTab";
import BalancingTab from "./tabs/BalancingTab";
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
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList
        className={`flex flex-wrap w-full gap-x-2 gap-y-2 bg-slate-800 border-slate-700`}
        style={{ alignItems: 'stretch' }}
      >
        <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
          <Settings className="w-4 h-4 mr-2" />
          Overview
        </TabsTrigger>
        {matches.length > 0 && (
          <TabsTrigger value="bracket" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Bracket
          </TabsTrigger>
        )}
        <TabsTrigger value="participants" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
          <Users className="w-4 h-4 mr-2" />
          Participants
        </TabsTrigger>
        {isAdmin && (
          <>
            <TabsTrigger value="admin" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <UserCheck className="w-4 h-4 mr-2" />
              Players
            </TabsTrigger>
            <TabsTrigger value="balancing" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Scale className="w-4 h-4 mr-2" />
              Balance
            </TabsTrigger>
          </>
        )}
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        <OverviewTab tournament={tournament} parsedMapVetoRounds={parsedMapVetoRounds} />
      </TabsContent>
      {matches.length > 0 && (
        <TabsContent value="bracket" className="space-y-6">
          <BracketTab tournamentId={tournament.id} />
        </TabsContent>
      )}
      <TabsContent value="participants" className="space-y-6">
        <ParticipantsTab tournamentId={tournament.id} maxPlayers={maxPlayers} isAdmin={isAdmin} />
      </TabsContent>
      {isAdmin &&
        <>
          <TabsContent value="admin" className="space-y-6">
            <AdminTab tournament={tournament} onTournamentUpdated={onRefresh} matches={matches} teams={teams} parsedMapVetoRounds={parsedMapVetoRounds} onBracketGenerated={onRefresh} onStatusChange={onRefresh} />
          </TabsContent>
          <TabsContent value="players" className="space-y-6">
            <PlayersTab tournamentId={tournament.id} maxPlayers={maxPlayers} onCheckInUpdate={onRefresh} />
          </TabsContent>
          <TabsContent value="balancing" className="space-y-6">
            <BalancingTab tournamentId={tournament.id} maxTeams={tournament.max_teams} teamSize={tournament.team_size} onTeamsUpdated={onRefresh} />
          </TabsContent>
        </>
      }
    </Tabs>
  );
}
