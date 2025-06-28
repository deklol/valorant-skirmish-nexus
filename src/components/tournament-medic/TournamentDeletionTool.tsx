
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Shield, BarChart3 } from "lucide-react";
import { previewTournamentDeletion, safeDeleteTournament, validateTournamentDeletion, TournamentDeletionPreview } from "@/utils/tournamentDeletion";
import { Tournament } from "@/types/tournament";

interface TournamentDeletionToolProps {
  tournament: Tournament;
  onTournamentDeleted: () => void;
}

export default function TournamentDeletionTool({ tournament, onTournamentDeleted }: TournamentDeletionToolProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<TournamentDeletionPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handlePreviewDeletion = async () => {
    setIsLoading(true);
    try {
      const deletionPreview = await previewTournamentDeletion(tournament.id);
      setPreview(deletionPreview);
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to preview tournament deletion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    setIsLoading(true);
    try {
      const validation = await validateTournamentDeletion(tournament.id);
      
      if (!validation.canDelete) {
        toast({
          title: "Cannot Delete Tournament",
          description: validation.reasons.join('. '),
          variant: "destructive",
        });
        return;
      }

      const result = await safeDeleteTournament(tournament.id);
      
      if (result.success) {
        toast({
          title: "Tournament Deleted Successfully",
          description: `${result.tournament_name} and all related data have been safely removed. Statistics have been reversed for ${result.statistics_reversed?.participants_tournaments_played_decremented || 0} participants.`,
        });
        onTournamentDeleted();
      } else {
        toast({
          title: "Deletion Failed",
          description: result.error || "Failed to delete tournament safely",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Deletion Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowPreview(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-blue-500/20 text-blue-300';
      case 'archived': return 'bg-slate-500/20 text-slate-300';
      case 'draft': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-red-500/20 text-red-300';
    }
  };

  return (
    <Card className="bg-red-900/10 border-red-700/30">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Dangerous Zone: Tournament Deletion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium">Warning</span>
            </div>
            <p className="text-amber-200 text-sm">
              This will permanently delete the tournament and ALL related data including:
            </p>
            <ul className="text-amber-200 text-xs mt-2 ml-4 space-y-1">
              <li>• All matches and bracket data</li>
              <li>• Map veto sessions and actions</li>
              <li>• Team assignments and signups</li>
              <li>• Match results and submissions</li>
              <li>• Player statistics will be reversed</li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(tournament.status)}>
                {tournament.status.toUpperCase()}
              </Badge>
              <span className="text-slate-300 text-sm">{tournament.name}</span>
            </div>
          </div>

          <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
            <AlertDialogTrigger asChild>
              <Button
                onClick={handlePreviewDeletion}
                disabled={isLoading}
                variant="outline"
                className="border-red-600/40 text-red-300 hover:bg-red-900/20"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {isLoading ? 'Loading Preview...' : 'Preview Deletion'}
              </Button>
            </AlertDialogTrigger>
            
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Tournament Deletion Preview
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    {preview && (
                      <>
                        <div className="bg-slate-900/50 rounded p-3">
                          <h4 className="font-medium text-white mb-2">Tournament: {preview.tournament_name}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">Status:</span>
                              <Badge className={`ml-2 ${getStatusColor(preview.tournament_status)}`}>
                                {preview.tournament_status}
                              </Badge>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Participants:</span> {preview.total_participants}
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Teams:</span> {preview.total_teams}
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Matches:</span> {preview.total_matches}
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400">Veto Sessions:</span> {preview.veto_sessions}
                            </div>
                          </div>
                        </div>

                        {!preview.can_delete && preview.deletion_restrictions && (
                          <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
                            <div className="text-red-400 font-medium mb-2">Cannot Delete:</div>
                            <ul className="text-red-300 text-sm space-y-1">
                              {preview.deletion_restrictions.map((restriction, idx) => (
                                <li key={idx}>• {restriction}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {preview.can_delete && (
                          <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                            <div className="text-green-400 font-medium mb-2">Safe to Delete:</div>
                            <p className="text-green-300 text-sm">
                              This tournament can be safely deleted. All player statistics will be properly reversed.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 hover:bg-slate-600 text-white">
                  Cancel
                </AlertDialogCancel>
                {preview?.can_delete && (
                  <AlertDialogAction
                    onClick={handleConfirmDeletion}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isLoading ? 'Deleting...' : 'Confirm Deletion'}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
