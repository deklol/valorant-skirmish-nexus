import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Play, Square, Archive, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TournamentStatusManagerProps {
  tournamentId: string;
  currentStatus: string;
  onStatusChange: () => void;
}

const TournamentStatusManager = ({ tournamentId, currentStatus, onStatusChange }: TournamentStatusManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const { toast } = useToast();

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400', description: 'Tournament being prepared' },
    { value: 'open', label: 'Open', color: 'bg-green-500/20 text-green-400', description: 'Registration is open' },
    { value: 'balancing', label: 'Balancing', color: 'bg-yellow-500/20 text-yellow-400', description: 'Teams being balanced' },
    { value: 'live', label: 'Live', color: 'bg-red-500/20 text-red-400', description: 'Tournament in progress' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-500/20 text-blue-400', description: 'Tournament finished' },
    { value: 'archived', label: 'Archived', color: 'bg-slate-500/20 text-slate-400', description: 'Tournament archived' }
  ];

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0];
  };

  const getNextValidStatuses = () => {
    const transitions: Record<string, string[]> = {
      'draft': ['open'],
      'open': ['balancing', 'archived'],
      'balancing': ['live', 'open'],
      'live': ['completed'],
      'completed': ['archived'],
      'archived': []
    };

    return transitions[currentStatus] || [];
  };

  const updateTournamentStatus = async () => {
    if (newStatus === currentStatus) return;

    setLoading(true);

    try {
      const updateData: any = { status: newStatus };

      // Add timestamps for certain status changes
      if (newStatus === 'live') {
        updateData.start_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Tournament status changed to ${newStatus}`,
      });

      onStatusChange();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusActions = () => {
    switch (currentStatus) {
      case 'draft':
        return [
          {
            action: 'open',
            label: 'Open Registration',
            icon: <Play className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700'
          }
        ];
      case 'open':
        return [
          {
            action: 'balancing',
            label: 'Start Balancing',
            icon: <Edit className="w-4 h-4" />,
            color: 'bg-yellow-600 hover:bg-yellow-700'
          }
        ];
      case 'balancing':
        return [
          {
            action: 'live',
            label: 'Start Tournament',
            icon: <Play className="w-4 h-4" />,
            color: 'bg-red-600 hover:bg-red-700'
          }
        ];
      case 'live':
        return [
          {
            action: 'completed',
            label: 'Complete Tournament',
            icon: <Square className="w-4 h-4" />,
            color: 'bg-blue-600 hover:bg-blue-700'
          }
        ];
      case 'completed':
        return [
          {
            action: 'archived',
            label: 'Archive Tournament',
            icon: <Archive className="w-4 h-4" />,
            color: 'bg-slate-600 hover:bg-slate-700'
          }
        ];
      default:
        return [];
    }
  };

  const quickStatusChange = async (status: string) => {
    setNewStatus(status);
    setLoading(true);

    try {
      const updateData: any = { status };

      if (status === 'live') {
        updateData.start_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Tournament status changed to ${status}`,
      });

      onStatusChange();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStatusInfo = getCurrentStatusInfo();
  const validNextStatuses = getNextValidStatuses();
  const statusActions = getStatusActions();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tournament Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Current Status</div>
            <Badge className={currentStatusInfo.color}>
              {currentStatusInfo.label}
            </Badge>
          </div>
          <div className="text-right text-sm text-slate-400">
            {currentStatusInfo.description}
          </div>
        </div>

        {/* Quick Actions */}
        {statusActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Quick Actions</div>
            <div className="flex gap-2">
              {statusActions.map((action) => (
                <Button
                  key={action.action}
                  onClick={() => quickStatusChange(action.action)}
                  disabled={loading}
                  className={action.color}
                  size="sm"
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Status Change */}
        {validNextStatuses.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Manual Status Change</div>
            <div className="flex gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentStatus}>
                    {currentStatusInfo.label} (Current)
                  </SelectItem>
                  {validNextStatuses.map((status) => {
                    const statusInfo = statusOptions.find(opt => opt.value === status);
                    return (
                      <SelectItem key={status} value={status}>
                        {statusInfo?.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                onClick={updateTournamentStatus}
                disabled={loading || newStatus === currentStatus}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        )}

        {currentStatus === 'archived' && (
          <div className="text-center py-4">
            <div className="text-slate-400">This tournament has been archived</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentStatusManager;
