
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, Info, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateTournamentHealth, getHealthSummary, TournamentHealthReport } from "@/utils/tournamentHealthValidator";
import { performEmergencyReset, getResetDescription, EmergencyResetOptions } from "@/utils/tournamentEmergencyReset";

interface TournamentHealthDashboardProps {
  tournamentId: string;
  onHealthChange?: () => void;
}

export default function TournamentHealthDashboard({ 
  tournamentId, 
  onHealthChange 
}: TournamentHealthDashboardProps) {
  const [healthReport, setHealthReport] = useState<TournamentHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);
  const [resetOptions, setResetOptions] = useState<EmergencyResetOptions>({
    resetTeams: false,
    resetMatches: false,
    resetSignups: false,
    resetStatus: false,
    targetStatus: 'draft'
  });
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const report = await validateTournamentHealth(tournamentId);
      setHealthReport(report);
    } catch (error: any) {
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, [tournamentId]);

  const handleEmergencyReset = async () => {
    setResetting(true);
    try {
      const result = await performEmergencyReset(tournamentId, resetOptions);
      
      if (result.success) {
        toast({
          title: "Emergency Reset Complete",
          description: result.message
        });
        setShowEmergencyReset(false);
        onHealthChange?.();
        runHealthCheck();
      } else {
        toast({
          title: "Emergency Reset Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Emergency Reset Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getIssueBadgeColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Tournament Health Status
            </CardTitle>
            <Button
              onClick={runHealthCheck}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Check Health
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthReport ? (
            <>
              <div className="flex items-center gap-4">
                <Badge className={
                  healthReport.isHealthy 
                    ? 'bg-green-500/20 text-green-400 border-green-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }>
                  {getHealthSummary(healthReport)}
                </Badge>
                
                <div className="flex gap-2 text-sm">
                  <span className={`px-2 py-1 rounded ${
                    healthReport.canGoLive 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    Can Go Live: {healthReport.canGoLive ? 'Yes' : 'No'}
                  </span>
                  
                  <span className={`px-2 py-1 rounded ${
                    healthReport.canComplete 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    Can Complete: {healthReport.canComplete ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {healthReport.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-medium">Issues Detected:</h4>
                  {healthReport.issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-slate-900 rounded border border-slate-700">
                      {getIssueIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getIssueBadgeColor(issue.severity)}>
                            {issue.category}
                          </Badge>
                          <Badge variant="outline" className={getIssueBadgeColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-sm mt-1">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!healthReport.isHealthy && (
                <div className="pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => setShowEmergencyReset(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Emergency Reset
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">
              {loading ? 'Running health check...' : 'Click "Check Health" to validate tournament'}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showEmergencyReset} onOpenChange={setShowEmergencyReset}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-400" />
              Emergency Tournament Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This is a powerful recovery tool for tournaments stuck in invalid states. 
              Please select what data to reset:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resetTeams"
                  checked={resetOptions.resetTeams}
                  onCheckedChange={(checked) => 
                    setResetOptions(prev => ({ ...prev, resetTeams: !!checked }))
                  }
                />
                <label htmlFor="resetTeams" className="text-white">
                  Reset Teams & Team Members
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resetMatches"
                  checked={resetOptions.resetMatches}
                  onCheckedChange={(checked) => 
                    setResetOptions(prev => ({ ...prev, resetMatches: !!checked }))
                  }
                />
                <label htmlFor="resetMatches" className="text-white">
                  Reset Matches & Bracket
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resetSignups"
                  checked={resetOptions.resetSignups}
                  onCheckedChange={(checked) => 
                    setResetOptions(prev => ({ ...prev, resetSignups: !!checked }))
                  }
                />
                <label htmlFor="resetSignups" className="text-white">
                  Reset Player Signups (⚠️ Removes all registrations)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="resetStatus"
                  checked={resetOptions.resetStatus}
                  onCheckedChange={(checked) => 
                    setResetOptions(prev => ({ ...prev, resetStatus: !!checked }))
                  }
                />
                <label htmlFor="resetStatus" className="text-white">
                  Reset Tournament Status
                </label>
              </div>
              
              {resetOptions.resetStatus && (
                <div className="ml-6">
                  <Select 
                    value={resetOptions.targetStatus} 
                    onValueChange={(value: 'draft' | 'open') => 
                      setResetOptions(prev => ({ ...prev, targetStatus: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <p className="text-yellow-400 text-sm">
                <strong>Warning:</strong> {getResetDescription(resetOptions)}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmergencyReset}
              className="bg-red-600 hover:bg-red-700"
              disabled={resetting || Object.values(resetOptions).every(v => !v)}
            >
              {resetting ? "Resetting..." : "Confirm Emergency Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
