
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, UserPlus, Trash2, Users, ArrowRightLeft } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface User {
  id: string;
  discord_username?: string;
  riot_id?: string;
  is_phantom?: boolean;
}

interface Participant {
  id: string; // signup id
  user_id: string;
  users: User;
  is_substitute?: boolean;
}

export default function TournamentMedicManager() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [forceUserId, setForceUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [participantLoading, setParticipantLoading] = useState(false);

  // Load all tournaments for admin dropdown
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (!error) setTournaments(data || []);
    })();
  }, []);

  // Load participants on tournament select
  useEffect(() => {
    if (!selectedId) return;
    setParticipantLoading(true);
    supabase
      .from("tournament_signups")
      .select("id, user_id, is_substitute, users(id, discord_username, riot_id, is_phantom)")
      .eq("tournament_id", selectedId)
      .then(({ data }) => {
        setParticipants(data || []);
      })
      .finally(() => setParticipantLoading(false));
  }, [selectedId, loading]);

  // Load all users for force-adding
  useEffect(() => {
    if (userList.length > 0) return;
    supabase
      .from("users")
      .select("id, discord_username, riot_id, is_phantom")
      .limit(1000)
      .then(({ data }) => setUserList(data || []));
  }, [userList.length]);

  // Force-add user to tournament (by user_id)
  const handleForceAdd = async () => {
    if (!forceUserId || !selectedId) return;
    setLoading(true);

    try {
      // Double-check if user is already in
      if (participants.some(p => p.user_id === forceUserId)) {
        toast({ title: "Already Registered", description: "This user is already in the tournament", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Add to signups table
      const { error } = await supabase.from("tournament_signups").insert({
        tournament_id: selectedId,
        user_id: forceUserId,
        is_checked_in: false,
        is_substitute: false,
      });
      if (error) throw error;
      toast({ title: "User Added", description: "User force-added to tournament" });
      setForceUserId("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Remove participant (by signup id)
  const handleRemoveParticipant = async (signupId: string) => {
    if (!signupId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("tournament_signups").delete().eq("id", signupId);
      if (error) throw error;
      toast({ title: "Removed", description: "Participant removed." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-amber-700/40">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center text-amber-400">
          <ArrowRightLeft className="w-5 h-5" />
          Tournament Medic <span className="text-xs text-amber-300">(Full Admin Override & Emergency Tool)</span>
        </CardTitle>
        <div className="text-xs text-amber-200 mt-2">
          <AlertTriangle className="inline-block w-4 h-4 mr-1" />
          Use with extreme caution.
        </div>
      </CardHeader>
      <CardContent>
        {/* Tournament picker */}
        <div className="mb-4">
          <label className="block text-amber-200 text-xs mb-1">Choose Tournament</label>
          <Select value={selectedId} onValueChange={val => setSelectedId(val)}>
            <SelectTrigger className="bg-slate-800 border-amber-800 text-white">
              <SelectValue placeholder="Select tournament..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 z-50">
              {tournaments.map(t =>
                <SelectItem key={t.id} value={t.id} className="">
                  <span className="font-semibold">{t.name}</span>
                  <Badge className="ml-2 text-xs">{t.status}</Badge>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        {/* Emergency participant control */}
        {selectedId && (
          <>
            <div className="mb-3">
              <label className="block text-amber-200 text-xs mb-2">Force Add Player (by User)</label>
              <div className="flex gap-2">
                <Select value={forceUserId} onValueChange={val => setForceUserId(val)} disabled={loading}>
                  <SelectTrigger className="flex-1 bg-slate-800 border-amber-800 text-white">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 max-h-72 overflow-y-auto z-50">
                    {userList.map(u =>
                      <SelectItem key={u.id} value={u.id}>
                        {u.discord_username || "(no name)"} {u.is_phantom && <span className="text-xs text-pink-300 ml-1">(phantom)</span>}
                        <span className="text-gray-400 ml-2 text-xs">{u.id.slice(0,6)}</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleForceAdd}
                  className="bg-amber-700 text-white px-4"
                  disabled={loading || !forceUserId}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Force Add
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex gap-2 items-center mb-1">
                <Users className="w-4 h-4 text-amber-300" />
                <span className="font-bold text-white text-sm">Participants ({participants.length})</span>
                {participantLoading && <span className="text-xs text-amber-200">Loading...</span>}
              </div>
              <div className="bg-slate-800/80 rounded-lg max-h-60 overflow-y-auto p-2 border border-slate-700">
                {participants.length === 0 && (
                  <div className="text-amber-100 px-2 py-3">No participants yet.</div>
                )}
                {participants.map(p =>
                  <div key={p.id} className="flex items-center gap-2 mb-1">
                    <span className="text-white text-xs">
                      {p.users?.discord_username || "(unnamed)"} <span className="text-slate-400 ml-1">({p.user_id.slice(0,5)})</span>
                      {p.users?.is_phantom && <span className="ml-2 text-pink-300 text-xs">(phantom)</span>}
                      {p.is_substitute && <span className="ml-2 text-lime-300 text-xs">(sub)</span>}
                    </span>
                    <Button
                      onClick={() => handleRemoveParticipant(p.id)}
                      disabled={loading}
                      variant="ghost"
                      size="icon"
                      className="ml-auto hover:bg-rose-900"
                      title="Remove Participant"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

