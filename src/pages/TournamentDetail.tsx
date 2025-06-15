
import { useAuth } from "@/hooks/useAuth";
import TournamentWinnerDisplay from "@/components/TournamentWinnerDisplay";
import TournamentRegistration from "@/components/TournamentRegistration";
import { useTournamentData } from "@/hooks/useTournamentData";
import TournamentHeader from "@/components/tournament-detail/TournamentHeader";
import TeamsSection from "@/components/tournament-detail/TeamsSection";
import TournamentTabs from "@/components/tournament-detail/TournamentTabs";
import { TournamentLoading, TournamentNotFound } from "@/components/tournament-detail/LoadingStates";

const TournamentDetail = () => {
  const { isAdmin } = useAuth();
  const {
    tournament,
    parsedMapVetoRounds,
    teams,
    matches,
    loading,
    handleRefresh,
  } = useTournamentData();

  if (loading) return <TournamentLoading />;
  if (!tournament) return <TournamentNotFound />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {tournament.status === "completed" && (
          <TournamentWinnerDisplay
            tournamentId={tournament.id}
            tournamentStatus={tournament.status}
          />
        )}
        <TournamentHeader tournament={tournament} />
        <TeamsSection teams={teams} />
        {tournament.status === "open" && (
          <TournamentRegistration
            tournamentId={tournament.id}
            tournament={tournament}
            onRegistrationChange={handleRefresh}
          />
        )}
        <TournamentTabs
          tournament={tournament}
          matches={matches}
          maxPlayers={tournament.max_players}
          parsedMapVetoRounds={parsedMapVetoRounds}
          isAdmin={isAdmin}
          teams={teams}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default TournamentDetail;
