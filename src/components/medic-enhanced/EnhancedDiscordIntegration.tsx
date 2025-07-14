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
  map_veto_enabled?: boolean;
}

interface Team {
  id: string;
  name: string;
  status: string;
  total_rank_points: number | null;
  team_members?: {
    user_id: string;
    is_captain: boolean;
    users: {
      discord_username: string;
      current_rank: string | null;
      rank_points: number | null;
    };
  }[];
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
  const [embedType, setEmbedType] = useState<'bracket' | 'results' | 'leaderboard' | 'schedule' | 'teams'>('bracket');
  const [bracketImageUrl, setBracketImageUrl] = useState("");
  const [teamsImageUrl, setTeamsImageUrl] = useState("");
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

      // Load teams with members
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, name, status, total_rank_points,
          team_members (
            user_id, is_captain,
            users (
              discord_username, current_rank, rank_points
            )
          )
        `)
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

  // Generate teams overview as image matching the actual UI
  const generateTeamsOverviewImage = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not available");

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Set canvas size for better quality
    canvas.width = 1600;
    canvas.height = 1000;

    // Dark background matching the UI
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, fillColor: string, strokeColor?: string) => {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    // Helper function to get rank color
    const getRankColor = (rank: string | null): string => {
      if (!rank) return '#6b7280';
      const rankLower = rank.toLowerCase();
      if (rankLower.includes('iron')) return '#8b7355';
      if (rankLower.includes('bronze')) return '#cd7f32';
      if (rankLower.includes('silver')) return '#c0c0c0';
      if (rankLower.includes('gold')) return '#ffd700';
      if (rankLower.includes('platinum')) return '#e5e4e2';
      if (rankLower.includes('diamond')) return '#b9f2ff';
      if (rankLower.includes('ascendant')) return '#00ff87';
      if (rankLower.includes('immortal')) return '#ff6b9d';
      if (rankLower.includes('radiant')) return '#ffffaa';
      return '#6b7280';
    };

    // Title with better styling
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tournament?.name || 'No Tournament Selected', canvas.width / 2, 50);

    // Tournament status badge
    const statusColor = tournament?.status === 'completed' ? '#059669' : 
                       tournament?.status === 'live' ? '#dc2626' : '#64748b';
    drawRoundedRect(canvas.width / 2 - 80, 65, 160, 30, 15, statusColor);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${tournament?.status?.toUpperCase() || 'UNKNOWN'}`, canvas.width / 2, 85);

    // Teams & Participants header
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px Inter, Arial';
    ctx.textAlign = 'left';
    ctx.fillText('👥 Teams & Participants', 50, 125);

    // Calculate grid layout for teams (2 teams per row for better detail)
    const teamsPerRow = 2;
    const teamCardWidth = 700;
    const teamCardHeight = 200;
    const spacing = 40;
    const startX = (canvas.width - (teamsPerRow * teamCardWidth + (teamsPerRow - 1) * spacing)) / 2;
    const startY = 150;

    teams.forEach((team, index) => {
      const row = Math.floor(index / teamsPerRow);
      const col = index % teamsPerRow;
      const x = startX + col * (teamCardWidth + spacing);
      const y = startY + row * (teamCardHeight + spacing);

      // Team status color
      const teamBgColor = '#1e293b';
      const teamBorderColor = team.status === 'winner' ? '#fbbf24' : 
                             team.status === 'eliminated' ? '#dc2626' :
                             team.status === 'confirmed' ? '#3b82f6' : '#64748b';

      // Team card container
      drawRoundedRect(x, y, teamCardWidth, teamCardHeight, 12, teamBgColor, teamBorderColor);

      // Team name with crown
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Inter, Arial';
      ctx.textAlign = 'left';
      ctx.fillText('👑', x + 15, y + 30);
      
      let teamName = team.name;
      const maxNameWidth = teamCardWidth - 200;
      if (ctx.measureText(teamName).width > maxNameWidth) {
        while (ctx.measureText(teamName + '...').width > maxNameWidth && teamName.length > 0) {
          teamName = teamName.slice(0, -1);
        }
        teamName += '...';
      }
      ctx.fillText(teamName, x + 50, y + 30);

      // Team weight
      if (team.total_rank_points) {
        const weightText = `Team Weight: ${team.total_rank_points}`;
        drawRoundedRect(x + teamCardWidth - 200, y + 10, 180, 25, 12, '#6366f1');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(weightText, x + teamCardWidth - 110, y + 27);
      }

      // Team members
      const members = team.team_members || [];
      const membersStartY = y + 55;
      const memberHeight = 35;
      
      members.forEach((member, memberIndex) => {
        const memberY = membersStartY + memberIndex * memberHeight;
        const user = member.users;
        
        // Captain icon
        if (member.is_captain) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '14px Arial';
          ctx.textAlign = 'left';
          ctx.fillText('👑', x + 20, memberY + 20);
        }
        
        // Member username
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter, Arial';
        ctx.textAlign = 'left';
        const username = user.discord_username || 'Unknown';
        ctx.fillText(username, x + (member.is_captain ? 50 : 30), memberY + 20);
        
        // Rank badge
        if (user.current_rank) {
          const rankColor = getRankColor(user.current_rank);
          const rankText = user.current_rank;
          const rankWidth = Math.max(ctx.measureText(rankText).width + 20, 80);
          
          drawRoundedRect(x + teamCardWidth - 200, memberY + 5, rankWidth, 20, 10, rankColor);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, Arial';
          ctx.textAlign = 'center';
          ctx.fillText(rankText, x + teamCardWidth - 200 + rankWidth / 2, memberY + 18);
        }
      });

      // Winner trophy
      if (team.status === 'winner') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('🏆', x + teamCardWidth - 20, y + 35);
      }
    });

    // Convert to blob and return data URL
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image"));
          return;
        }

        try {
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

  // Generate bracket visualization as image matching the actual UI
  const generateBracketImage = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not available");

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Set canvas size for better quality
    canvas.width = 1600;
    canvas.height = 1000;

    // Dark background matching the UI
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Helper function to draw rounded rectangle (manual implementation for compatibility)
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, fillColor: string, strokeColor?: string) => {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    // Title with better styling
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tournament?.name || 'No Tournament Selected', canvas.width / 2, 50);

    // Tournament status badge
    const statusColor = tournament?.status === 'completed' ? '#059669' : 
                       tournament?.status === 'live' ? '#dc2626' : '#64748b';
    drawRoundedRect(canvas.width / 2 - 80, 65, 160, 30, 15, statusColor);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${tournament?.status?.toUpperCase() || 'UNKNOWN'}`, canvas.width / 2, 85);

    // Calculate bracket layout
    const rounds = Math.max(...matches.map(m => m.round_number), 1);
    const startY = 130;
    const availableHeight = canvas.height - startY - 50;
    const roundWidth = Math.min(280, (canvas.width - 100) / rounds);
    const spacing = 20;

    for (let round = 1; round <= rounds; round++) {
      const roundMatches = matches.filter(m => m.round_number === round);
      const matchHeight = 120;
      const totalMatchesHeight = roundMatches.length * matchHeight + (roundMatches.length - 1) * spacing;
      const startMatchY = startY + (availableHeight - totalMatchesHeight) / 2;

      const roundX = 50 + (round - 1) * (roundWidth + 30);

      // Round header with styling
      const headerY = startY - 20;
      drawRoundedRect(roundX, headerY, roundWidth, 35, 8, '#334155');
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px Inter, Arial';
      ctx.textAlign = 'center';
      
      const roundName = round === rounds ? 'Final' : 
                       round === rounds - 1 ? 'Semi-Final' :
                       `Round ${round}`;
      ctx.fillText(roundName, roundX + roundWidth / 2, headerY + 23);

      roundMatches.forEach((match, index) => {
        const matchY = startMatchY + index * (matchHeight + spacing);
        
        // Match container with UI-like styling
        drawRoundedRect(roundX, matchY, roundWidth, matchHeight, 8, '#334155', '#475569');

        // Match number
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Match ${match.match_number}`, roundX + 12, matchY + 18);

        // Status badge
        const statusBadgeColor = match.status === 'completed' ? '#059669' : 
                               match.status === 'live' ? '#dc2626' : '#6b7280';
        drawRoundedRect(roundX + roundWidth - 80, matchY + 6, 70, 18, 9, statusBadgeColor);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(match.status.toUpperCase(), roundX + roundWidth - 45, matchY + 18);

        const team1Name = teams.find(t => t.id === match.team1_id)?.name || 'TBD';
        const team2Name = teams.find(t => t.id === match.team2_id)?.name || 'TBD';
        const team1Score = match.score_team1 || 0;
        const team2Score = match.score_team2 || 0;

        // Team 1 container
        const team1Y = matchY + 30;
        const team1Winner = match.winner_id === match.team1_id;
        const team1BgColor = team1Winner ? '#16a34a33' : '#475569';
        const team1BorderColor = team1Winner ? '#16a34a' : '#64748b';
        
        drawRoundedRect(roundX + 8, team1Y, roundWidth - 16, 30, 6, team1BgColor, team1BorderColor);
        
        // Team 1 text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(team1Name, roundX + 16, team1Y + 20);
        
        // Team 1 score
        ctx.font = 'bold 16px Inter, Arial';
        ctx.textAlign = 'right';
        ctx.fillText(team1Score.toString(), roundX + roundWidth - 16, team1Y + 21);

        // Winner trophy for team 1
        if (team1Winner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '12px Arial';
          ctx.fillText('🏆', roundX + 16 + ctx.measureText(team1Name).width + 8, team1Y + 20);
        }

        // Team 2 container
        const team2Y = matchY + 65;
        const team2Winner = match.winner_id === match.team2_id;
        const team2BgColor = team2Winner ? '#16a34a33' : '#475569';
        const team2BorderColor = team2Winner ? '#16a34a' : '#64748b';
        
        drawRoundedRect(roundX + 8, team2Y, roundWidth - 16, 30, 6, team2BgColor, team2BorderColor);
        
        // Team 2 text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(team2Name, roundX + 16, team2Y + 20);
        
        // Team 2 score
        ctx.font = 'bold 16px Inter, Arial';
        ctx.textAlign = 'right';
        ctx.fillText(team2Score.toString(), roundX + roundWidth - 16, team2Y + 21);

        // Winner trophy for team 2
        if (team2Winner) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '12px Arial';
          ctx.fillText('🏆', roundX + 16 + ctx.measureText(team2Name).width + 8, team2Y + 20);
        }

        // Map veto indicator
        if (match.map_veto_enabled) {
          ctx.fillStyle = '#8b5cf6';
          ctx.font = '10px Inter, Arial';
          ctx.textAlign = 'center';
          ctx.fillText('MAP VETO', roundX + roundWidth / 2, matchY + 110);
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

      case 'teams':
        return {
          ...baseEmbed,
          title: `👥 ${tournament.name} - Teams Overview`,
          description: "All registered teams in the tournament",
          color: 0x10b981,
          fields: [
            {
              name: "Total Teams",
              value: teams.length.toString(),
              inline: true
            },
            {
              name: "Status Distribution",
              value: [
                `✅ Confirmed: ${teams.filter(t => t.status === 'confirmed').length}`,
                `🏆 Winners: ${teams.filter(t => t.status === 'winner').length}`,
                `❌ Eliminated: ${teams.filter(t => t.status === 'eliminated').length}`
              ].join('\n'),
              inline: true
            }
          ],
          image: teamsImageUrl ? { url: teamsImageUrl } : undefined
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
      console.log('Starting bracket image generation...');
      
      // Use the improved bracket image generation function
      await generateBracketImage();
      
      // Generate bracket image as blob using the updated styling
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to generate image blob"));
        }, 'image/png');
      });

      console.log('Generated bracket image blob:', blob.size, 'bytes');

      // Create FormData with the image file
      const formData = new FormData();
      formData.append('file', blob, 'bracket.png');
      
      // Create embed with image reference
      const embed = {
        title: "🏆 Tournament Bracket",
        description: `Current bracket for **${tournament?.name}**`,
        color: 0x3b82f6,
        image: {
          url: "attachment://bracket.png"
        },
        fields: [
          {
            name: "📊 Status",
            value: tournament?.status?.toUpperCase() || 'UNKNOWN',
            inline: true
          },
          {
            name: "👥 Teams",
            value: teams.length.toString(),
            inline: true
          },
          {
            name: "⚔️ Matches",
            value: matches.length.toString(),
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Tournament Management System",
          icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
        }
      };

      // Prepare payload
      const payload = {
        content: customMessage || undefined,
        embeds: [embed]
      };

      formData.append('payload_json', JSON.stringify(payload));

      console.log('Sending bracket image to Discord...');

      if (!webhookUrl.trim()) {
        throw new Error('Discord webhook URL is required');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Discord API Error:', response.status, errorText);
        throw new Error(`Discord webhook failed (${response.status}): ${errorText}`);
      }

      console.log('Bracket posted successfully!');

      toast({
        title: "Bracket Posted",
        description: "Bracket image sent to Discord successfully!"
      });
    } catch (error: any) {
      console.error('Bracket generation error:', error);
      toast({
        title: "Failed to Post Bracket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndPost = async () => {
    setLoading(true);
    try {
      console.log('Generating and posting embed...', 'Embed type:', embedType);
      
      // Generate image based on embed type
      let imageUrl = "";
      if (tournament) {
        if (embedType === 'bracket') {
          console.log('Generating bracket image...');
          imageUrl = await generateBracketImage();
          setBracketImageUrl(imageUrl);
        } else if (embedType === 'teams') {
          console.log('Generating teams overview image...');
          imageUrl = await generateTeamsOverviewImage();
          setTeamsImageUrl(imageUrl);
        }
        
        console.log('Image generated successfully, length:', imageUrl ? imageUrl.length : 0);
      }

      const embed = createRichEmbed(embedType) as any;
      
      // Attach image if generated
      if (imageUrl && (embedType === 'bracket' || embedType === 'teams')) {
        embed.image = { url: imageUrl };
        console.log('Image attached to embed');
      }

      console.log('Sending embed to Discord...', JSON.stringify(embed, null, 2));
      await sendDiscordMessage(embed, customMessage);
      
      toast({
        title: "Success!",
        description: `${embedType.charAt(0).toUpperCase() + embedType.slice(1)} embed posted to Discord`,
      });
    } catch (error: any) {
      console.error('Generate and post error:', error);
      toast({
        title: "Failed to Post",
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
              
               {(bracketImageUrl || teamsImageUrl) && (
                 <div className="mt-4">
                   <Label className="text-slate-300">Generated Image Preview:</Label>
                   <div className="mt-2 p-2 bg-slate-900 rounded border">
                     <img 
                       src={embedType === 'teams' ? teamsImageUrl : bracketImageUrl} 
                       alt={`Generated ${embedType} Image`} 
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
                    <SelectItem value="teams">👥 Teams Overview</SelectItem>
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
                  onClick={handleGenerateAndPost}
                  disabled={!webhookUrl.trim() || loading || !tournament}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {(embedType === 'bracket' || embedType === 'teams') ? 'Generate & Post' : 'Post Embed'}
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