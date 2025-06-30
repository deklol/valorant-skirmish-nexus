
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRankPointsWithFallback } from "@/utils/rankingSystem";

interface PeakRankFallbackAlertProps {
  players: Array<{
    id: string;
    discord_username: string;
    current_rank?: string;
    peak_rank?: string;
    weight_rating?: number;
  }>;
}

const PeakRankFallbackAlert = ({ players }: PeakRankFallbackAlertProps) => {
  // Find players who would use peak rank fallback
  const playersUsingFallback = players.filter(player => {
    const rankResult = getRankPointsWithFallback(player.current_rank || 'Unranked', player.peak_rank);
    return rankResult.usingPeakRank;
  });

  if (playersUsingFallback.length === 0) {
    return null;
  }

  return (
    <Card className="bg-amber-900/20 border-amber-600/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-400 flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Peak Rank Fallback Active
          <Badge className="bg-amber-600 text-white ml-2">
            {playersUsingFallback.length} player{playersUsingFallback.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">
              The following players are currently "Unrated" but their peak rank is being used for balancing:
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {playersUsingFallback.map(player => {
            const rankResult = getRankPointsWithFallback(player.current_rank || 'Unranked', player.peak_rank);
            return (
              <div 
                key={player.id} 
                className="bg-amber-800/30 rounded p-3 border border-amber-600/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    {player.discord_username}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                      {player.current_rank || 'Unrated'}
                    </Badge>
                    <span className="text-amber-300 text-xs">→</span>
                    <Badge className="bg-amber-600 text-white text-xs">
                      Peak: {rankResult.peakRank}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-amber-200 mt-1">
                  Using {rankResult.points} points (peak rank: {rankResult.peakRank})
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="bg-amber-800/20 rounded p-3 border border-amber-600/20">
          <p className="text-xs text-amber-200">
            <strong>Info:</strong> Players who are currently unrated will be balanced using their historical peak rank 
            instead of the default 150 points. This provides more accurate team balancing for players whose ranks 
            have decayed or reset.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeakRankFallbackAlert;
