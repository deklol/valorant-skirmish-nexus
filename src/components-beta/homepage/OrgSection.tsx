import { GlassCard } from "@/components-beta/ui-beta";
import { Building2, Calendar, Users } from "lucide-react";

interface OrgSectionProps {
  orgName: string | null;
  orgTagline: string | null;
  orgAbout: string | null;
  orgImageUrl: string | null;
  orgFoundedYear: number | null;
  historyEnabled: boolean | null;
  historyTitle: string | null;
  historyContent: string | null;
}

export const OrgSection = ({
  orgName,
  orgTagline,
  orgAbout,
  orgImageUrl,
  orgFoundedYear,
  historyEnabled,
  historyTitle,
  historyContent,
}: OrgSectionProps) => {
  if (!orgName && !orgAbout) return null;

  return (
    <section className="space-y-6">
      {/* Main Org Card */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Side */}
          <div className="relative h-64 md:h-auto min-h-[300px]">
            {orgImageUrl ? (
              <img
                src={orgImageUrl}
                alt={orgName || "Organization"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--beta-accent)/0.2)] to-[hsl(var(--beta-surface-3))] flex items-center justify-center">
                <Building2 className="w-20 h-20 text-[hsl(var(--beta-accent)/0.5)]" />
              </div>
            )}
            {/* Gradient overlay for text readability on image side */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[hsl(var(--beta-surface-2))] md:block hidden" />
          </div>

          {/* Content Side */}
          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="space-y-4">
              {orgTagline && (
                <span className="text-sm font-medium text-[hsl(var(--beta-accent))] uppercase tracking-wider">
                  {orgTagline}
                </span>
              )}
              
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--beta-text-primary))]">
                {orgName || "Our Organization"}
              </h2>
              
              {orgAbout && (
                <p className="text-[hsl(var(--beta-text-secondary))] leading-relaxed">
                  {orgAbout}
                </p>
              )}

              {orgFoundedYear && (
                <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Established {orgFoundedYear}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* History Section */}
      {historyEnabled && historyContent && (
        <GlassCard className="p-6 md:p-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h3 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
              {historyTitle || "Our Story"}
            </h3>
            <p className="text-[hsl(var(--beta-text-secondary))] leading-relaxed whitespace-pre-line">
              {historyContent}
            </p>
          </div>
        </GlassCard>
      )}
    </section>
  );
};

export default OrgSection;
