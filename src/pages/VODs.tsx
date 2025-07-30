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
    
    // Attempt to parse embed_id from video_url if not already present
    let embedId = vod.embed_id;
    if (!embedId && vod.video_url) {
        if (vod.video_platform === "youtube") {
            const youtubeMatch = vod.video_url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/);
            if (youtubeMatch && youtubeMatch[1]) {
                embedId = youtubeMatch[1];
            }
        } else if (vod.video_platform === "twitch") {
            const twitchMatch = vod.video_url.match(/(?:https?:\/\/)?(?:www\.)?twitch\.tv\/videos\/(\d+)/);
            if (twitchMatch && twitchMatch[1]) {
                embedId = twitchMatch[1];
            }
        }
    }

    if (vod.video_platform === "youtube" && embedId) {
      return `https://img.youtube.com/vi/${embedId}/maxresdefault.jpg`;
    }
    
    if (vod.video_platform === "twitch" && embedId) {
      // Twitch VOD thumbnails often require a specific format including the timestamp
      // This is a common pattern, but might need adjustment based on actual Twitch API
      // For simplicity, using a generic thumb0.jpg, but ideally, you'd get the exact one.
      return `https://static-cdn.jtvnw.net/cf_vods/d1m7jfoe9zdc1j/${embedId}/thumb/thumb0.jpg`;
    }
    
    // Placeholder image if no thumbnail or embed_id can be determined
    return "https://placehold.co/1280x720/1f2937/d1d5db?text=No+Thumbnail";
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
      <div className="space-y-10 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Added max-w, mx-auto, and padding */}
        <div className="text-center">
          <StandardHeading level="h1" className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">Tournament VODs</StandardHeading>
          <StandardText className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Watch highlights and full matches from past tournaments featuring top-tier gameplay and professional commentary.
          </StandardText>
        </div>

        <PageCard className="p-6 sm:p-8"> {/* Increased padding for PageCard */}
          <div className="flex items-center gap-4 mb-8"> {/* Increased bottom margin for search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" /> {/* Slightly larger icon */}
              <StandardInput
                placeholder="Search VODs by title, tournament, casters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 text-base rounded-md border border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" // Adjusted padding and styling for input
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg overflow-hidden border border-border bg-card shadow-sm min-h-[250px]"> {/* Added min-h for consistent loading height */}
                  <div className="bg-muted rounded-t-lg aspect-video mb-4"></div>
                  <div className="p-4 space-y-3">
                    <div className="bg-muted h-5 rounded w-3/4"></div>
                    <div className="bg-muted h-4 rounded w-1/2"></div>
                    <div className="bg-muted h-3 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVods.length === 0 ? (
            <div className="text-center py-16"> {/* Increased vertical padding */}
              <Play className="w-16 h-16 text-muted-foreground mx-auto mb-6" /> {/* Larger icon */}
              <StandardHeading level="h3" className="mb-3 text-2xl font-semibold">
                {searchTerm ? "No VODs found" : "No VODs available"}
              </StandardHeading>
              <StandardText className="text-muted-foreground text-base max-w-md mx-auto">
                {searchTerm 
                  ? "Try adjusting your search terms or browse all VODs."
                  : "Check back later for tournament highlights and matches."
                }
              </StandardText>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        e.currentTarget.src = "https://placehold.co/1280x720/1f2937/d1d5db?text=No+Thumbnail"; // Fallback placeholder
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <Play className="w-14 h-14 text-white" /> {/* Slightly larger play icon */}
                    </div>
                    <div className="absolute top-3 left-3 flex gap-2"> {/* Adjusted top/left for badges */}
                      {vod.is_featured && (
                        <StandardBadge status="warning" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-2 py-1 text-xs font-medium">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </StandardBadge>
                      )}
                      <StandardBadge status="info" className="bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium">
                        {vod.video_platform === "youtube" ? (
                          <Youtube className="w-3 h-3 mr-1" />
                        ) : (
                          <Twitch className="w-3 h-3 mr-1" />
                        )}
                        {vod.video_platform}
                      </StandardBadge>
                    </div>
                    {vod.duration_minutes && (
                      <div className="absolute bottom-3 right-3"> {/* Adjusted bottom/right for duration badge */}
                        <StandardBadge status="neutral" className="bg-black/80 text-white border-none px-2 py-1 text-xs font-medium">
                          {formatDuration(vod.duration_minutes)}
                        </StandardBadge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 sm:p-5 space-y-2"> {/* Adjusted padding and spacing */}
                    <StandardHeading level="h4" className="text-lg font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {vod.title}
                    </StandardHeading>
                    
                    {vod.tournaments && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {/* Slightly larger icon */}
                        <StandardText className="text-sm text-muted-foreground">
                          {vod.tournaments.name}
                        </StandardText>
                      </div>
                    )}
                    
                    {vod.description && (
                      <StandardText className="text-sm text-muted-foreground line-clamp-2">
                        {vod.description}
                      </StandardText>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border mt-3"> {/* Added top border and margin */}
                      <span>{formatDate(vod.created_at)}</span>
                      <span>{vod.view_count} views</span>
                    </div>
                    
                    {(vod.casters && vod.casters.length > 0) && (
                      <div className="pt-2"> {/* Adjusted padding */}
                        <StandardText className="text-xs text-muted-foreground line-clamp-1">
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
