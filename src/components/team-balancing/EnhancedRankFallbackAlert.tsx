
import { AlertTriangle, TrendingUp, Settings, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

interface Player {
  id: string;
  discord_username: string;
  current_rank?: string;
  peak_rank?: string;
  weight_rating?: number;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
}

interface EnhancedRankFallbackAlertProps {
  players: Player[];
}

const EnhancedRankFallbackAlert = ({ players }: EnhancedRankFallbackAlertProps) => {
  // Categorize players by their ranking source
  const playersBySource = {
    manual_override: [] as Array<{ player: Player; result: any }>,
    peak_rank: [] as Array<{ player: Player; result: any }>,
    default: [] as Array<{ player: Player; result: any }>
  };

  players.forEach(player => {
    const rankResult = getRankPointsWithManualOverride(player);
    if (rankResult.source === 'manual_override') {
      playersBySource.manual_override.push({ player, result: rankResult });
    } else if (rankResult.source === 'peak_rank') {
      playersBySource.peak_rank.push({ player, result: rankResult });
    } else if (rankResult.source === 'default') {
      playersBySource.default.push({ player, result: rankResult });
    }
  });

  const hasSpecialCases = playersBySource.manual_override.length > 0 || 
                          playersBySource.peak_rank.length > 0 || 
                          playersBySource.default.length > 0;

  if (!hasSpecialCases) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Manual Override Alert */}
      {playersBySource.manual_override.length > 0 && (
        <Card className="bg-purple-900/20 border-purple-600/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-purple-400 flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" />
              Manual Rank Overrides Active
              <Badge className="bg-purple-600 text-white ml-2">
                {playersBySource.manual_override.length} player{playersBySource.manual_override.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-purple-200">
              <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">
                  The following players have manual rank overrides set by administrators:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {playersBySource.manual_override.map(({ player, result }) => (
                <div 
                  key={player.id} 
                  className="bg-purple-800/30 rounded p-3 border border-purple-600/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {player.discord_username}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                        {player.current_rank || 'Unrated'}
                      </Badge>
                      <span className="text-purple-300 text-xs">→</span>
                      <Badge className="bg-purple-600 text-white text-xs">
                        Override: {result.rank}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-purple-200 mt-1">
                    Using {result.points} points • {result.overrideReason || 'No reason specified'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peak Rank Fallback Alert */}
      {playersBySource.peak_rank.length > 0 && (
        <Card className="bg-amber-900/20 border-amber-600/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-400 flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Peak Rank Fallback Active
              <Badge className="bg-amber-600 text-white ml-2">
                {playersBySource.peak_rank.length} player{playersBySource.peak_rank.length !== 1 ? 's' : ''}
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
              {playersBySource.peak_rank.map(({ player, result }) => (
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
                        Peak: {result.rank}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-amber-200 mt-1">
                    Using {result.points} points (peak rank: {result.rank})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Fallback Alert */}
      {playersBySource.default.length > 0 && (
        <Card className="bg-slate-800/20 border-slate-600/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-400 flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              Default Rating Applied
              <Badge className="bg-slate-600 text-white ml-2">
                {playersBySource.default.length} player{playersBySource.default.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">
                  The following players have no rank data and are using the default rating:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {playersBySource.default.map(({ player, result }) => (
                <div 
                  key={player.id} 
                  className="bg-slate-700/30 rounded p-3 border border-slate-600/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {player.discord_username}
                    </span>
                    <Badge className="bg-slate-600 text-white text-xs">
                      Default: 150 pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-slate-800/20 rounded p-3 border border-slate-600/20">
        <p className="text-xs text-slate-300">
          <strong>Ranking Priority:</strong> Manual Override → Current Rank → Peak Rank → Default (150 points).
          Manual overrides are set by administrators and take precedence over all other ranking sources.
        </p>
      </div>
    </div>
  );
};

export default EnhancedRankFallbackAlert;
