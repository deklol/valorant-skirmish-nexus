import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreferences {
  // App notifications
  new_tournament_posted: boolean;
  tournament_signups_open: boolean;
  tournament_checkin_time: boolean;
  team_assigned: boolean;
  match_assigned: boolean;
  match_ready: boolean;
  post_results: boolean;
  
  // Delivery preferences
  push_enabled: boolean;
  email_enabled: boolean;
  email_frequency: string;
}

export default function EnhancedNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_tournament_posted: true,
    tournament_signups_open: true,
    tournament_checkin_time: true,
    team_assigned: true,
    match_assigned: true,
    match_ready: true,
    post_results: true,
    push_enabled: true,
    email_enabled: true,
    email_frequency: 'immediate',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    isLoading: pushLoading,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush 
  } = usePushNotifications();

  const preferenceLabels = {
    new_tournament_posted: 'New Tournament Posted',
    tournament_signups_open: 'Tournament Signups Open',
    tournament_checkin_time: 'Tournament Check-in Time',
    team_assigned: 'Team Assignment',
    match_assigned: 'Match Assignment',
    match_ready: 'Match Ready',
    post_results: 'Post Match Results',
  };

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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences.',
        variant: 'destructive',
      });
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
        title: 'Success',
        description: 'Notification preferences saved successfully.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && !pushSubscribed) {
      await subscribeToPush();
    } else if (!enabled && pushSubscribed) {
      await unsubscribeFromPush();
    }
    handlePreferenceChange('push_enabled', enabled);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Customize how and when you receive notifications about tournaments and matches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div>
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Delivery Methods
          </h4>
          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Instant notifications to your device
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {pushSupported ? (
                      <>
                        <Badge variant={pushSubscribed ? "default" : "secondary"}>
                          {pushSubscribed ? "Active" : "Inactive"}
                        </Badge>
                        {!pushSubscribed && (
                          <Badge variant="outline">Setup Required</Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive">Not Supported</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.push_enabled && pushSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={!pushSupported || pushLoading}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Email alerts for important events
                  </div>
                  {preferences.email_enabled && (
                    <div className="mt-2">
                      <Select
                        value={preferences.email_frequency}
                        onValueChange={(value) => handlePreferenceChange('email_frequency', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(value) => handlePreferenceChange('email_enabled', value)}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="font-medium mb-4">Notification Types</h4>
          <div className="space-y-3">
            {Object.entries(preferenceLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">
                    {key === 'new_tournament_posted' && 'Get notified when new tournaments are created'}
                    {key === 'tournament_signups_open' && 'Alert when tournament registration opens'}
                    {key === 'tournament_checkin_time' && 'Reminder when check-in time begins'}
                    {key === 'team_assigned' && 'Notification when you\'re assigned to a team'}
                    {key === 'match_assigned' && 'Alert when your match is scheduled'}
                    {key === 'match_ready' && 'Notification when your match is ready to start'}
                    {key === 'post_results' && 'Reminder to submit match results'}
                  </div>
                </div>
                <Switch
                  checked={preferences[key as keyof NotificationPreferences] as boolean}
                  onCheckedChange={(value) => handlePreferenceChange(key as keyof NotificationPreferences, value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}