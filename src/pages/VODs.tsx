import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/ui/page-layout";
import { PageCard } from "@/components/ui/page-card";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { StandardInput } from "@/components/ui/standard-input";
import { StandardBadge } from "@/components/ui/standard-badge";
import { VODModal } from "@/components/VODModal";
import { Play, Search, Calendar, Star, Youtube, Twitch } from "lucide-react";

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

export default function VODs() {
  const [vods, setVods] = useState<VOD[]>([]);
  const [filteredVods, setFilteredVods] = useState<VOD[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVod, setSelectedVod] = useState<VOD | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVods();
  }, []);

  useEffect(() => {
    filterVods();
  }, [searchTerm, vods]);

  const fetchVods = async () => {
    try {
      const { data, error } = await supabase
        .from("vods")
        .select(`
          *,
          tournaments (
            id,
            name,
            status,
            start_time
          )
        `)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVods(data || []);
    } catch (error) {
      console.error("Error fetching VODs:", error);
      toast({
        title: "Error",
        description: "Failed to load VODs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterVods = () => {
    if (!searchTerm) {
      setFilteredVods(vods);
      return;
    }

    const filtered = vods.filter(vod =>
      vod.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vod.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vod.tournaments?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vod.casters?.some(caster => caster.toLowerCase().includes(searchTerm.toLowerCase())) ||
      vod.production_team?.some(member => member.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredVods(filtered);
  };

  const handleVodClick = async (vod: VOD) => {
    // Increment view count
    await supabase
      .from("vods")
      .update({ view_count: vod.view_count + 1 })
      .eq("id", vod.id);
    
    setSelectedVod(vod);
  };

  const getThumbnailUrl = (vod: VOD) => {
    if (vod.thumbnail_url) {
      return vod.thumbnail_url;
    }
    
    if (vod.video_platform === "youtube" && vod.embed_id) {
      return `https://img.youtube.com/vi/${vod.embed_id}/maxresdefault.jpg`;
    }
    
    if (vod.video_platform === "twitch" && vod.embed_id) {
      return `https://static-cdn.jtvnw.net/cf_vods/d1m7jfoe9zdc1j/${vod.embed_id}/thumb/thumb0.jpg`;
    }
    
    return "/placeholder.svg";
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="text-center">
          <StandardHeading level="h1" className="mb-4">Tournament VODs</StandardHeading>
          <StandardText className="text-muted-foreground max-w-2xl mx-auto">
            Watch highlights and full matches from past tournaments featuring top-tier gameplay and professional commentary.
          </StandardText>
        </div>

        <PageCard>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <StandardInput
                placeholder="Search VODs by title, tournament, casters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg aspect-video mb-4"></div>
                  <div className="space-y-2">
                    <div className="bg-muted h-4 rounded w-3/4"></div>
                    <div className="bg-muted h-3 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVods.length === 0 ? (
            <div className="text-center py-12">
              <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <StandardHeading level="h3" className="mb-2">
                {searchTerm ? "No VODs found" : "No VODs available"}
              </StandardHeading>
              <StandardText className="text-muted-foreground">
                {searchTerm 
                  ? "Try adjusting your search terms or browse all VODs."
                  : "Check back later for tournament highlights and matches."
                }
              </StandardText>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVods.map((vod) => (
                <div
                  key={vod.id}
                  className="group cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:border-primary transition-all duration-200 hover:shadow-lg"
                  onClick={() => handleVodClick(vod)}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={getThumbnailUrl(vod)}
                      alt={vod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-2 left-2 flex gap-2">
                      {vod.is_featured && (
                        <StandardBadge status="warning" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </StandardBadge>
                      )}
                      <StandardBadge status="info" className="bg-background/80 backdrop-blur-sm">
                        {vod.video_platform === "youtube" ? (
                          <Youtube className="w-3 h-3 mr-1" />
                        ) : (
                          <Twitch className="w-3 h-3 mr-1" />
                        )}
                        {vod.video_platform}
                      </StandardBadge>
                    </div>
                    {vod.duration_minutes && (
                      <div className="absolute bottom-2 right-2">
                        <StandardBadge status="neutral" className="bg-black/80 text-white border-none">
                          {formatDuration(vod.duration_minutes)}
                        </StandardBadge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <StandardHeading level="h4" className="mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {vod.title}
                    </StandardHeading>
                    
                    {vod.tournaments && (
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <StandardText className="text-sm text-muted-foreground">
                          {vod.tournaments.name}
                        </StandardText>
                      </div>
                    )}
                    
                    {vod.description && (
                      <StandardText className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {vod.description}
                      </StandardText>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(vod.created_at)}</span>
                      <span>{vod.view_count} views</span>
                    </div>
                    
                    {(vod.casters && vod.casters.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <StandardText className="text-xs text-muted-foreground">
                          Casters: {vod.casters.join(", ")}
                        </StandardText>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        {selectedVod && (
          <VODModal
            vod={selectedVod}
            isOpen={!!selectedVod}
            onClose={() => setSelectedVod(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}