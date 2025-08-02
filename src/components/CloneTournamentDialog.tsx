import React, { useState } from "react";
import { Copy, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CloneTournamentDialogProps {
  tournament: any;
  onTournamentCloned?: () => void;
}

export default function CloneTournamentDialog({ 
  tournament, 
  onTournamentCloned 
}: CloneTournamentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: `${tournament.name} (Copy)`,
    description: tournament.description || "",
    startTime: "",
    startDate: "",
    registrationOpensDate: "",
    registrationOpensTime: "",
    registrationClosesDate: "",
    registrationClosesTime: "",
    checkInStartsDate: "",
    checkInStartsTime: "",
    checkInEndsDate: "",
    checkInEndsTime: "",
  });

  // Helper function to format datetime for input fields
  const formatDateTimeForInput = (dateTime: string) => {
    if (!dateTime) return { date: "", time: "" };
    const date = new Date(dateTime);
    return {
      date: format(date, "yyyy-MM-dd"),
      time: format(date, "HH:mm")
    };
  };

  // Initialize form data when dialog opens
  React.useEffect(() => {
    if (open && tournament) {
      const startDateTime = formatDateTimeForInput(tournament.start_time);
      const regOpensDateTime = formatDateTimeForInput(tournament.registration_opens_at);
      const regClosesDateTime = formatDateTimeForInput(tournament.registration_closes_at);
      const checkInStartsDateTime = formatDateTimeForInput(tournament.check_in_starts_at);
      const checkInEndsDateTime = formatDateTimeForInput(tournament.check_in_ends_at);

      setFormData({
        name: `${tournament.name} (Copy)`,
        description: tournament.description || "",
        startDate: startDateTime.date,
        startTime: startDateTime.time,
        registrationOpensDate: regOpensDateTime.date,
        registrationOpensTime: regOpensDateTime.time,
        registrationClosesDate: regClosesDateTime.date,
        registrationClosesTime: regClosesDateTime.time,
        checkInStartsDate: checkInStartsDateTime.date,
        checkInStartsTime: checkInStartsDateTime.time,
        checkInEndsDate: checkInEndsDateTime.date,
        checkInEndsTime: checkInEndsDateTime.time,
      });
    }
  }, [open, tournament]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00.000Z`).toISOString();
  };

  const handleCloneTournament = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must be logged in to clone tournament");
        return;
      }

      // Prepare the new tournament data - copying all settings but not participants
      const newTournamentData = {
        name: formData.name,
        description: formData.description,
        start_time: combineDateTime(formData.startDate, formData.startTime),
        registration_opens_at: combineDateTime(formData.registrationOpensDate, formData.registrationOpensTime),
        registration_closes_at: combineDateTime(formData.registrationClosesDate, formData.registrationClosesTime),
        check_in_starts_at: combineDateTime(formData.checkInStartsDate, formData.checkInStartsTime),
        check_in_ends_at: combineDateTime(formData.checkInEndsDate, formData.checkInEndsTime),
        
        // Copy all the tournament configuration settings
        max_players: tournament.max_players,
        max_teams: tournament.max_teams,
        team_size: tournament.team_size,
        match_format: tournament.match_format,
        final_match_format: tournament.final_match_format,
        semifinal_match_format: tournament.semifinal_match_format,
        bracket_type: tournament.bracket_type,
        check_in_required: tournament.check_in_required,
        enable_map_veto: tournament.enable_map_veto,
        map_veto_required_rounds: tournament.map_veto_required_rounds,
        map_pool: tournament.map_pool,
        registration_type: tournament.registration_type,
        enable_adaptive_weights: tournament.enable_adaptive_weights,
        prize_pool: tournament.prize_pool,
        
        // Set to draft status for new tournament
        status: 'draft' as const,
        created_by: user.id,
      };

      const { data: newTournament, error } = await supabase
        .from('tournaments')
        .insert([newTournamentData])
        .select()
        .single();

      if (error) {
        console.error('Error cloning tournament:', error);
        toast.error(`Failed to clone tournament: ${error.message}`);
        return;
      }

      toast.success(`Tournament cloned successfully! "${newTournament.name}" has been created.`);
      setOpen(false);
      onTournamentCloned?.();
      
    } catch (error: any) {
      console.error('Error cloning tournament:', error);
      toast.error('Failed to clone tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Copy className="w-4 h-4 mr-2" />
          Clone Event
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Clone Tournament</DialogTitle>
          <p className="text-slate-400">
            This will create a new tournament with the same settings as "{tournament.name}". 
            Teams, players, and brackets will NOT be copied.
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Tournament Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter tournament name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter tournament description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Date & Time Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tournament Schedule
            </h3>
            
            {/* Tournament Start Time */}
            <div className="space-y-2">
              <Label className="text-slate-300">Tournament Start Time</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Registration Opens */}
            <div className="space-y-2">
              <Label className="text-slate-300">Registration Opens</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={formData.registrationOpensDate}
                  onChange={(e) => handleInputChange('registrationOpensDate', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  type="time"
                  value={formData.registrationOpensTime}
                  onChange={(e) => handleInputChange('registrationOpensTime', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Registration Closes */}
            <div className="space-y-2">
              <Label className="text-slate-300">Registration Closes</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={formData.registrationClosesDate}
                  onChange={(e) => handleInputChange('registrationClosesDate', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  type="time"
                  value={formData.registrationClosesTime}
                  onChange={(e) => handleInputChange('registrationClosesTime', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Check-in Start */}
            {tournament.check_in_required && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Check-in Starts</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={formData.checkInStartsDate}
                      onChange={(e) => handleInputChange('checkInStartsDate', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Input
                      type="time"
                      value={formData.checkInStartsTime}
                      onChange={(e) => handleInputChange('checkInStartsTime', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Check-in End */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Check-in Ends</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={formData.checkInEndsDate}
                      onChange={(e) => handleInputChange('checkInEndsDate', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Input
                      type="time"
                      value={formData.checkInEndsTime}
                      onChange={(e) => handleInputChange('checkInEndsTime', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Settings Being Copied</h3>
            <div className="bg-slate-700 p-4 rounded-lg space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-300">Max Players: <span className="text-white">{tournament.max_players}</span></p>
                  <p className="text-slate-300">Max Teams: <span className="text-white">{tournament.max_teams}</span></p>
                  <p className="text-slate-300">Team Size: <span className="text-white">{tournament.team_size}</span></p>
                  <p className="text-slate-300">Match Format: <span className="text-white">{tournament.match_format}</span></p>
                </div>
                <div>
                  <p className="text-slate-300">Bracket Type: <span className="text-white">{tournament.bracket_type}</span></p>
                  <p className="text-slate-300">Map Veto: <span className="text-white">{tournament.enable_map_veto ? 'Enabled' : 'Disabled'}</span></p>
                  <p className="text-slate-300">Registration Type: <span className="text-white">{tournament.registration_type}</span></p>
                  <p className="text-slate-300">Prize Pool: <span className="text-white">{tournament.prize_pool || 'None'}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloneTournament}
              disabled={loading || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Cloning..." : "Clone Tournament"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}