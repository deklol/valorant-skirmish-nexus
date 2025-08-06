
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User } from "lucide-react";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManualRankOverrideSectionProps {
  userData: {
    manual_rank_override?: string | null;
    manual_weight_override?: number | null;
    use_manual_override?: boolean;
    rank_override_reason?: string | null;
    rank_override_set_by?: string | null;
    current_rank?: string | null;
    peak_rank?: string | null;
    weight_rating?: number | null;
  };
  onOverrideChange: (overrideData: {
    manual_rank_override: string | null;
    manual_weight_override: number | null;
    use_manual_override: boolean;
    rank_override_reason: string | null;
  }) => void;
  onPeakRankChange?: (peakRank: string | null) => void;
}

const VALORANT_RANKS = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3',
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant'
];

const ManualRankOverrideSection = ({ userData, onOverrideChange, onPeakRankChange }: ManualRankOverrideSectionProps) => {
  const [useOverride, setUseOverride] = useState(userData.use_manual_override || false);
  const [selectedRank, setSelectedRank] = useState(userData.manual_rank_override || '');
  const [customWeight, setCustomWeight] = useState(userData.manual_weight_override?.toString() || '');
  const [reason, setReason] = useState(userData.rank_override_reason || '');
  const [selectedPeakRank, setSelectedPeakRank] = useState(userData.peak_rank || '');

  const handleOverrideToggle = (enabled: boolean) => {
    setUseOverride(enabled);
    onOverrideChange({
      manual_rank_override: enabled ? selectedRank || null : null,
      manual_weight_override: enabled && customWeight ? parseInt(customWeight) : null,
      use_manual_override: enabled,
      rank_override_reason: enabled ? reason || null : null
    });
  };

  const handleRankChange = (rank: string) => {
    setSelectedRank(rank);
    const autoWeight = RANK_POINT_MAPPING[rank] || 150;
    if (!customWeight || customWeight === userData.manual_weight_override?.toString()) {
      setCustomWeight(autoWeight.toString());
    }
    onOverrideChange({
      manual_rank_override: rank,
      manual_weight_override: customWeight ? parseInt(customWeight) : autoWeight,
      use_manual_override: useOverride,
      rank_override_reason: reason || null
    });
  };

  const handleWeightChange = (weight: string) => {
    setCustomWeight(weight);
    onOverrideChange({
      manual_rank_override: selectedRank || null,
      manual_weight_override: weight ? parseInt(weight) : null,
      use_manual_override: useOverride,
      rank_override_reason: reason || null
    });
  };

  const handleReasonChange = (newReason: string) => {
    setReason(newReason);
    onOverrideChange({
      manual_rank_override: selectedRank || null,
      manual_weight_override: customWeight ? parseInt(customWeight) : null,
      use_manual_override: useOverride,
      rank_override_reason: newReason || null
    });
  };

  const handlePeakRankChange = (peakRank: string) => {
    setSelectedPeakRank(peakRank);
    if (onPeakRankChange) {
      onPeakRankChange(peakRank || null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Peak Rank Section - Always visible */}
      <div className="space-y-4 p-4 border border-blue-600/30 rounded-lg bg-blue-900/10">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-blue-400">Peak Rank Management</h4>
        </div>
        
        <div className="space-y-2">
          <Label className="text-white">Manual Peak Rank</Label>
          <Select value={selectedPeakRank} onValueChange={handlePeakRankChange}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select peak rank..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="" className="text-slate-400 hover:bg-slate-600">
                None / Clear Peak Rank
              </SelectItem>
              {VALORANT_RANKS.map((rank) => (
                <SelectItem key={rank} value={rank} className="text-white hover:bg-slate-600">
                  {rank} ({RANK_POINT_MAPPING[rank] || 150} pts)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-400">
            Set the highest rank this user has ever achieved. This is used for adaptive weight calculations.
          </p>
        </div>
      </div>

      {/* Manual Rank Override Section */}
      <div className="space-y-4 p-4 border border-amber-600/30 rounded-lg bg-amber-900/10">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <h4 className="text-lg font-semibold text-amber-400">Manual Rank Override</h4>
        </div>

        {userData.use_manual_override && (
          <Alert className="border-amber-600/50 bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              This user currently has a manual rank override active.
              {userData.rank_override_reason && (
                <> Reason: "{userData.rank_override_reason}"</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="use-override"
            checked={useOverride}
            onCheckedChange={handleOverrideToggle}
          />
          <Label htmlFor="use-override" className="text-white">
            Use Manual Rank Override
          </Label>
          {useOverride && (
            <Badge className="bg-amber-600 text-white">Override Active</Badge>
          )}
        </div>

        {useOverride && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Override Rank</Label>
                <Select value={selectedRank} onValueChange={handleRankChange}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select rank..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {VALORANT_RANKS.map((rank) => (
                      <SelectItem key={rank} value={rank} className="text-white hover:bg-slate-600">
                        {rank} ({RANK_POINT_MAPPING[rank] || 150} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Custom Weight (Optional)</Label>
                <Input
                  type="number"
                  value={customWeight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Auto-calculated from rank"
                  min="1"
                  max="1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Override Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., Former Radiant player, rank decay, special circumstances..."
                rows={2}
              />
            </div>

            <div className="text-sm text-slate-400 space-y-1">
              <p><strong>Current API Rank:</strong> {userData.current_rank || 'Unranked'} ({userData.weight_rating || 150} pts)</p>
              <p><strong>Peak Rank:</strong> {userData.peak_rank || 'None'}</p>
              <p><strong>Manual Override:</strong> {selectedRank || 'None'} ({customWeight || 'Auto'} pts)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualRankOverrideSection;
