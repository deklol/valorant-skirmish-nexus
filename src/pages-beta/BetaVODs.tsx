import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { Video, Play, Calendar, Trophy, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const BetaVODs = () => {
  const { data: vods, isLoading } = useQuery({
    queryKey: ['beta-vods'],
    queryFn: async () => {
      // Get featured VODs from app_settings or a dedicated table
      // For now, get recent completed tournaments with potential VOD content
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, name, start_time, status, banner_image_url')
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(12);
      
      return tournaments || [];
    }
  });

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Video className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading VODs...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
            <Video className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
              VODs & Highlights
            </h1>
            <p className="text-[hsl(var(--beta-text-secondary))]">
              Watch past tournaments and epic moments
            </p>
          </div>
        </div>

        {/* Featured Section */}
        {vods && vods.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              Recent Tournaments
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vods.map((tournament, index) => (
                <Link 
                  key={tournament.id} 
                  to={`/beta/tournament/${tournament.id}`}
                  className="beta-animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <GlassCard hover className="overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-[hsl(var(--beta-surface-4))]">
                      {tournament.banner_image_url ? (
                        <img 
                          src={tournament.banner_image_url} 
                          alt={tournament.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))]" />
                        </div>
                      )}
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-[hsl(var(--beta-accent))] flex items-center justify-center">
                          <Play className="w-6 h-6 text-[hsl(var(--beta-surface-1))] ml-1" />
                        </div>
                      </div>
                      
                      {/* Badge */}
                      <div className="absolute top-2 right-2">
                        <BetaBadge variant="success" size="sm">Completed</BetaBadge>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors line-clamp-2 mb-2">
                        {tournament.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-muted))]">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(tournament.start_time), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon Section */}
        <GlassCard className="p-8 text-center">
          <Video className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
            More VODs Coming Soon
          </h3>
          <p className="text-[hsl(var(--beta-text-muted))] max-w-md mx-auto mb-4">
            We're working on integrating full VOD support with timestamps, highlights, and player POVs.
          </p>
          <a 
            href="https://twitch.tv" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[hsl(var(--beta-accent))] hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Watch Live on Twitch
          </a>
        </GlassCard>
      </div>
    </GradientBackground>
  );
};

export default BetaVODs;
