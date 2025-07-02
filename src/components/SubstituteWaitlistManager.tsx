import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, ArrowUp, Search, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TournamentSubstitute } from "@/types/tournament";

interface SubstituteWaitlistManagerProps {
  tournamentId: string;
  onSubstituteChange?: () => void;
  showAdminTools?: boolean;
}

export default function SubstituteWaitlistManager({ 
  tournamentId, 
  onSubstituteChange,
  showAdminTools = false 
}: SubstituteWaitlistManagerProps) {
  const [substitutes, setSubstitutes] = useState<TournamentSubstitute[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoting, setPromoting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubstitutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select(`
          id,
          tournament_id,
          user_id,
          is_substitute,
          signed_up_at,
          priority,
          available,
          notes,
          users (
            id,
            discord_username,
            current_rank,
            riot_id,
            rank_points
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('is_substitute', true)
        .order('priority', { ascending: true })
        .order('signed_up_at', { ascending: true });

      if (error) throw error;

      const formattedSubstitutes: TournamentSubstitute[] = (data || []).map(sub => ({
        id: sub.id,
        tournament_id: sub.tournament_id,
        user_id: sub.user_id,
        is_substitute: sub.is_substitute,
        signed_up_at: sub.signed_up_at,
        priority: sub.priority || 0,
        available: sub.available ?? true,
        notes: sub.notes,
        user: sub.users ? {
          id: sub.users.id,
          discord_username: sub.users.discord_username,
          current_rank: sub.users.current_rank,
          riot_id: sub.users.riot_id,
          rank_points: sub.users.rank_points
        } : undefined
      }));

      setSubstitutes(formattedSubstitutes);
    } catch (error: any) {
      console.error('Error fetching substitutes:', error);
      toast({
        title: "Error",
        description: "Failed to load substitute players",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutes();
  }, [tournamentId]);

  const promoteSubstitute = async (substituteId: string, userId: string) => {
    setPromoting(substituteId);
    try {
      const { data, error } = await supabase.rpc('promote_substitute_to_player', {
        p_tournament_id: tournamentId,
        p_substitute_user_id: userId
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result?.success) {
        toast({
          title: "Substitute Promoted",
          description: result.message || "Substitute promoted successfully"
        });
        await fetchSubstitutes();
        onSubstituteChange?.();
      } else {
        throw new Error(result?.error || 'Failed to promote substitute');
      }
    } catch (error: any) {
      console.error('Error promoting substitute:', error);
      toast({
        title: "Promotion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPromoting(null);
    }
  };

  const updateSubstitutePriority = async (substituteId: string, newPriority: number) => {
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({ priority: newPriority })
        .eq('id', substituteId);

      if (error) throw error;

      await fetchSubstitutes();
      toast({
        title: "Priority Updated",
        description: "Substitute priority has been updated"
      });
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleSubstituteAvailability = async (substituteId: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({ available: !available })
        .eq('id', substituteId);

      if (error) throw error;

      await fetchSubstitutes();
      toast({
        title: "Availability Updated",
        description: `Substitute marked as ${!available ? 'available' : 'unavailable'}`
      });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredSubstitutes = substitutes.filter(sub => 
    !searchQuery || 
    sub.user?.discord_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.user?.riot_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableSubstitutes = filteredSubstitutes.filter(sub => sub.available);
  const unavailableSubstitutes = filteredSubstitutes.filter(sub => !sub.available);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="text-center py-8">
          <p className="text-slate-400">Loading substitute players...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Substitute/Waitlist Players ({substitutes.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                {availableSubstitutes.length} Available
              </Badge>
              {unavailableSubstitutes.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                  {unavailableSubstitutes.length} Unavailable
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search substitutes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Available Substitutes */}
          {availableSubstitutes.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                Available Substitutes
              </h4>
              <div className="space-y-2">
                {availableSubstitutes.map((substitute, index) => (
                  <div key={substitute.id} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        #{substitute.priority || index + 1}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {substitute.user?.discord_username || 'Unknown User'}
                          </span>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-xs">
                            {substitute.user?.current_rank || 'Unranked'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">
                          {substitute.user?.riot_id && `Riot ID: ${substitute.user.riot_id} • `}
                          Joined: {new Date(substitute.signed_up_at).toLocaleDateString()}
                        </div>
                        {substitute.notes && (
                          <div className="text-xs text-slate-500 mt-1">
                            Note: {substitute.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {showAdminTools && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={substitute.priority?.toString() || "0"}
                          onValueChange={(value) => updateSubstitutePriority(substitute.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-20 bg-slate-700 border-slate-600 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {[0, 1, 2, 3, 4, 5].map(priority => (
                              <SelectItem key={priority} value={priority.toString()}>
                                {priority}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          onClick={() => toggleSubstituteAvailability(substitute.id, substitute.available)}
                          variant="outline"
                          size="sm"
                          className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20"
                        >
                          Mark Unavailable
                        </Button>
                        
                        <Button
                          onClick={() => promoteSubstitute(substitute.id, substitute.user_id)}
                          disabled={promoting === substitute.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {promoting === substitute.id ? 'Promoting...' : 'Promote'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unavailable Substitutes */}
          {unavailableSubstitutes.length > 0 && showAdminTools && (
            <div>
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-400" />
                Unavailable Substitutes
              </h4>
              <div className="space-y-2">
                {unavailableSubstitutes.map((substitute) => (
                  <div key={substitute.id} className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-700 opacity-60">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400">
                        Unavailable
                      </Badge>
                      <div>
                        <span className="text-white font-medium">
                          {substitute.user?.discord_username || 'Unknown User'}
                        </span>
                        <div className="text-xs text-slate-400">
                          {substitute.user?.riot_id && `Riot ID: ${substitute.user.riot_id}`}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => toggleSubstituteAvailability(substitute.id, substitute.available)}
                      variant="outline"
                      size="sm"
                      className="border-green-500/40 text-green-300 hover:bg-green-500/20"
                    >
                      Mark Available
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {substitutes.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No substitute players registered</p>
              <p className="text-slate-500 text-sm mt-1">
                Players can join as substitutes when the tournament is full
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}