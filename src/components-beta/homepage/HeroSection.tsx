import { Link } from "react-router-dom";
import { BetaButton } from "@/components-beta/ui-beta";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  headline: string | null;
  subheadline: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  imageUrl: string | null;
}

export const HeroSection = ({
  headline,
  subheadline,
  ctaText,
  ctaLink,
  imageUrl,
}: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden rounded-[var(--beta-radius-xl)] border border-[hsl(var(--beta-border))]">
      {/* Background Image */}
      {imageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--beta-surface-1))] via-[hsl(var(--beta-surface-1)/0.9)] to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--beta-accent)/0.1)] via-[hsl(var(--beta-surface-2))] to-[hsl(var(--beta-surface-1))]" />
      )}
      
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[hsl(var(--beta-accent)/0.1)] blur-3xl rounded-full" />
      
      {/* Content */}
      <div className="relative z-10 p-8 md:p-12 lg:p-16">
        <div className="max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[hsl(var(--beta-accent)/0.3)] bg-[hsl(var(--beta-accent)/0.1)]">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--beta-accent))]" />
            <span className="text-xs font-medium text-[hsl(var(--beta-accent))]">
              Powered by ATLAS Balancing
            </span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[hsl(var(--beta-text-primary))]">
            {headline || "Welcome to TLR Skirmish Hub"}
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[hsl(var(--beta-text-secondary))] leading-relaxed">
            {subheadline || "Join the #1 competitive Valorant tournament community. Free-to-enter events with prizes, live brackets, and fair team balancing."}
          </p>
          
          {/* CTAs */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link to={ctaLink || "/beta/tournaments"}>
              <BetaButton variant="primary" size="lg">
                <Trophy className="w-4 h-4 mr-2" />
                {ctaText || "Browse Tournaments"}
              </BetaButton>
            </Link>
            <Link to="/beta/leaderboard">
              <BetaButton variant="outline" size="lg">
                View Leaderboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </BetaButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
