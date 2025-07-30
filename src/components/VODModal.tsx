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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ExternalLink,
  Calendar,
  Users,
  Trophy,
  Mic,
  Video,
  Clock,
  Eye,
  Star,
  ChevronDown,
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
      const { data: signups } = await supabase
        .from("tournament_signups")
        .select(`users (discord_username, riot_id, current_rank)`)
        .eq("tournament_id", vod.tournament_id);

      const { data: teams } = await supabase
        .from("teams")
        .select(`*, team_members (users (discord_username, riot_id, current_rank))`)
        .eq("tournament_id", vod.tournament_id);

      const { data: matches } = await supabase
        .from("matches")
        .select(`*, team1:team1_id (name), team2:team2_id (name), winner:winner_id (name)`)
        .eq("tournament_id", vod.tournament_id)
        .order("round_number")
        .order("match_number");

      setTournamentData({
        participants: signups || [],
        teams: teams || [],
        matches: matches || [],
      });
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = () => {
    if (!vod.embed_id) return null;
    if (vod.video_platform === "youtube")
      return `https://www.youtube.com/embed/${vod.embed_id}?autoplay=1`;
    if (vod.video_platform === "twitch")
      return `https://player.twitch.tv/?video=${vod.embed_id}&parent=${window.location.hostname}&autoplay=false`;
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
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {vod.is_featured && (
                  <StandardBadge status="warning" className="bg-yellow-500/20 text-yellow-300">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </StandardBadge>
                )}
                <StandardBadge status="info">{vod.video_platform}</StandardBadge>
              </div>
              <StandardHeading level="h3">{vod.title}</StandardHeading>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(vod.video_url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Watch on {vod.video_platform}
              </Button>
              {vod.tournament_id && (
                <Button variant="outline" size="sm" onClick={() => window.open(`/tournament/${vod.tournament_id}`, "_blank")}>
                  <Trophy className="w-4 h-4 mr-2" />
                  Tournament
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 pt-0 space-y-6">
              {/* Video Player */}
              {embedUrl && (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={embedUrl}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                    title={vod.title}
                  />
                </div>
              )}

              {/* Description & Metadata */}
              {vod.description && <StandardText>{vod.description}</StandardText>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(vod.created_at)}</div>
                <div className="flex items-center gap-1"><Eye className="w-4 h-4" />{vod.view_count} views</div>
                {vod.duration_minutes && (
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(vod.duration_minutes)}</div>
                )}
              </div>

              {/* Collapsible: Casters & Production */}
              {(vod.casters?.length || vod.production_team?.length) && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full text-left flex justify-between items-center py-2">
                    <StandardHeading level="h4">Credits</StandardHeading>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vod.casters?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mic className="w-4 h-4 text-primary" />
                          <StandardText className="font-medium">Casters</StandardText>
                        </div>
                        <div className="space-y-1">
                          {vod.casters.map((caster, index) => (
                            <StandardBadge key={index} status="neutral" className="mr-2 mb-1">{caster}</StandardBadge>
                          ))}
                        </div>
                      </div>
                    )}
                    {vod.production_team?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-4 h-4 text-primary" />
                          <StandardText className="font-medium">Production</StandardText>
                        </div>
                        <div className="space-y-1">
                          {vod.production_team.map((member, index) => (
                            <StandardBadge key={index} status="neutral" className="mr-2 mb-1">{member}</StandardBadge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Collapsible: Matches */}
              {tournamentData?.matches?.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full text-left flex justify-between items-center py-2">
                    <StandardHeading level="h4">Tournament Matches</StandardHeading>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3">
                    {tournamentData.matches.slice(0, 10).map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <StandardBadge status="neutral" className="text-xs">R{match.round_number}</StandardBadge>
                          <StandardText className="text-sm">{match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}</StandardText>
                        </div>
                        <div className="flex items-center gap-2">
                          <StandardText className="text-sm text-muted-foreground">
                            {match.score_team1} - {match.score_team2}
                          </StandardText>
                          {match.winner && (
                            <StandardBadge status="success" className="text-xs">{match.winner.name}</StandardBadge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Tournament Sidebar: Teams + Stats */}
              {vod.tournaments && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <StandardHeading level="h4" className="mb-3">Tournament</StandardHeading>
                    <div className="p-4 border border-border rounded-lg">
                      <StandardText className="font-medium mb-2">{vod.tournaments.name}</StandardText>
                      <StandardText className="text-sm text-muted-foreground mb-3">
                        {formatDate(vod.tournaments.start_time)}
                      </StandardText>
                      <StandardBadge status={vod.tournaments.status === "completed" ? "success" : "neutral"}>
                        {vod.tournaments.status}
                      </StandardBadge>
                    </div>
                  </div>

                  {tournamentData && (
                    <div className="space-y-4">
                      <Collapsible>
                        <CollapsibleTrigger className="w-full text-left flex justify-between items-center">
                          <StandardHeading level="h4">Teams</StandardHeading>
                          <ChevronDown className="w-4 h-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 max-h-64 overflow-y-auto">
                          {tournamentData.teams.map((team) => (
                            <div key={team.id} className="p-3 border border-border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <StandardText className="font-medium text-sm">{team.name}</StandardText>
                                <StandardBadge status={team.status === "winner" ? "success" : "neutral"} className="text-xs">
                                  {team.status}
                                </StandardBadge>
                              </div>
                              <div className="space-y-1">
                                {team.team_members?.slice(0, 3).map((member: any, idx: number) => (
                                  <StandardText key={idx} className="text-xs text-muted-foreground">
                                    {member.users?.discord_username}
                                  </StandardText>
                                ))}
                                {team.team_members?.length > 3 && (
                                  <StandardText className="text-xs text-muted-foreground">
                                    +{team.team_members.length - 3} more
                                  </StandardText>
                                )}
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible>
                        <CollapsibleTrigger className="w-full text-left flex justify-between items-center">
                          <StandardHeading level="h4">Tournament Stats</StandardHeading>
                          <ChevronDown className="w-4 h-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <StandardText className="text-sm">Participants</StandardText>
                            <StandardBadge status="neutral">{tournamentData.participants.length}</StandardBadge>
                          </div>
                          <div className="flex items-center justify-between">
                            <StandardText className="text-sm">Teams</StandardText>
                            <StandardBadge status="neutral">{tournamentData.teams.length}</StandardBadge>
                          </div>
                          <div className="flex items-center justify-between">
                            <StandardText className="text-sm">Matches</StandardText>
                            <StandardBadge status="neutral">{tournamentData.matches.length}</StandardBadge>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
