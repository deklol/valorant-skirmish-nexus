
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface MatchScoreCardsProps {
  team1Name: string;
  team2Name: string;
  team1Score: number | null;
  team2Score: number | null;
}

const MatchScoreCards = ({
  team1Name,
  team2Name,
  team1Score,
  team2Score
}: MatchScoreCardsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team 1: {team1Name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">
              {team1Score || 0}
            </div>
            <div className="text-slate-400">Score</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team 2: {team2Name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">
              {team2Score || 0}
            </div>
            <div className="text-slate-400">Score</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchScoreCards;
