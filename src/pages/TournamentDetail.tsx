
import { useAuth } from "@/hooks/useAuth";
import TournamentWinnerDisplay from "@/components/TournamentWinnerDisplay";
import TournamentRegistration from "@/components/TournamentRegistration";
import FeaturedVODs from "@/components/FeaturedVODs";
import { useTournamentData } from "@/hooks/useTournamentData";
import TournamentHeader from "@/components/tournament-detail/TournamentHeader";
import TeamsSection from "@/components/tournament-detail/TeamsSection";
import TournamentTabs from "@/components/tournament-detail/TournamentTabs";
import { TournamentLoading, TournamentNotFound } from "@/components/tournament-detail/LoadingStates";
import SponsorDisplay from "@/components/SponsorDisplay";

import { useTournamentPageTracking } from "@/hooks/useAnalytics";

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

  // Track tournament page views
  useTournamentPageTracking(tournament?.id);

  if (loading) return <TournamentLoading />;
  if (!tournament) return <TournamentNotFound />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Compact Header */}
        <TournamentHeader tournament={tournament} />
        
        {/* Winners/Champions and Featured VODs Row - Only for completed tournaments */}
        {tournament.status === "completed" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TournamentWinnerDisplay
              tournamentId={tournament.id}
              tournamentStatus={tournament.status}
            />
            <FeaturedVODs tournamentId={tournament.id} />
          </div>
        )}
        
        {/* Registration Banner - Only for open tournaments */}
        {tournament.status === "open" && (
          <div className="mb-6">
            <TournamentRegistration
              tournamentId={tournament.id}
              tournament={tournament}
              onRegistrationChange={handleRefresh}
            />
          </div>
        )}
        
        {/* Teams Section - Horizontal Layout */}
        <div className="mb-6">
          <TeamsSection teams={teams} tournament={tournament} />
        </div>
        
        {/* Main Content Area - Tabs */}
        <div className="w-full">
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
    </div>
  );
};

export default TournamentDetail;
