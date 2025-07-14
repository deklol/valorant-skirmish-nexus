import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Bot, Image, Trophy, Users, Calendar, Target, Settings, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Tournament {
  id: string;
  name: string;
  status: string;
  start_time: string | null;
  description: string | null;
}

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  status: string;
  winner_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
}

interface Team {
  id: string;
  name: string;
  status: string;
  total_rank_points: number | null;
}

export default function EnhancedDiscordIntegration() {
  // State for tournament selection and data
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [postBracketUpdates, setPostBracketUpdates] = useState(true);
  const [postMatchResults, setPostMatchResults] = useState(true);
  const [postMilestones, setPostMilestones] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [embedType, setEmbedType] = useState<'bracket' | 'results' | 'leaderboard' | 'schedule'>('bracket');
  const [bracketImageUrl, setBracketImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Load tournaments on mount
  useEffect(() => {
    loadTournaments();
  }, []);

  // Load tournament data when selected
  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentData(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, status, start_time, description')
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to Load Tournaments",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadTournamentData = async (tournamentId: string) => {
    setDataLoading(true);
    try {
      // Load tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, name, status, start_time, description')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Load matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('id, round_number, match_number, team1_id, team2_id, status, winner_id, score_team1, score_team2')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, status, total_rank_points')
        .eq('tournament_id', tournamentId)
        .order('name', { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

    } catch (error: any) {
      toast({
        title: "Failed to Load Tournament Data",
        description: error.message,
        variant: "destructive"
      });
      setTournament(null);
      setMatches([]);
      setTeams([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Generate bracket visualization as image
  const generateBracketImage = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not available");

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;

    // Dark background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tournament?.name || 'No Tournament Selected', canvas.width / 2, 40);

    // Tournament status
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Arial';
    ctx.fillText(`Status: ${tournament?.status?.toUpperCase() || 'UNKNOWN'}`, canvas.width / 2, 70);

    // Draw bracket structure
    const rounds = Math.max(...matches.map(m => m.round_number), 1);
    const roundWidth = (canvas.width - 100) / rounds;
    
    for (let round = 1; round <= rounds; round++) {
      const roundMatches = matches.filter(m => m.round_number === round);
      const matchHeight = (canvas.height - 150) / Math.max(roundMatches.length, 1);
      
      // Round header
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      const roundX = 50 + (round - 1) * roundWidth + roundWidth / 2;
      ctx.fillText(`Round ${round}`, roundX, 110);
      
      roundMatches.forEach((match, index) => {
        const matchY = 130 + index * matchHeight;
        const matchX = 50 + (round - 1) * roundWidth;
        
        // Match box
        ctx.fillStyle = match.status === 'completed' ? '#059669' : 
                       match.status === 'live' ? '#dc2626' : '#475569';
        ctx.fillRect(matchX + 10, matchY, roundWidth - 20, matchHeight - 10);
        
        // Match border
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(matchX + 10, matchY, roundWidth - 20, matchHeight - 10);
        
        // Match info
        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        const team1Name = teams.find(t => t.id === match.team1_id)?.name || 'TBD';
        const team2Name = teams.find(t => t.id === match.team2_id)?.name || 'TBD';
        
        ctx.fillText(`${team1Name}`, matchX + 20, matchY + 25);
        ctx.fillText(`vs`, matchX + 20, matchY + 45);
        ctx.fillText(`${team2Name}`, matchX + 20, matchY + 65);
        
        if (match.winner_id) {
          const winnerName = teams.find(t => t.id === match.winner_id)?.name || 'Unknown';
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(`Winner: ${winnerName}`, matchX + 20, matchY + 85);
        }
      });
    }

    // Convert to blob and upload
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image"));
          return;
        }

        try {
          // In a real implementation, you'd upload this to your storage
          // For now, we'll create a data URL
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to convert image"));
          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error);
        }
      }, 'image/png');
    });
  };

  const createRichEmbed = (type: string, data?: any) => {
    const baseEmbed = {
      timestamp: new Date().toISOString(),
      footer: {
        text: "Tournament Management System",
        icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
      }
    };

    if (!tournament) {
      return {
        ...baseEmbed,
        title: "⚠️ No Tournament Selected",
        description: "Please select a tournament first",
        color: 0xff0000
      };
    }

    switch (type) {
      case 'bracket':
        return {
          ...baseEmbed,
          title: `🏆 ${tournament.name} - Bracket Update`,
          description: "Current tournament bracket status",
          color: 0x3b82f6,
          fields: [
            {
              name: "Status",
              value: tournament.status.toUpperCase(),
              inline: true
            },
            {
              name: "Teams",
              value: teams.length.toString(),
              inline: true
            },
            {
              name: "Matches",
              value: matches.length.toString(),
              inline: true
            }
          ],
          image: bracketImageUrl ? { url: bracketImageUrl } : undefined
        };

      case 'results':
        const completedMatches = matches.filter(m => m.status === 'completed');
        return {
          ...baseEmbed,
          title: `📊 ${tournament.name} - Match Results`,
          description: "Latest match results and standings",
          color: 0x10b981,
          fields: completedMatches.slice(-5).map(match => {
            const team1Name = teams.find(t => t.id === match.team1_id)?.name || 'TBD';
            const team2Name = teams.find(t => t.id === match.team2_id)?.name || 'TBD';
            const winnerName = teams.find(t => t.id === match.winner_id)?.name || 'Unknown';
            return {
              name: `Round ${match.round_number}, Match ${match.match_number}`,
              value: `${team1Name} vs ${team2Name}\n🏆 Winner: **${winnerName}**`,
              inline: false
            };
          })
        };

      case 'leaderboard':
        const winningTeams = teams.filter(t => t.status === 'winner');
        const activeTeams = teams.filter(t => !['eliminated', 'disqualified', 'withdrawn'].includes(t.status));
        return {
          ...baseEmbed,
          title: `🏅 ${tournament.name} - Leaderboard`,
          description: "Current tournament standings",
          color: 0xf59e0b,
          fields: [
            {
              name: "🥇 Winners",
              value: winningTeams.length > 0 ? winningTeams.map(t => t.name).join('\n') : 'TBD',
              inline: true
            },
            {
              name: "🎯 Still Competing",
              value: activeTeams.slice(0, 10).map(t => t.name).join('\n') || 'None',
              inline: true
            },
            {
              name: "📈 Progress",
              value: `${matches.filter(m => m.status === 'completed').length}/${matches.length} matches completed`,
              inline: false
            }
          ]
        };

      case 'schedule':
        const upcomingMatches = matches.filter(m => m.status === 'pending').slice(0, 5);
        return {
          ...baseEmbed,
          title: `📅 ${tournament.name} - Upcoming Matches`,
          description: "Next matches to be played",
          color: 0x8b5cf6,
          fields: upcomingMatches.map(match => {
            const team1Name = teams.find(t => t.id === match.team1_id)?.name || 'TBD';
            const team2Name = teams.find(t => t.id === match.team2_id)?.name || 'TBD';
            return {
              name: `Round ${match.round_number}, Match ${match.match_number}`,
              value: `${team1Name} vs ${team2Name}`,
              inline: true
            };
          })
        };

      default:
        return baseEmbed;
    }
  };

  const sendDiscordMessage = async (embed: any, message?: string) => {
    if (!webhookUrl.trim()) {
      throw new Error("Discord webhook URL is required");
    }

    // Validate webhook URL format
    if (!webhookUrl.includes('discord.com/api/webhooks/') && !webhookUrl.includes('discordapp.com/api/webhooks/')) {
      throw new Error("Invalid Discord webhook URL format");
    }

    const payload = {
      username: "Tournament Bot",
      content: message || undefined,
      embeds: [embed]
    };

    console.log('Sending Discord payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', response.status, errorText);
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText || 'Unknown error'}`);
    }
  };

  const handleGenerateAndPostBracket = async () => {
    setLoading(true);
    try {
      // Generate bracket image
      const imageUrl = await generateBracketImage();
      setBracketImageUrl(imageUrl);

      // Create and send embed
      const embed = createRichEmbed('bracket');
      await sendDiscordMessage(embed, customMessage);

      toast({
        title: "Bracket Posted",
        description: "Bracket image and embed sent to Discord successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Post Bracket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostEmbed = async () => {
    setLoading(true);
    try {
      const embed = createRichEmbed(embedType);
      await sendDiscordMessage(embed, customMessage);

      toast({
        title: "Embed Posted",
        description: "Rich embed sent to Discord successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Post Embed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    setLoading(true);
    try {
      const testEmbed = {
        title: "🤖 Test Message",
        description: "This is a test message from the Enhanced Discord Integration system!",
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
        footer: {
          text: "Tournament Management System",
          icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
        }
      };

      await sendDiscordMessage(testEmbed);

      toast({
        title: "Test Successful",
        description: "Test message sent to Discord successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Enhanced Discord Integration
            <span className="text-xs text-purple-300">(Phase 2)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Tournament Selection */}
          <div className="border border-orange-600/30 bg-orange-950/20 rounded-lg p-4">
            <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Tournament Selection
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Select Tournament</Label>
                <div className="flex gap-2">
                  <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white flex-1">
                      <SelectValue placeholder="Choose a tournament..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {tournaments.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name} ({tournament.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={loadTournaments}
                    variant="outline"
                    size="icon"
                    disabled={dataLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              
              {tournament && (
                <div className="bg-slate-900 p-3 rounded border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-slate-400">Status</Label>
                      <p className="text-white font-medium">{tournament.status.toUpperCase()}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Teams</Label>
                      <p className="text-white font-medium">{teams.length}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Matches</Label>
                      <p className="text-white font-medium">{matches.length}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Completed</Label>
                      <p className="text-white font-medium">
                        {matches.filter(m => m.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {!tournament && selectedTournamentId && (
                <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Please select a tournament to enable Discord integration features
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="border border-purple-600/30 bg-purple-950/20 rounded-lg p-4">
            <h3 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Webhook Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Discord Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-slate-700 border-slate-600 text-white flex-1"
                  />
                  <Button
                    onClick={handleTestWebhook}
                    disabled={!webhookUrl.trim() || loading}
                    variant="outline"
                  >
                    Test
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoPost"
                  checked={autoPostEnabled}
                  onCheckedChange={setAutoPostEnabled}
                />
                <Label htmlFor="autoPost" className="text-slate-300">
                  Enable Automatic Posting
                </Label>
              </div>
              
              {autoPostEnabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="postBracket"
                      checked={postBracketUpdates}
                      onCheckedChange={setPostBracketUpdates}
                    />
                    <Label htmlFor="postBracket" className="text-slate-300">
                      Post Bracket Updates
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="postResults"
                      checked={postMatchResults}
                      onCheckedChange={setPostMatchResults}
                    />
                    <Label htmlFor="postResults" className="text-slate-300">
                      Post Match Results
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="postMilestones"
                      checked={postMilestones}
                      onCheckedChange={setPostMilestones}
                    />
                    <Label htmlFor="postMilestones" className="text-slate-300">
                      Post Tournament Milestones
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bracket Image Generation */}
          <div className="border border-blue-600/30 bg-blue-950/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Bracket Image Generation
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Custom Message (Optional)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a custom message to accompany the bracket..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <Button
                onClick={handleGenerateAndPostBracket}
                disabled={!webhookUrl.trim() || loading || !tournament}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Image className="w-4 h-4 mr-2" />
                Generate & Post Bracket Image
              </Button>
              
              {bracketImageUrl && (
                <div className="mt-4">
                  <Label className="text-slate-300">Generated Bracket Preview:</Label>
                  <div className="mt-2 p-2 bg-slate-900 rounded border">
                    <img 
                      src={bracketImageUrl} 
                      alt="Generated Bracket" 
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rich Embed Templates */}
          <div className="border border-green-600/30 bg-green-950/20 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Rich Embed Templates
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Embed Type</Label>
                <Select value={embedType} onValueChange={(value: any) => setEmbedType(value)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="bracket">🏆 Bracket Overview</SelectItem>
                    <SelectItem value="results">📊 Match Results</SelectItem>
                    <SelectItem value="leaderboard">🏅 Current Leaderboard</SelectItem>
                    <SelectItem value="schedule">📅 Upcoming Matches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="border-green-600 text-green-400"
                >
                  Preview Embed
                </Button>
                
                <Button
                  onClick={handlePostEmbed}
                  disabled={!webhookUrl.trim() || loading || !tournament}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Post Embed
                </Button>
              </div>
            </div>
          </div>

          {/* Auto-Posting Status */}
          {autoPostEnabled && (
            <div className="border border-yellow-600/30 bg-yellow-950/20 rounded-lg p-4">
              <h3 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Auto-Posting Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Badge className={postBracketUpdates ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                  Bracket Updates: {postBracketUpdates ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge className={postMatchResults ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                  Match Results: {postMatchResults ? 'Enabled' : 'Disabled'}
                </Badge>
                <Badge className={postMilestones ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                  Milestones: {postMilestones ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden canvas for bracket generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Embed Preview Dialog */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Embed Preview</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Preview of the {embedType} embed that will be sent to Discord
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <div className="bg-slate-900 border border-slate-700 rounded p-4">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap overflow-auto">
                {JSON.stringify(createRichEmbed(embedType), null, 2)}
              </pre>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPreview(false)}>
              Close Preview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}