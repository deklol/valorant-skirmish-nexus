
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface MatchHeaderProps {
  team1Name: string;
  team2Name: string;
  status: string;
  roundNumber: number;
  matchNumber: number;
  tournamentName?: string;
  onBack: () => void;
}

const MatchHeader = ({
  team1Name,
  team2Name,
  status,
  roundNumber,
  matchNumber,
  tournamentName,
  onBack
}: MatchHeaderProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'live':
        return <Badge className="bg-green-600">Live</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="mb-8">
      <Button 
        onClick={onBack} 
        variant="ghost" 
        className="text-slate-300 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {team1Name} vs {team2Name}
          </h1>
          <div className="flex items-center gap-2 text-slate-400">
            {getStatusBadge(status)}
            <span>Round {roundNumber}</span>
            <span>•</span>
            <span>Match #{matchNumber}</span>
            {tournamentName && (
              <>
                <span>•</span>
                <span>{tournamentName}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
