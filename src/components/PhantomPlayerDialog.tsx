
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhantomPlayerDialogProps {
  tournamentId: string;
  onPhantomAdded: () => void;
}

const PhantomPlayerDialog = ({ tournamentId, onPhantomAdded }: PhantomPlayerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(150);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the phantom player",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('phantom_players')
        .insert({
          tournament_id: tournamentId,
          name: name.trim(),
          weight_rating: rating
        });

      if (error) throw error;

      toast({
        title: "Phantom Player Added",
        description: `${name} has been added as a phantom player`,
      });

      setOpen(false);
      setName('');
      setRating(150);
      onPhantomAdded();

    } catch (error: any) {
      console.error('Error adding phantom player:', error);
      toast({
        title: "Error",
        description: "Failed to add phantom player",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Phantom Player
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Phantom Player</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter phantom player name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">Weight Rating</Label>
            <Input
              id="rating"
              type="number"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              min={50}
              max={350}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Phantom Player"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PhantomPlayerDialog;
