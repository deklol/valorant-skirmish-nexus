import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateTournamentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTournamentCreated?: () => void;
}

const CreateTournamentDialog = ({ open, onOpenChange, onTournamentCreated }: CreateTournamentDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prizePool: '',
    maxPlayers: 40,
    maxTeams: 8,
    matchFormat: 'BO1' as 'BO1' | 'BO3',
    bracketType: 'single_elimination',
    registrationOpensAt: new Date(),
    registrationClosesAt: new Date(),
    checkInStartsAt: new Date(),
    checkInEndsAt: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    checkInRequired: true
  });

  const { toast } = useToast();
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description,
          prize_pool: formData.prizePool,
          max_players: formData.maxPlayers,
          max_teams: formData.maxTeams,
          match_format: formData.matchFormat,
          bracket_type: formData.bracketType,
          registration_opens_at: formData.registrationOpensAt.toISOString(),
          registration_closes_at: formData.registrationClosesAt.toISOString(),
          check_in_starts_at: formData.checkInStartsAt.toISOString(),
          check_in_ends_at: formData.checkInEndsAt.toISOString(),
          start_time: formData.startTime.toISOString(),
          end_time: formData.endTime.toISOString(),
          check_in_required: formData.checkInRequired,
          status: 'draft'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Tournament Created",
        description: "Your tournament has been created successfully.",
      });

      setIsOpen(false);
      onTournamentCreated?.();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        prizePool: '',
        maxPlayers: 40,
        maxTeams: 8,
        matchFormat: 'BO1',
        bracketType: 'single_elimination',
        registrationOpensAt: new Date(),
        registrationClosesAt: new Date(),
        checkInStartsAt: new Date(),
        checkInEndsAt: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        checkInRequired: true
      });

    } catch (error: any) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const DateTimePicker = ({ label, value, onChange }: { label: string; value: Date; onChange: (date: Date) => void }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP HH:mm") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => date && onChange(date)}
            initialFocus
          />
          <div className="p-3 border-t">
            <Input
              type="time"
              value={format(value, "HH:mm")}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':');
                const newDate = new Date(value);
                newDate.setHours(parseInt(hours), parseInt(minutes));
                onChange(newDate);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const DialogComponent = (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Tournament</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="TGH Weekly Skirmish #54"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizePool">Prize Pool</Label>
            <Input
              id="prizePool"
              value={formData.prizePool}
              onChange={(e) => handleInputChange('prizePool', e.target.value)}
              placeholder="£50 prize pool"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Tournament description..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Max Players</Label>
            <Input
              id="maxPlayers"
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value))}
              min="2"
              max="200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTeams">Max Teams</Label>
            <Input
              id="maxTeams"
              type="number"
              value={formData.maxTeams}
              onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value))}
              min="2"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <Label>Match Format</Label>
            <Select value={formData.matchFormat} onValueChange={(value: 'BO1' | 'BO3') => handleInputChange('matchFormat', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BO1">Best of 1</SelectItem>
                <SelectItem value="BO3">Best of 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            label="Registration Opens At"
            value={formData.registrationOpensAt}
            onChange={(date) => handleInputChange('registrationOpensAt', date)}
          />
          <DateTimePicker
            label="Registration Closes At"
            value={formData.registrationClosesAt}
            onChange={(date) => handleInputChange('registrationClosesAt', date)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            label="Check-in Starts At"
            value={formData.checkInStartsAt}
            onChange={(date) => handleInputChange('checkInStartsAt', date)}
          />
          <DateTimePicker
            label="Check-in Ends At"
            value={formData.checkInEndsAt}
            onChange={(date) => handleInputChange('checkInEndsAt', date)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            label="Tournament Starts At"
            value={formData.startTime}
            onChange={(date) => handleInputChange('startTime', date)}
          />
          <DateTimePicker
            label="Tournament Ends At"
            value={formData.endTime}
            onChange={(date) => handleInputChange('endTime', date)}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Tournament"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (open !== undefined) {
    // Controlled mode
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {DialogComponent}
      </Dialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Tournament
        </Button>
      </DialogTrigger>
      {DialogComponent}
    </Dialog>
  );
};

export default CreateTournamentDialog;
