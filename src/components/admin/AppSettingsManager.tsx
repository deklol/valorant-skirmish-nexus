import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Upload, X, Image as ImageIcon } from "lucide-react";

// use Announcement titles from public announcements table for selection
type Announcement = { id: string; title: string };

const AppSettingsManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [appName, setAppName] = useState("");
  const [announcementId, setAnnouncementId] = useState<string>("none");
  const [twitchEnabled, setTwitchEnabled] = useState(false);
  const [twitchChannel, setTwitchChannel] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notificationTestMode, setNotificationTestMode] = useState(false);
  
  // Social links state
  const [discordLink, setDiscordLink] = useState("");
  const [twitterLink, setTwitterLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  
  // Sidebar logo state
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");

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
            notification_test_mode: false,
            discord_link: "",
            twitter_link: "",
            youtube_link: "",
            sidebar_logo_url: "",
          },
        ]);
        setAppName("Tournament App");
        setTwitchEnabled(false);
        setTwitchChannel("");
        setAnnouncementId("none");
        setNotificationTestMode(false);
        setDiscordLink("");
        setTwitterLink("");
        setYoutubeLink("");
        setSidebarLogoUrl("");
      } else {
        toast({ title: "Error loading settings", description: error.message, variant: "destructive" });
      }
    } else if (data) {
      setAppName(data.app_name);
      setTwitchEnabled(data.twitch_embed_enabled);
      setTwitchChannel(data.twitch_channel || "");
      setAnnouncementId(data.announcement_id ? data.announcement_id : "none");
      setNotificationTestMode(Boolean((data as any).notification_test_mode));
      setDiscordLink((data as any).discord_link || "");
      setTwitterLink((data as any).twitter_link || "");
      setYoutubeLink((data as any).youtube_link || "");
      setSidebarLogoUrl((data as any).sidebar_logo_url || "");
    }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase.from("announcements").select("id,title").order("created_at", { ascending: false });
    if (!error && data) setAnnouncements(data);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 2MB", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sidebar-logo-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Try creating the bucket if it doesn't exist
        if (uploadError.message.includes('not found')) {
          toast({ title: "Storage bucket not found", description: "Please ensure the 'public-assets' bucket exists", variant: "destructive" });
        } else {
          throw uploadError;
        }
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      setSidebarLogoUrl(publicUrl);
      toast({ title: "Logo uploaded", description: "Don't forget to save settings!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setSidebarLogoUrl("");
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
        notification_test_mode: notificationTestMode,
        discord_link: discordLink || null,
        twitter_link: twitterLink || null,
        youtube_link: youtubeLink || null,
        sidebar_logo_url: sidebarLogoUrl || null,
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

        {/* Sidebar Logo Upload */}
        <div className="border-t border-slate-600 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <Label className="text-slate-300 text-base">Sidebar Logo</Label>
          </div>
          
          <div className="flex items-start gap-4">
            {/* Logo Preview */}
            <div className="w-24 h-24 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
              {sidebarLogoUrl ? (
                <img src={sidebarLogoUrl} alt="Sidebar Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-slate-500 text-xs text-center px-2">No logo</span>
              )}
            </div>
            
            {/* Upload Controls */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo || loading}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                {sidebarLogoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="bg-slate-700 border-slate-600 text-red-400 hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Recommended: PNG with transparency, max 2MB. This logo appears centered at the top of the sidebar.
              </p>
              
              {/* Manual URL input */}
              <Input
                value={sidebarLogoUrl}
                onChange={(e) => setSidebarLogoUrl(e.target.value)}
                disabled={loading}
                placeholder="Or paste image URL directly..."
                className="bg-slate-700 border-slate-600 text-white text-sm"
              />
            </div>
          </div>
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

        {/* Social Links Section */}
        <div className="border-t border-slate-600 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <Label className="text-slate-300 text-base">Social Links (Sidebar)</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="discord-link" className="text-slate-400 text-xs">Discord Invite URL</Label>
              <Input
                id="discord-link"
                value={discordLink}
                onChange={(e) => setDiscordLink(e.target.value)}
                disabled={loading}
                placeholder="https://discord.gg/..."
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="twitter-link" className="text-slate-400 text-xs">X / Twitter URL</Label>
              <Input
                id="twitter-link"
                value={twitterLink}
                onChange={(e) => setTwitterLink(e.target.value)}
                disabled={loading}
                placeholder="https://x.com/..."
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="youtube-link" className="text-slate-400 text-xs">YouTube URL</Label>
              <Input
                id="youtube-link"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                disabled={loading}
                placeholder="https://youtube.com/..."
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">These links appear in the sidebar footer. Leave empty to hide.</span>
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

        {/* Notification Test Mode */}
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Switch
              id="notification-test-toggle"
              checked={notificationTestMode}
              onCheckedChange={setNotificationTestMode}
            />
            <Label htmlFor="notification-test-toggle" className="text-slate-300">
              Notification Test Mode (Admins only)
            </Label>
          </div>
          <span className="text-xs text-slate-400">When enabled, notifications will only be sent to admins for testing.</span>
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
