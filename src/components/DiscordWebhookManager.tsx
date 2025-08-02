
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StandardInput, StandardTextarea } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Send, Settings, Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DiscordWebhookManager = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const sendDiscordWebhook = async (webhookUrl: string, title: string, content: string, isImportant: boolean) => {
    const embed = {
      title: title,
      description: content,
      color: isImportant ? 0xff0000 : 0x0099ff, // Red for important, blue for normal
      timestamp: new Date().toISOString(),
      footer: {
        text: "Tournament Bot",
        icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
      }
    };

    const payload = {
      username: "Tournament Bot",
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save to database
      const { error: dbError } = await supabase
        .from('announcements')
        .insert({
          title: title.trim(),
          content: content.trim(),
          is_important: isImportant,
          tournament_id: selectedTournament === "all" ? null : selectedTournament
        });

      if (dbError) throw dbError;

      // Send Discord webhook if URL provided
      if (webhookUrl.trim()) {
        try {
          await sendDiscordWebhook(webhookUrl, title, content, isImportant);
          toast({
            title: "Success",
            description: "Announcement posted and sent to Discord!",
          });
        } catch (webhookError) {
          console.error('Discord webhook error:', webhookError);
          toast({
            title: "Partial Success",
            description: "Announcement posted but Discord webhook failed",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Announcement posted successfully!",
        });
      }

      // Reset form
      setTitle("");
      setContent("");
      setIsImportant(false);
      setSelectedTournament("all");
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Error",
        description: "Failed to post announcement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Discord webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendDiscordWebhook(
        webhookUrl,
        "Test Message",
        "This is a test message from the tournament system!",
        false
      );
      toast({
        title: "Success",
        description: "Test message sent to Discord!",
      });
    } catch (error) {
      console.error('Test webhook error:', error);
      toast({
        title: "Error",
        description: "Failed to send test message. Check your webhook URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="text-center py-8">
          <p className="text-slate-400">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discord Webhook Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Discord Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook-url" className="text-slate-300">
              Discord Webhook URL (Optional)
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white flex-1"
              />
              <Button
                onClick={sendTestMessage}
                disabled={isLoading || !webhookUrl.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bot className="w-4 h-4 mr-2" />
                Test
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Get webhook URL from Discord: Server Settings → Integrations → Webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send Announcement */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-300">Title</Label>
            <Input
              id="title"
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-slate-300">Content</Label>
            <Textarea
              id="content"
              placeholder="Announcement content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white mt-1 min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="important"
                checked={isImportant}
                onCheckedChange={setIsImportant}
              />
              <Label htmlFor="important" className="text-slate-300">
                Mark as Important
              </Label>
            </div>

            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Tournament" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Tournaments</SelectItem>
                <SelectItem value="current">Current Tournament</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSendAnnouncement}
            disabled={isLoading || !title.trim() || !content.trim()}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Sending..." : "Send Announcement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscordWebhookManager;
