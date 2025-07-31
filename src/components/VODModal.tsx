import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { StandardBadge } from "@/components/ui/standard-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  Calendar, 
  Users, 
  Trophy, 
  Mic, 
  Video,
  Clock,
  Eye,
  Star
} from "lucide-react";

interface VOD {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  tournament_id: string | null;
  casters: string[] | null;
  production_team: string[] | null;
  video_platform: string;
  embed_id: string | null;
  duration_minutes: number | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  tournaments?: {
    id: string;
    name: string;
    status: string;
    start_time: string;
  } | null;
}

interface TournamentData {
  participants: any[];
  teams: any[];
  matches: any[];
}

interface VODModalProps {
  vod: VOD;
  isOpen: boolean;
  onClose: () => void;
}

export function VODModal({ vod, isOpen, onClose }: VODModalProps) {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vod.tournament_id) {
      fetchTournamentData();
    }
  }, [isOpen, vod.tournament_id]);

  const fetchTournamentData = async () => {
    if (!vod.tournament_id) return;
    
    setLoading(true);
    try {
      // Fetch tournament participants
      const { data: signups } = await supabase
        .from("tournament_signups")
        .select(`
          users (
            discord_username,
            riot_id,
            current_rank
          )
        `)
        .eq("tournament_id", vod.tournament_id);

      // Fetch tournament teams
      const { data: teams } = await supabase
        .from("teams")
        .select(`
          *,
          team_members (
            users (
              discord_username,
              riot_id,
              current_rank
            )
          )
        `)
        .eq("tournament_id", vod.tournament_id);

      // Fetch tournament matches
      const { data: matches } = await supabase
        .from("matches")
        .select(`
          *,
          team1:team1_id (name),
          team2:team2_id (name),
          winner:winner_id (name)
        `)
        .eq("tournament_id", vod.tournament_id)
        .order("round_number")
        .order("match_number");

      setTournamentData({
        participants: signups || [],
        teams: teams || [],
        matches: matches || []
      });
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = () => {
    if (!vod.embed_id) return null;
    
    if (vod.video_platform === "youtube") {
      return `https://www.youtube.com/embed/${vod.embed_id}?autoplay=1`;
    }
    
    if (vod.video_platform === "twitch") {
      return `https://player.twitch.tv/?video=${vod.embed_id}&parent=${window.location.hostname}&autoplay=false`;
    }
    
    return null;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const embedUrl = getEmbedUrl();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-background border-border">
        <DialogHeader className="p-4 pb-0 border-b border-border/50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {vod.is_featured && (
                  <StandardBadge status="warning" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </StandardBadge>
                )}
                <StandardBadge status="info" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                  {vod.video_platform}
                </StandardBadge>
              </div>
              <StandardHeading level="h3" className="text-foreground">{vod.title}</StandardHeading>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(vod.video_url, "_blank")}
                className="shrink-0 border-border hover:bg-accent"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Watch on {vod.video_platform}
              </Button>
              {vod.tournament_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/tournament/${vod.tournament_id}`, "_blank")}
                  className="shrink-0 border-border hover:bg-accent"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Tournament
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Video Player and Main Info */}
              <div className="lg:col-span-2 space-y-4">
                {/* Smaller Video Player */}
                {embedUrl && (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-border shadow-lg">
                    <iframe
                      src={embedUrl}
                      frameBorder="0"
                      allowFullScreen
                      className="w-full h-full"
                      title={vod.title}
                    />
                  </div>
                )}

                {/* Video Info */}
                <div className="bg-card border border-border rounded-lg p-4">
                  {vod.description && (
                    <StandardText className="mb-4 text-card-foreground">{vod.description}</StandardText>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(vod.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {vod.view_count} views
                    </div>
                    {vod.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(vod.duration_minutes)}
                      </div>
                    )}
                  </div>

                  {/* Credits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vod.casters && vod.casters.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mic className="w-4 h-4 text-primary" />
                          <StandardText className="font-medium text-card-foreground">Casters</StandardText>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {vod.casters.map((caster, index) => (
                            <StandardBadge key={index} status="neutral" className="text-xs bg-muted/50 border-border">
                              {caster}
                            </StandardBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {vod.production_team && vod.production_team.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-4 h-4 text-primary" />
                          <StandardText className="font-medium text-card-foreground">Production</StandardText>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {vod.production_team.map((member, index) => (
                            <StandardBadge key={index} status="neutral" className="text-xs bg-muted/50 border-border">
                              {member}
                            </StandardBadge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tournament Matches */}
                {tournamentData && tournamentData.matches.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <StandardHeading level="h4" className="mb-4 text-card-foreground">Tournament Matches</StandardHeading>
                    <div className="space-y-2 max-h-60 overflow-y-auto mobile-scroll">
                      {tournamentData.matches.slice(0, 10).map((match) => (
                        <div key={match.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <StandardBadge status="neutral" className="text-xs bg-primary/20 text-primary border-primary/30">
                              R{match.round_number}
                            </StandardBadge>
                            <StandardText className="text-sm text-card-foreground">
                              {match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}
                            </StandardText>
                          </div>
                          <div className="flex items-center gap-2">
                            <StandardText className="text-sm text-muted-foreground">
                              {match.score_team1} - {match.score_team2}
                            </StandardText>
                            {match.winner && (
                              <StandardBadge status="success" className="text-xs bg-green-500/20 text-green-300 border-green-400/30">
                                {match.winner.name}
                              </StandardBadge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar with Scrollable Content */}
              <div className="bg-card border border-border rounded-lg p-4 h-fit max-h-full overflow-hidden">
                <ScrollArea className="h-full max-h-[calc(95vh-200px)]">
                  <div className="space-y-6 pr-2">
                    {/* Tournament Info */}
                    {vod.tournaments && (
                      <div>
                        <StandardHeading level="h4" className="mb-3 text-card-foreground flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          Tournament
                        </StandardHeading>
                        <div className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                          <StandardText className="font-medium mb-2 text-card-foreground">{vod.tournaments.name}</StandardText>
                          <StandardText className="text-sm text-muted-foreground mb-3">
                            {formatDate(vod.tournaments.start_time)}
                          </StandardText>
                          <StandardBadge status={vod.tournaments.status === "completed" ? "success" : "neutral"} 
                            className={vod.tournaments.status === "completed" 
                              ? "bg-green-500/20 text-green-300 border-green-400/30" 
                              : "bg-muted/50 border-border"
                            }>
                            {vod.tournaments.status}
                          </StandardBadge>
                        </div>
                      </div>
                    )}

                    {/* Tournament Teams */}
                    {tournamentData && tournamentData.teams.length > 0 && (
                      <div>
                        <StandardHeading level="h4" className="mb-3 text-card-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Teams
                        </StandardHeading>
                        <div className="space-y-2 max-h-72 overflow-y-auto mobile-scroll">
                          {tournamentData.teams.map((team) => (
                            <div key={team.id} className="p-3 bg-muted/30 border border-border/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <StandardText className="font-medium text-sm text-card-foreground">{team.name}</StandardText>
                                <StandardBadge 
                                  status={team.status === "winner" ? "success" : "neutral"} 
                                  className={team.status === "winner" 
                                    ? "text-xs bg-green-500/20 text-green-300 border-green-400/30" 
                                    : "text-xs bg-muted/50 border-border"
                                  }>
                                  {team.status}
                                </StandardBadge>
                              </div>
                              <div className="space-y-1">
                                {team.team_members?.map((member: any, idx: number) => (
                                  <StandardText key={idx} className="text-xs text-muted-foreground">
                                    {member.users?.discord_username}
                                  </StandardText>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}