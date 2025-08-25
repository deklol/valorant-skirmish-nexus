import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tournament } from "@/types/tournament";
import { Save, Plus, X } from "lucide-react";

type User = {
  id: string;
  discord_username: string;
  role: string;
};

type TalentData = {
  id?: string;
  tournament_id: string;
  lead_tournament_admin_id?: string | null;
  tournament_admin_ids?: string[];
  production_lead_id?: string | null;
  production_lead_manual_name?: string | null;
  production_assistant_id?: string | null;
  production_assistant_manual_name?: string | null;
  production_assistant_social_link?: string | null;
  caster_1_id?: string | null;
  caster_1_manual_name?: string | null;  
  caster_1_social_link?: string | null;
  caster_2_id?: string | null;
  caster_2_manual_name?: string | null;
  caster_2_social_link?: string | null;
  observer_id?: string | null;
  observer_manual_name?: string | null;
  observer_social_link?: string | null;
  replay_op_id?: string | null;
  replay_op_manual_name?: string | null;
  replay_op_social_link?: string | null;
};

export default function TournamentMedicTalentTab({
  tournament,
  onRefresh,
}: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [talentData, setTalentData] = useState<TalentData>({
    tournament_id: tournament.id,
    tournament_admin_ids: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch admin users and all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch admin users
        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('id, discord_username, role')
          .eq('role', 'admin')
          .order('discord_username');

        if (adminError) throw adminError;
        setAdminUsers(admins || []);

        // Fetch all users for dropdowns
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, discord_username, role')
          .order('discord_username');

        if (usersError) throw usersError;
        setAllUsers(users || []);

        // Fetch existing talent data
        const { data: existingTalent, error: talentError } = await supabase
          .from('tournament_talent')
          .select('*')
          .eq('tournament_id', tournament.id)
          .single();

        if (talentError && talentError.code !== 'PGRST116') {
          throw talentError;
        }

        if (existingTalent) {
          setTalentData(existingTalent);
        }

      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch data",
          variant: "destructive",
        });
      }
      setLoading(false);
    };

    fetchUsers();
  }, [tournament.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (talentData.id) {
        // Update existing
        const { error } = await supabase
          .from('tournament_talent')
          .update(talentData)
          .eq('id', talentData.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('tournament_talent')
          .insert(talentData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Talent information saved successfully",
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error saving talent data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save talent data",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const addTournamentAdmin = () => {
    if ((talentData.tournament_admin_ids?.length || 0) < 5) {
      setTalentData(prev => ({
        ...prev,
        tournament_admin_ids: [...(prev.tournament_admin_ids || []), ''],
      }));
    }
  };

  const removeTournamentAdmin = (index: number) => {
    setTalentData(prev => ({
      ...prev,
      tournament_admin_ids: prev.tournament_admin_ids?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateTournamentAdmin = (index: number, value: string) => {
    setTalentData(prev => ({
      ...prev,
      tournament_admin_ids: prev.tournament_admin_ids?.map((id, i) => i === index ? value : id) || [],
    }));
  };

  if (loading) {
    return <div className="text-white">Loading talent information...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/90 border-slate-700 p-6">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tournament Staff & Talent</h3>

          {/* Lead Tournament Admin */}
          <div className="space-y-2">
            <Label className="text-white">Lead Tournament Admin</Label>
            <Select 
              value={talentData.lead_tournament_admin_id || ""} 
              onValueChange={(value) => setTalentData(prev => ({ ...prev, lead_tournament_admin_id: value || null }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select lead admin..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="">None</SelectItem>
                {adminUsers.map(user => (
                  <SelectItem key={user.id} value={user.id} className="text-white">
                    {user.discord_username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tournament Admins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white">Tournament Admins (up to 5)</Label>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addTournamentAdmin}
                disabled={(talentData.tournament_admin_ids?.length || 0) >= 5}
                className="border-slate-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Admin
              </Button>
            </div>
            {talentData.tournament_admin_ids?.map((adminId, index) => (
              <div key={index} className="flex gap-2">
                <Select 
                  value={adminId} 
                  onValueChange={(value) => updateTournamentAdmin(index, value)}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white flex-1">
                    <SelectValue placeholder="Select admin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {adminUsers.map(user => (
                      <SelectItem key={user.id} value={user.id} className="text-white">
                        {user.discord_username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => removeTournamentAdmin(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Production Lead */}
          <div className="space-y-2">
            <Label className="text-white">Production Lead</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select 
                value={talentData.production_lead_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, production_lead_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter manual name..."
                value={talentData.production_lead_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, production_lead_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Production Assistant */}
          <div className="space-y-2">
            <Label className="text-white">Production Assistant</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select 
                value={talentData.production_assistant_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, production_assistant_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manual name..."
                value={talentData.production_assistant_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, production_assistant_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                placeholder="Social/Twitter link..."
                value={talentData.production_assistant_social_link || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, production_assistant_social_link: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Caster 1 */}
          <div className="space-y-2">
            <Label className="text-white">Caster 1</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select 
                value={talentData.caster_1_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, caster_1_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manual name..."
                value={talentData.caster_1_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, caster_1_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                placeholder="Social/Twitter link..."
                value={talentData.caster_1_social_link || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, caster_1_social_link: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Caster 2 */}
          <div className="space-y-2">
            <Label className="text-white">Caster 2</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select 
                value={talentData.caster_2_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, caster_2_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manual name..."
                value={talentData.caster_2_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, caster_2_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                placeholder="Social/Twitter link..."
                value={talentData.caster_2_social_link || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, caster_2_social_link: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Observer */}
          <div className="space-y-2">
            <Label className="text-white">Observer</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select 
                value={talentData.observer_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, observer_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manual name..."
                value={talentData.observer_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, observer_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                placeholder="Social/Twitter link..."
                value={talentData.observer_social_link || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, observer_social_link: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Replay Op */}
          <div className="space-y-2">
            <Label className="text-white">Replay Op</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select 
                value={talentData.replay_op_id || ""} 
                onValueChange={(value) => setTalentData(prev => ({ ...prev, replay_op_id: value || null }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id} className="text-white">
                      {user.discord_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or manual name..."
                value={talentData.replay_op_manual_name || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, replay_op_manual_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Input
                placeholder="Social/Twitter link..."
                value={talentData.replay_op_social_link || ""}
                onChange={(e) => setTalentData(prev => ({ ...prev, replay_op_social_link: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Talent Information"}
          </Button>
        </div>
      </Card>
    </div>
  );
}