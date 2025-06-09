
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CheckInEnforcementProps {
  tournamentId: string;
  tournamentName: string;
  checkInStartTime: string | null;
  checkInEndTime: string | null;
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
  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'active' | 'closed'>('not_started');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Fetch current check-in status
    const fetchCheckInStatus = async () => {
      try {
        const { data } = await supabase
          .from('tournament_signups')
          .select('is_checked_in')
          .eq('tournament_id', tournamentId)
          .eq('user_id', user.id)
          .single();

        setIsCheckedIn(data?.is_checked_in || false);
      } catch (error) {
        console.error('Error fetching check-in status:', error);
      }
    };

    fetchCheckInStatus();
  }, [user, tournamentId]);

  useEffect(() => {
    // Determine the check-in period status
    const updateCheckInStatus = () => {
      const now = new Date();
      
      if (!checkInStartTime || !checkInEndTime) {
        setCheckInStatus('not_started');
        return;
      }

      const startTime = new Date(checkInStartTime);
      const endTime = new Date(checkInEndTime);

      if (now < startTime) {
        setCheckInStatus('not_started');
        
        // Calculate time until check-in starts
        const timeUntilStart = startTime.getTime() - now.getTime();
        const hours = Math.floor(timeUntilStart / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining(`${hours}h ${minutes}m until check-in opens`);
      } else if (now >= startTime && now <= endTime) {
        setCheckInStatus('active');
        
        // Calculate time until check-in closes
        const timeUntilEnd = endTime.getTime() - now.getTime();
        const hours = Math.floor(timeUntilEnd / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilEnd % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining(`${hours}h ${minutes}m until check-in closes`);
      } else {
        setCheckInStatus('closed');
        setTimeRemaining('Check-in period has ended');
      }
    };

    updateCheckInStatus();
    const interval = setInterval(updateCheckInStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [checkInStartTime, checkInEndTime]);

  const handleCheckIn = async () => {
    if (!user) return;

    try {
      await supabase
        .from('tournament_signups')
        .update({
          is_checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);

      setIsCheckedIn(true);
      
      toast({
        title: "Successfully Checked In",
        description: `You're all set for ${tournamentName}!`,
        variant: "default",
      });
      
      onCheckInChange();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: "Unable to complete check-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't show anything if check-in isn't required
  if (!checkInRequired) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tournament Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isCheckedIn ? (
              <Badge className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Checked In
              </Badge>
            ) : (
              <Badge className={
                checkInStatus === 'not_started' 
                  ? "bg-slate-600" 
                  : checkInStatus === 'active' 
                    ? "bg-yellow-600" 
                    : "bg-red-600"
              }>
                {checkInStatus === 'not_started' && <HelpCircle className="w-3 h-3 mr-1" />}
                {checkInStatus === 'active' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {checkInStatus === 'closed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {checkInStatus === 'not_started' && "Not Started"}
                {checkInStatus === 'active' && "Check-in Required"}
                {checkInStatus === 'closed' && "Check-in Closed"}
              </Badge>
            )}
            
            <span className="text-sm text-slate-400">
              {timeRemaining}
            </span>
          </div>
          
          {!isCheckedIn && checkInStatus === 'active' && (
            <Button 
              onClick={handleCheckIn}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Check in
            </Button>
          )}
        </div>
        
        {checkInStatus === 'active' && !isCheckedIn && (
          <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Check-in Required</span>
            </div>
            <p className="text-yellow-300 text-sm">
              You must check in to participate in this tournament. 
              Players who don't check in may be removed from the tournament.
            </p>
          </div>
        )}
        
        {checkInStatus === 'closed' && !isCheckedIn && (
          <div className="bg-red-500/20 p-3 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Check-in Period Closed</span>
            </div>
            <p className="text-red-300 text-sm">
              You missed the check-in period and may be removed from the tournament.
              Please contact an administrator for assistance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInEnforcement;
