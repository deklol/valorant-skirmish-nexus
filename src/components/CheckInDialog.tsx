
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CheckInDialogProps {
  tournamentId: string;
  tournamentName: string;
  checkInStartTime: string;
  checkInEndTime: string;
  onCheckInComplete: () => void;
}

const CheckInDialog = ({ tournamentId, tournamentName, checkInStartTime, checkInEndTime, onCheckInComplete }: CheckInDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckIn = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({
          is_checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Check-in Successful",
        description: "You have successfully checked in to the tournament",
      });

      setOpen(false);
      onCheckInComplete();

    } catch (error: any) {
      console.error('Error during check-in:', error);
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isCheckInOpen = () => {
    const now = new Date();
    const startTime = new Date(checkInStartTime);
    const endTime = new Date(checkInEndTime);
    return now >= startTime && now <= endTime;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="w-4 h-4 mr-2" />
          Check In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tournament Check-in</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-medium">{tournamentName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div className="text-slate-300">
                    <div className="text-sm">Check-in Window</div>
                    <div className="text-xs text-slate-400">
                      {formatDate(checkInStartTime)} - {formatDate(checkInEndTime)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  {isCheckInOpen() ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      Check-in is Open
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400">
                      Check-in is Closed
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-slate-400 space-y-2">
            <p>• Check-in is required to participate in this tournament</p>
            <p>• You must check in during the specified time window</p>
            <p>• Late check-ins will not be accepted</p>
            <p>• Your spot may be given to substitutes if you don't check in</p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckIn}
              disabled={loading || !isCheckInOpen()}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Checking in..." : "Confirm Check-in"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInDialog;
