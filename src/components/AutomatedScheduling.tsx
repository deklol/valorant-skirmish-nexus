
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Zap, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AutomatedSchedulingProps {
  tournamentId: string;
  onScheduleCreated: () => void;
}

const AutomatedScheduling = ({ tournamentId, onScheduleCreated }: AutomatedSchedulingProps) => {
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    startTime: '',
    matchDuration: '30', // minutes
    breakBetweenMatches: '10', // minutes
    breakBetweenRounds: '15', // minutes
    simultaneousMatches: '1'
  });
  const { toast } = useToast();

  const generateSchedule = async () => {
    if (!scheduleConfig.startTime) {
      toast({
        title: "Error",
        description: "Please select a start time for the tournament",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get all matches for this tournament
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;

      if (!matches || matches.length === 0) {
        throw new Error('No matches found. Please generate the bracket first.');
      }

      const startTime = new Date(scheduleConfig.startTime);
      const matchDurationMs = parseInt(scheduleConfig.matchDuration) * 60 * 1000;
      const breakBetweenMatchesMs = parseInt(scheduleConfig.breakBetweenMatches) * 60 * 1000;
      const breakBetweenRoundsMs = parseInt(scheduleConfig.breakBetweenRounds) * 60 * 1000;
      const simultaneousMatches = parseInt(scheduleConfig.simultaneousMatches);

      let currentTime = new Date(startTime);
      let currentRound = matches[0]?.round_number;
      let matchesInCurrentSlot = 0;

      const scheduleUpdates = matches.map((match, index) => {
        // Check if we're moving to a new round
        if (match.round_number !== currentRound) {
          currentTime = new Date(currentTime.getTime() + breakBetweenRoundsMs);
          currentRound = match.round_number;
          matchesInCurrentSlot = 0;
        }

        // Check if we need to start a new time slot
        if (matchesInCurrentSlot >= simultaneousMatches) {
          currentTime = new Date(currentTime.getTime() + matchDurationMs + breakBetweenMatchesMs);
          matchesInCurrentSlot = 0;
        }

        const scheduledTime = new Date(currentTime);
        matchesInCurrentSlot++;

        return {
          id: match.id,
          scheduled_time: scheduledTime.toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // Update all matches with their scheduled times
      for (const update of scheduleUpdates) {
        const { error } = await supabase
          .from('matches')
          .update({
            scheduled_time: update.scheduled_time,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Schedule Generated",
        description: `Successfully scheduled ${matches.length} matches starting at ${startTime.toLocaleString()}`,
      });

      onScheduleCreated();
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Automated Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-slate-300 text-sm">
          <p>Automatically schedule all tournament matches based on your preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-slate-300">Tournament Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={scheduleConfig.startTime}
              onChange={(e) => setScheduleConfig(prev => ({ ...prev, startTime: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchDuration" className="text-slate-300">Match Duration (minutes)</Label>
            <Select 
              value={scheduleConfig.matchDuration} 
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, matchDuration: value }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breakBetweenMatches" className="text-slate-300">Break Between Matches (minutes)</Label>
            <Select 
              value={scheduleConfig.breakBetweenMatches} 
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, breakBetweenMatches: value }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breakBetweenRounds" className="text-slate-300">Break Between Rounds (minutes)</Label>
            <Select 
              value={scheduleConfig.breakBetweenRounds} 
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, breakBetweenRounds: value }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="simultaneousMatches" className="text-slate-300">Simultaneous Matches</Label>
            <Select 
              value={scheduleConfig.simultaneousMatches} 
              onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, simultaneousMatches: value }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="1">1 match at a time</SelectItem>
                <SelectItem value="2">2 matches at a time</SelectItem>
                <SelectItem value="3">3 matches at a time</SelectItem>
                <SelectItem value="4">4 matches at a time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={generateSchedule}
          disabled={loading || !scheduleConfig.startTime}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          {loading ? "Generating Schedule..." : "Generate Automatic Schedule"}
        </Button>

        <div className="bg-slate-700 p-3 rounded-lg">
          <div className="text-sm text-slate-400 mb-2">Schedule Preview:</div>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Matches will be scheduled sequentially by round</li>
            <li>• {scheduleConfig.simultaneousMatches} match(es) can run simultaneously</li>
            <li>• {scheduleConfig.matchDuration} minutes allocated per match</li>
            <li>• {scheduleConfig.breakBetweenMatches} minute breaks between matches</li>
            <li>• {scheduleConfig.breakBetweenRounds} minute breaks between rounds</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomatedScheduling;
