import { Link } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { Settings, Shield, Construction, ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const BetaAdmin = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Access Denied
            </h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              You don't have permission to access the admin panel.
            </p>
            <Link to="/beta">
              <BetaButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </BetaButton>
            </Link>
          </GlassCard>
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
            <Settings className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
              Admin Panel
            </h1>
            <p className="text-[hsl(var(--beta-text-secondary))]">
              Beta admin features coming soon
            </p>
          </div>
        </div>

        {/* Under Construction Notice */}
        <GlassCard variant="strong" className="p-8 text-center mb-8">
          <Construction className="w-16 h-16 text-[hsl(var(--beta-accent))] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
            Beta Admin Under Construction
          </h2>
          <p className="text-[hsl(var(--beta-text-muted))] mb-6 max-w-lg mx-auto">
            The beta admin panel is currently being developed. For full admin functionality, 
            please use the production admin dashboard.
          </p>
          <Link to="/admin">
            <BetaButton>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Production Admin
            </BetaButton>
          </Link>
        </GlassCard>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin">
            <GlassCard hover className="p-6">
              <Shield className="w-8 h-8 text-[hsl(var(--beta-accent))] mb-3" />
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
                Full Admin Dashboard
              </h3>
              <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                Access tournament creation, user management, and all admin tools
              </p>
            </GlassCard>
          </Link>
          
          <Link to="/beta/tournaments">
            <GlassCard hover className="p-6">
              <Settings className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
                View Tournaments
              </h3>
              <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                Browse and manage existing tournaments in the beta interface
              </p>
            </GlassCard>
          </Link>

          <Link to="/beta/players">
            <GlassCard hover className="p-6">
              <Shield className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
                Player Directory
              </h3>
              <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                View and search all registered players
              </p>
            </GlassCard>
          </Link>
        </div>
      </div>
    </GradientBackground>
  );
};

export default BetaAdmin;
