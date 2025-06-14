
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MatchHeader from "@/components/match-details/MatchHeader";
import MatchTabs from "@/components/match-details/MatchTabs";
import { useMatchData } from "@/components/match-details/useMatchData";

// Notes for maintainers:
// - This page relies on useMatchData to fetch all required info
// - Tournament info is only shown if included in match
// - All null/undefined access is guarded, minimal assumptions made

const MatchDetails = () => {
  // Params & navigation
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Auth & Toast
  const { user } = useAuth();
  const { toast } = useToast();

  // Data hook (robustly guards against undefined id/user)
  const {
    match,
    userTeamId,
    loading,
    isAdmin,
    fetchMatch,
  } = useMatchData(id, user?.id);

  // Reasonable handling for all app states:
  useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "No match ID provided in URL.",
        variant: "destructive",
      });
      navigate(-1);
    }
  }, [id, navigate, toast]);

  // Score reported handler
  const handleScoreSubmitted = () => {
    fetchMatch && fetchMatch();
    toast({
      title: "Score Reported",
      description: "Match score has been submitted and tournament updated",
    });
  };

  // Teams rebalanced handler
  const handleTeamsRebalanced = () => {
    fetchMatch && fetchMatch();
    toast({
      title: "Teams Updated",
      description: "Match teams have been rebalanced",
    });
  };

  // Loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading match details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error UI for missing match (null)
  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
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
      </div>
    );
  }

  // Standard match details UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <MatchHeader
          team1Name={match.team1?.name || "TBD"}
          team2Name={match.team2?.name || "TBD"}
          status={match.status}
          roundNumber={match.round_number}
          matchNumber={match.match_number}
          tournamentName={match.tournament?.name}
          onBack={() => navigate(-1)}
        />
        <MatchTabs
          match={match}
          userTeamId={userTeamId}
          isAdmin={isAdmin}
          onScoreSubmitted={handleScoreSubmitted}
          onTeamsRebalanced={handleTeamsRebalanced}
        />
      </div>
    </div>
  );
};

export default MatchDetails;

