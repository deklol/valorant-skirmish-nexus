import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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

const OrgAboutSection = () => {
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
      .channel("homepage_content-org-updates")
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
      <section className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
        </div>
      </section>
    );
  }

  // Don't render if section is disabled or no content
  if (!content?.show_org_section || !content.org_name) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-16" aria-labelledby="org-about-heading">
      <div className="text-center mb-12">
        <h2 id="org-about-heading" className="text-3xl font-bold text-foreground mb-4">
          About {content.org_name}
        </h2>
        {content.org_tagline && (
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.org_tagline}
          </p>
        )}
      </div>

      <div className={`grid gap-8 ${content.org_image_url ? "lg:grid-cols-2" : "max-w-4xl mx-auto"}`}>
        {/* Image Section */}
        {content.org_image_url && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-card">
            <img
              src={content.org_image_url}
              alt={`${content.org_name} team`}
              className="w-full h-full object-cover min-h-[300px] lg:min-h-[400px]"
            />
            {content.org_founded_year && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 border border-border">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Est. {content.org_founded_year}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="space-y-6">
          {/* About Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-foreground">Who We Are</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {content.org_about}
              </p>
              {!content.org_image_url && content.org_founded_year && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm">Founded in {content.org_founded_year}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Card */}
          {content.org_history_enabled && content.org_history_content && (
            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-foreground">
                  {content.org_history_title || "Our Story"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {content.org_history_content}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrgAboutSection;
