import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components-beta/ui-beta";
import { Building2, Calendar } from "lucide-react";

interface OrgContent {
  org_name: string | null;
  org_tagline: string | null;
  org_about: string | null;
  org_image_url: string | null;
  org_history_enabled: boolean | null;
  org_history_title: string | null;
  org_history_content: string | null;
  org_founded_year: number | null;
  show_org_section: boolean | null;
}

const BetaOrgAboutSection = () => {
  const [content, setContent] = useState<OrgContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("org_name, org_tagline, org_about, org_image_url, org_history_enabled, org_history_title, org_history_content, org_founded_year, show_org_section")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setContent(data);
      }
      setLoading(false);
    };

    fetchContent();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("beta-homepage-org-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "homepage_content",
        },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[hsl(var(--beta-surface-3))] rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-[hsl(var(--beta-surface-3))] rounded w-2/3 mx-auto"></div>
        </div>
      </section>
    );
  }

  // Don't render if section is disabled or no content
  if (!content?.show_org_section || !content.org_name) {
    return null;
  }

  return (
    <section className="space-y-6" aria-labelledby="org-about-heading">
      <div className="text-center max-w-2xl mx-auto">
        <h2 id="org-about-heading" className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-3">
          About {content.org_name}
        </h2>
        {content.org_tagline && (
          <p className="text-[hsl(var(--beta-text-secondary))]">
            {content.org_tagline}
          </p>
        )}
      </div>

      <div className={`grid gap-6 ${content.org_image_url ? "lg:grid-cols-2" : "max-w-3xl mx-auto"}`}>
        {/* Image Section */}
        {content.org_image_url && (
          <div className="relative rounded-[var(--beta-radius-lg)] overflow-hidden border border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-2))]">
            <img
              src={content.org_image_url}
              alt={`${content.org_name} team`}
              className="w-full h-full object-cover min-h-[280px] lg:min-h-[350px]"
            />
            {content.org_founded_year && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[hsl(var(--beta-surface-1)/0.9)] backdrop-blur-sm rounded-full px-4 py-2 border border-[hsl(var(--beta-border))]">
                <Calendar className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                <span className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">
                  Est. {content.org_founded_year}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="space-y-4">
          {/* About Card */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
              </div>
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Who We Are</h3>
            </div>
            <p className="text-[hsl(var(--beta-text-secondary))] leading-relaxed">
              {content.org_about}
            </p>
            {!content.org_image_url && content.org_founded_year && (
              <div className="mt-4 flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
                <Calendar className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                <span className="text-sm">Founded in {content.org_founded_year}</span>
              </div>
            )}
          </GlassCard>

          {/* History Card */}
          {content.org_history_enabled && content.org_history_content && (
            <GlassCard className="p-5">
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-3">
                {content.org_history_title || "Our Story"}
              </h3>
              <p className="text-[hsl(var(--beta-text-secondary))] leading-relaxed whitespace-pre-line">
                {content.org_history_content}
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </section>
  );
};

export default BetaOrgAboutSection;
