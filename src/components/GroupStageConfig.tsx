/**
 * Group Stage Configuration Component
 * Allows admins to configure group stage settings when creating/editing tournaments
 */

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Layers } from "lucide-react";
import { validateGroupConfig, GroupStageConfig as GroupConfig } from "@/utils/groupStageGenerator";

interface GroupStageConfigProps {
  teamCount: number;
  config: GroupConfig;
  onChange: (config: GroupConfig) => void;
  disabled?: boolean;
}

export function GroupStageConfig({ teamCount, config, onChange, disabled = false }: GroupStageConfigProps) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  useEffect(() => {
    const result = validateGroupConfig(teamCount, config);
    setValidation(result);
  }, [teamCount, config]);

  const teamsPerGroup = teamCount > 0 ? Math.floor(teamCount / config.groupCount) : 0;
  const extraTeams = teamCount > 0 ? teamCount % config.groupCount : 0;
  const advancingTotal = config.groupCount * config.teamsAdvancePerGroup;

  const handleChange = (field: keyof GroupConfig, value: number | string) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Layers className="h-5 w-5" />
          Group Stage Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Group Count */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Number of Groups</Label>
          <Select
            value={config.groupCount.toString()}
            onValueChange={(v) => handleChange('groupCount', parseInt(v))}
            disabled={disabled}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {[2, 3, 4, 6, 8].map((n) => (
                <SelectItem key={n} value={n.toString()} className="text-popover-foreground">
                  {n} Groups
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {teamCount > 0 && (
            <p className="text-xs text-muted-foreground">
              ~{teamsPerGroup} teams per group{extraTeams > 0 ? ` (+${extraTeams} extra distributed)` : ''}
            </p>
          )}
        </div>

        {/* Group Format */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Group Stage Format</Label>
          <Select
            value={config.groupFormat}
            onValueChange={(v) => handleChange('groupFormat', v)}
            disabled={disabled}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="round_robin" className="text-popover-foreground">
                Round Robin (each team plays all others)
              </SelectItem>
              <SelectItem value="swiss" className="text-popover-foreground">
                Swiss (points-based pairing)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Teams Advancing */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Teams Advancing Per Group</Label>
          <Select
            value={config.teamsAdvancePerGroup.toString()}
            onValueChange={(v) => handleChange('teamsAdvancePerGroup', parseInt(v))}
            disabled={disabled}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {[1, 2, 3, 4].map((n) => (
                <SelectItem 
                  key={n} 
                  value={n.toString()} 
                  className="text-popover-foreground"
                  disabled={teamsPerGroup > 0 && n > teamsPerGroup}
                >
                  Top {n} {n === 1 ? 'team' : 'teams'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              Total teams:
            </span>
            <Badge variant="secondary">{teamCount || '?'}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Advancing to knockout:
            </span>
            <Badge variant="secondary">{teamCount > 0 ? advancingTotal : '?'}</Badge>
          </div>
        </div>

        {/* Validation Error */}
        {!validation.valid && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">{validation.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GroupStageConfig;
