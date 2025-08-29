import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Clock, Award } from "lucide-react";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

interface WeightBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: any;
  tournamentId?: string;
}

export default function WeightBreakdownModal({ 
  open, 
  onOpenChange, 
  player, 
  tournamentId 
}: WeightBreakdownModalProps) {
  if (!player) return null;

  const userData = {
    current_rank: player.users.current_rank,
    peak_rank: player.users.peak_rank,
    manual_rank_override: player.users.manual_rank_override,
    manual_weight_override: player.users.manual_weight_override,
    use_manual_override: player.users.use_manual_override,
    rank_override_reason: player.users.rank_override_reason,
    weight_rating: player.users.weight_rating
  };

  const rankResult = getRankPointsWithManualOverride(userData);
  const adaptiveWeight = (player.users as any).adaptive_weight;
  const peakRankPoints = (player.users as any).peak_rank_points;
  const adaptiveFactor = (player.users as any).adaptive_factor;

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual_override': return 'bg-red-600';
      case 'adaptive_weight': return 'bg-purple-600';
      case 'current_rank': return 'bg-green-600';
      case 'peak_rank': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual_override': return <Award className="w-4 h-4" />;
      case 'adaptive_weight': return <TrendingUp className="w-4 h-4" />;
      case 'current_rank': return <Target className="w-4 h-4" />;
      case 'peak_rank': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Weight Breakdown: {player.users.discord_username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Weight Display */}
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Active Tournament Weight</h3>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {adaptiveWeight || rankResult.points}
              </div>
              <Badge className={`${getSourceColor(adaptiveWeight ? 'adaptive_weight' : rankResult.source)} text-white`}>
                {getSourceIcon(adaptiveWeight ? 'adaptive_weight' : rankResult.source)}
                <span className="ml-2">
                  {adaptiveWeight ? 'Adaptive Weight' : rankResult.source.replace('_', ' ').toUpperCase()}
                </span>
              </Badge>
            </div>
          </Card>

          {/* Weight Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current Rank */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <h4 className="font-semibold">Current Rank</h4>
              </div>
              <div className="text-lg font-bold text-green-400">
                {player.users.current_rank}
              </div>
              <div className="text-sm text-slate-400">
                {player.users.rank_points || 'N/A'} points
              </div>
            </Card>

            {/* Peak Rank */}
            {peakRankPoints && (
              <Card className="bg-slate-800 border-slate-700 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <h4 className="font-semibold">Peak Rank</h4>
                </div>
                <div className="text-lg font-bold text-orange-400">
                  {player.users.peak_rank || 'N/A'}
                </div>
                <div className="text-sm text-slate-400">
                  {peakRankPoints} points
                </div>
              </Card>
            )}
          </div>

          {/* Adaptive Weight Details */}
          {adaptiveWeight && adaptiveFactor && (
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h4 className="font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 text-purple-400 mr-2" />
                Adaptive Weight Calculation
              </h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Peak Rank Points:</span>
                  <span className="font-bold">{peakRankPoints}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Current Rank Points:</span>
                  <span className="font-bold">{player.users.rank_points || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Adaptive Factor:</span>
                  <span className="font-bold text-purple-400">
                    {(adaptiveFactor * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="border-t border-slate-700 pt-2">
                  <Progress 
                    value={adaptiveFactor * 100} 
                    className="h-2"
                  />
                  <div className="text-sm text-slate-400 mt-1">
                    Factor determines blend between current and peak performance
                  </div>
                </div>
                
                <div className="bg-purple-900/30 rounded p-3 mt-4">
                  <div className="text-sm text-purple-200">
                    <strong>Formula:</strong> Peak Points × Factor + Current Points × (1 - Factor)
                  </div>
                  <div className="text-xs text-purple-300 mt-1">
                    {peakRankPoints} × {(adaptiveFactor * 100).toFixed(1)}% + {player.users.rank_points} × {((1 - adaptiveFactor) * 100).toFixed(1)}% = {adaptiveWeight}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Manual Override Warning */}
          {rankResult.source === 'manual_override' && (
            <Card className="bg-red-900/30 border-red-500/50 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="w-5 h-5 text-red-400" />
                <h4 className="font-semibold text-red-400">Manual Override Active</h4>
              </div>
              <div className="text-sm text-red-200">
                This player's weight has been manually set by an administrator.
              </div>
              {rankResult.overrideReason && (
                <div className="text-xs text-red-300 mt-1">
                  Reason: {rankResult.overrideReason}
                </div>
              )}
            </Card>
          )}

          {/* Tournament Context */}
          {tournamentId && (
            <Card className="bg-blue-900/30 border-blue-500/50 p-4">
              <h4 className="font-semibold text-blue-400 mb-2">Tournament Context</h4>
              <div className="text-sm text-blue-200">
                This weight calculation is specific to this tournament and may differ from the player's standard ranking.
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}