import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MatchHeader from "@/components/match-details/MatchHeader";
import MatchTabs from "@/components/match-details/MatchTabs";
import { useMatchData } from "@/components/match-details/useMatchData";
import { useTournamentPageTracking } from "@/hooks/useAnalytics";

const MatchDetails = () => {
  // React Router
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Auth and Toast
  const { user } = useAuth();
  const { toast } = useToast();

  // Defensive: null/undefined id check
  useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "No match ID provided in URL.",
        variant: "destructive",
      });
      navigate(-1);
    }
  }, [id, toast, navigate]);

  // Main data hook
  const {
    match,
    userTeamId,
    loading,
    isAdmin,
    fetchMatch
  } = useMatchData(id, user?.id);

  // Track tournament page views
  useTournamentPageTracking(match?.tournament_id);

  // Debug info available in console if needed

  // On Score Report, refetch + toast.
  const handleScoreSubmitted = () => {
    if (fetchMatch) fetchMatch();
    toast({
      title: "Score Reported",
      description: "Match score has been submitted and tournament updated",
    });
  };

  // Loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white text-lg">Loading match details...</p>
        </div>
      </div>
    );
  }

  // Defensive: If match is null after loading, show "not found" error
  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-white text-lg">Match not found</p>
          <Button
            onClick={() => navigate(-1)}
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Defensive: validate required match properties
  const team1Name = match.team1 && match.team1.name ? match.team1.name : "TBD";
  const team2Name = match.team2 && match.team2.name ? match.team2.name : "TBD";
  const roundNumber = typeof match.round_number === "number" ? match.round_number : 1;
  const matchNumber = typeof match.match_number === "number" ? match.match_number : 1;
  const status = typeof match.status === "string" ? match.status : "pending";
  const tournamentName = match.tournament && match.tournament.name ? match.tournament.name : undefined;

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <MatchHeader
          team1Name={team1Name}
          team2Name={team2Name}
          status={status}
          roundNumber={roundNumber}
          matchNumber={matchNumber}
          tournamentName={tournamentName}
          onBack={() => navigate(-1)}
        />
        <MatchTabs
          match={match}
          userTeamId={userTeamId}
          isAdmin={isAdmin}
          onScoreSubmitted={handleScoreSubmitted}
        />
      </div>
    </div>
  );
};

export default MatchDetails;
