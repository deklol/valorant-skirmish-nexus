import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { UserX, Ban, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamManagementToolsProps {
  tournamentId: string;
  teams: Array<{ id: string; name: string; status: string }>;
  matches: Array<{ id: string; round_number: number; match_number: number; team1_id: string | null; team2_id: string | null; status: string }>;
  onUpdate: () => void;
  loading: boolean;
}

export default function TeamManagementTools({ 
  tournamentId, 
  teams, 
  matches, 
  onUpdate, 
  loading 
}: TeamManagementToolsProps) {
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [dqReason, setDqReason] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [manualAdvanceTeam, setManualAdvanceTeam] = useState<string>("");
  const [targetRound, setTargetRound] = useState<number>(1);
  const [targetMatch, setTargetMatch] = useState<number>(1);
  const [advanceReason, setAdvanceReason] = useState("");
  const [showDqConfirm, setShowDqConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);

  const activeTeams = teams.filter(team => !['eliminated', 'disqualified', 'withdrawn'].includes(team.status));
  const maxRound = Math.max(...matches.map(m => m.round_number), 1);

  const handleDisqualifyTeam = async () => {
    if (!selectedTeamId || !dqReason.trim()) return;

    try {
      const { data, error } = await supabase.rpc('disqualify_team', {
        p_team_id: selectedTeamId,
        p_reason: dqReason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Team Disqualified",
          description: `${result.team_name} has been disqualified. ${result.matches_forfeited} matches forfeited, ${result.opponents_advanced} opponents advanced.`,
        });
        onUpdate();
        setSelectedTeamId("");
        setDqReason("");
        setShowDqConfirm(false);
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Disqualification Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleWithdrawTeam = async () => {
    if (!selectedTeamId || !withdrawReason.trim()) return;

    try {
      const { data, error } = await supabase.rpc('withdraw_team', {
        p_team_id: selectedTeamId,
        p_reason: withdrawReason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Team Withdrawn",
          description: `${result.team_name} has withdrawn. ${result.matches_forfeited} matches forfeited, ${result.opponents_advanced} opponents advanced.`,
        });
        onUpdate();
        setSelectedTeamId("");
        setWithdrawReason("");
        setShowWithdrawConfirm(false);
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Withdrawal Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManualAdvance = async () => {
    if (!manualAdvanceTeam || !targetRound || !targetMatch || !advanceReason.trim()) return;

    try {
      const { data, error } = await supabase.rpc('manually_advance_team', {
        p_team_id: manualAdvanceTeam,
        p_to_round: targetRound,
        p_to_match_number: targetMatch,
        p_reason: advanceReason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Team Advanced",
          description: `${result.team_name} manually advanced to ${result.advanced_to} in slot ${result.slot_filled}.`,
        });
        onUpdate();
        setManualAdvanceTeam("");
        setTargetRound(1);
        setTargetMatch(1);
        setAdvanceReason("");
        setShowAdvanceConfirm(false);
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Manual Advance Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSelectedTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown Team';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Team Management Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Disqualify Team */}
        <div className="border border-red-600/30 bg-red-950/20 rounded-lg p-4">
          <h3 className="text-red-400 font-medium mb-3 flex items-center gap-2">
            <Ban className="w-4 h-4" />
            Disqualify Team
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose team to disqualify..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {activeTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Reason</Label>
              <Textarea
                value={dqReason}
                onChange={(e) => setDqReason(e.target.value)}
                placeholder="Enter disqualification reason..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <AlertDialog open={showDqConfirm} onOpenChange={setShowDqConfirm}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!selectedTeamId || !dqReason.trim() || loading}
                  className="w-full"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Disqualify Team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Confirm Team Disqualification</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    You are about to disqualify "{getSelectedTeamName(selectedTeamId)}" from the tournament.
                    This will automatically forfeit all their pending/live matches and advance their opponents.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDisqualifyTeam}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Disqualify Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Withdraw Team */}
        <div className="border border-yellow-600/30 bg-yellow-950/20 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Withdraw Team
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose team to withdraw..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {activeTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Reason</Label>
              <Textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Enter withdrawal reason..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!selectedTeamId || !withdrawReason.trim() || loading}
                  className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-950/30"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Withdraw Team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Confirm Team Withdrawal</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    You are about to withdraw "{getSelectedTeamName(selectedTeamId)}" from the tournament.
                    This will forfeit all their future matches and advance their opponents.
                    Completed matches will remain unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleWithdrawTeam}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Withdraw Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Manual Advance */}
        <div className="border border-blue-600/30 bg-blue-950/20 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Manual Team Advancement
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Select Team</Label>
              <Select value={manualAdvanceTeam} onValueChange={setManualAdvanceTeam}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose team to advance..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {activeTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Target Round</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxRound}
                  value={targetRound}
                  onChange={(e) => setTargetRound(parseInt(e.target.value) || 1)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Target Match</Label>
                <Input
                  type="number"
                  min="1"
                  value={targetMatch}
                  onChange={(e) => setTargetMatch(parseInt(e.target.value) || 1)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Reason</Label>
              <Textarea
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                placeholder="Enter advancement reason..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <AlertDialog open={showAdvanceConfirm} onOpenChange={setShowAdvanceConfirm}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!manualAdvanceTeam || !targetRound || !targetMatch || !advanceReason.trim() || loading}
                  className="w-full border-blue-600 text-blue-400 hover:bg-blue-950/30"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Advance Team Manually
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Confirm Manual Team Advancement</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    You are about to manually advance "{getSelectedTeamName(manualAdvanceTeam)}" 
                    to Round {targetRound}, Match {targetMatch}.
                    This will place them in the next available slot in that match.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleManualAdvance}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Advance Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          <p>⚠️ These tools modify tournament progression directly. Use with caution.</p>
          <p>• Disqualify: Immediate forfeit, more severe than withdrawal</p>
          <p>• Withdraw: Team chooses to leave, forfeits future matches only</p>
          <p>• Manual Advance: Place team directly into specific match slot</p>
        </div>
      </CardContent>
    </Card>
  );
}