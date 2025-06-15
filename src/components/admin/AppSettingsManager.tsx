import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// use Announcement titles from public announcements table for selection
type Announcement = { id: string; title: string };

const AppSettingsManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [appName, setAppName] = useState("");
  const [announcementId, setAnnouncementId] = useState<string>("none");
  const [twitchEnabled, setTwitchEnabled] = useState(false);
  const [twitchChannel, setTwitchChannel] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    fetchAnnouncements();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_settings").select("*").limit(1).single();
    if (error) {
      if (error.code === "PGRST116") {
        // Not found - insert default
        await supabase.from("app_settings").insert([
          {
            app_name: "Tournament App",
            twitch_embed_enabled: false,
            twitch_channel: "",
            announcement_id: null,
          },
        ]);
        setAppName("Tournament App");
        setTwitchEnabled(false);
        setTwitchChannel("");
        setAnnouncementId("none");
      } else {
        toast({ title: "Error loading settings", description: error.message, variant: "destructive" });
      }
    } else if (data) {
      setAppName(data.app_name);
      setTwitchEnabled(data.twitch_embed_enabled);
      setTwitchChannel(data.twitch_channel || "");
      setAnnouncementId(data.announcement_id ? data.announcement_id : "none");
    }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase.from("announcements").select("id,title").order("created_at", { ascending: false });
    if (!error && data) setAnnouncements(data);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase.from("app_settings").select("id").limit(1).single();
    if (error) {
      toast({ title: "Error", description: "Could not retrieve settings row", variant: "destructive" });
      setSaving(false);
      return;
    }
    const update = await supabase
      .from("app_settings")
      .update({
        app_name: appName,
        twitch_embed_enabled: twitchEnabled,
        twitch_channel: twitchEnabled ? twitchChannel : "",
        announcement_id: announcementId === "none" ? null : announcementId,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (update.error) {
      toast({ title: "Failed", description: update.error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings Saved", description: "App settings updated!" });
    }
    setSaving(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700 mt-4">
      <CardHeader>
        <CardTitle className="text-white">App Settings (God Hub)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Rename App */}
        <div>
          <Label htmlFor="app-name" className="text-slate-300">App Name</Label>
          <Input
            id="app-name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            disabled={loading}
            maxLength={40}
            className="bg-slate-700 border-slate-600 text-white mt-1"
          />
          <span className="text-xs text-slate-400">This name will appear in the navigation and home page.</span>
        </div>

        {/* Announcement Selector */}
        <div>
          <Label htmlFor="front-announcement" className="text-slate-300">Front Page Announcement</Label>
          <Select value={announcementId} onValueChange={value => setAnnouncementId(value)}>
            <SelectTrigger className="w-64 bg-slate-700 border-slate-600 text-white mt-1">
              <SelectValue placeholder="(None)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="none">None</SelectItem>
              {announcements.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-400">Show this announcement on the home page. Edit announcements in Announcements tab.</span>
        </div>

        {/* Twitch Stream Embed */}
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Switch
              id="twitch-toggle"
              checked={twitchEnabled}
              onCheckedChange={setTwitchEnabled}
            />
            <Label htmlFor="twitch-toggle" className="text-slate-300">
              Enable Twitch Stream & Chat Embed on Home page
            </Label>
          </div>
          <Input
            id="twitch-channel"
            value={twitchChannel}
            onChange={e => setTwitchChannel(e.target.value)}
            disabled={!twitchEnabled}
            placeholder="Twitch channel (e.g. tlrlive)"
            className="bg-slate-700 border-slate-600 text-white mt-2"
          />
          <span className="text-xs text-slate-400">
            When enabled, the stream and chat of the specified channel will appear on the homepage.<br />
            Example: tlrlive
          </span>
        </div>

        <Button
          disabled={loading || saving}
          className="bg-blue-700 hover:bg-blue-800 w-full"
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>

      </CardContent>
    </Card>
  );
};

export default AppSettingsManager;
