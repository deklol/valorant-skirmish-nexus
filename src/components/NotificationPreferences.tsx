
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  new_tournament_posted: boolean;
  tournament_signups_open: boolean;
  tournament_checkin_time: boolean;
  team_assigned: boolean;
  match_assigned: boolean;
  match_ready: boolean;
  post_results: boolean;
}

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_tournament_posted: true,
    tournament_signups_open: true,
    tournament_checkin_time: true,
    team_assigned: true,
    match_assigned: true,
    match_ready: true,
    post_results: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          new_tournament_posted: data.new_tournament_posted,
          tournament_signups_open: data.tournament_signups_open,
          tournament_checkin_time: data.tournament_checkin_time,
          team_assigned: data.team_assigned,
          match_assigned: data.match_assigned,
          match_ready: data.match_ready,
          post_results: data.post_results,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const preferenceLabels = {
    new_tournament_posted: 'New Tournament Posted',
    tournament_signups_open: 'Tournament Sign-ups Open',
    tournament_checkin_time: 'Tournament Check-in Time',
    team_assigned: 'Team Assigned to You',
    match_assigned: 'Match Assigned to Your Team',
    match_ready: 'Match Ready to Start',
    post_results: 'Post Match Results (Captains Only)',
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(preferenceLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key} className="text-slate-300">
              {label}
            </Label>
            <Switch
              id={key}
              checked={preferences[key as keyof NotificationPreferences]}
              onCheckedChange={(value) => 
                handlePreferenceChange(key as keyof NotificationPreferences, value)
              }
            />
          </div>
        ))}
        
        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
