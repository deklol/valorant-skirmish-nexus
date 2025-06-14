
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MatchHeader from "@/components/match-details/MatchHeader";
import MatchTabs from "@/components/match-details/MatchTabs";
import { useMatchData } from "@/components/match-details/useMatchData";

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { match, userTeamId, loading, isAdmin, fetchMatch } = useMatchData(id, user?.id);

  const handleScoreSubmitted = () => {
    fetchMatch();
    toast({
      title: "Score Reported",
      description: "Match score has been submitted and tournament updated",
    });
  };

  const handleTeamsRebalanced = () => {
    fetchMatch();
    toast({
      title: "Teams Updated",
      description: "Match teams have been rebalanced",
    });
  };

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

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Match not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4 bg-red-600 hover:bg-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <MatchHeader
          team1Name={match.team1?.name || 'TBD'}
          team2Name={match.team2?.name || 'TBD'}
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
