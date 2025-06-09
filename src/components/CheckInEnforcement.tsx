
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CheckInDialog from "./CheckInDialog";

interface CheckInEnforcementProps {
  tournamentId: string;
  tournamentName: string;
  checkInStartTime: string;
  checkInEndTime: string;
  checkInRequired: boolean;
  onCheckInChange: () => void;
}

const CheckInEnforcement = ({ 
  tournamentId, 
  tournamentName, 
  checkInStartTime, 
  checkInEndTime, 
  checkInRequired,
  onCheckInChange 
}: CheckInEnforcementProps) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkUserCheckInStatus();
    }
  }, [user, tournamentId]);

  const checkUserCheckInStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select('is_checked_in')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsCheckedIn(data?.is_checked_in || false);
    } catch (error) {
      console.error('Error checking check-in status:', error);
    }
  };

  const isCheckInOpen = () => {
    const now = new Date();
    const startTime = new Date(checkInStartTime);
    const endTime = new Date(checkInEndTime);
    return now >= startTime && now <= endTime;
  };

  const getCheckInStatus = () => {
    const now = new Date();
    const startTime = new Date(checkInStartTime);
    const endTime = new Date(checkInEndTime);

    if (now < startTime) return 'not_started';
    if (now > endTime) return 'ended';
    return 'open';
  };

  const handleCheckInComplete = () => {
    setIsCheckedIn(true);
    onCheckInChange();
    toast({
      title: "Check-in Successful",
      description: "You have successfully checked in to the tournament",
    });
  };

  if (!checkInRequired) return null;

  const status = getCheckInStatus();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tournament Check-in
          {isCheckedIn && (
            <Badge className="bg-green-500/20 text-green-400 ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Checked In
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-300">
            <div className="font-medium">{tournamentName}</div>
            <div className="text-sm text-slate-400">
              Check-in: {new Date(checkInStartTime).toLocaleString()} - {new Date(checkInEndTime).toLocaleString()}
            </div>
          </div>
          
          <div className="text-right">
            {status === 'not_started' && (
              <Badge className="bg-yellow-500/20 text-yellow-400">
                Not Started
              </Badge>
            )}
            {status === 'open' && (
              <Badge className="bg-green-500/20 text-green-400">
                Open
              </Badge>
            )}
            {status === 'ended' && (
              <Badge className="bg-red-500/20 text-red-400">
                Ended
              </Badge>
            )}
          </div>
        </div>

        {!isCheckedIn && status === 'open' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>You must check in to participate in this tournament</span>
            </div>
            <CheckInDialog
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              checkInStartTime={checkInStartTime}
              checkInEndTime={checkInEndTime}
              onCheckInComplete={handleCheckInComplete}
            />
          </div>
        )}

        {!isCheckedIn && status === 'ended' && (
          <div className="text-center text-red-400">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p>Check-in period has ended. You cannot participate in this tournament.</p>
          </div>
        )}

        {isCheckedIn && (
          <div className="text-center text-green-400">
            <CheckCircle className="w-6 h-6 mx-auto mb-2" />
            <p>You are checked in and ready to participate!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInEnforcement;
