import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, Shield, Users, Trophy, Map, Video, Award, Wrench,
  MessageSquare, BarChart3, Bot, Activity, FileText, BookOpen,
  Plus, RefreshCw, Play, TestTube, ArrowLeft, ChevronRight, Stethoscope
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Import existing medic and admin components
import TournamentManagement from "@/components/TournamentManagement";
import UserManagement from "@/components/UserManagement";
import MapManager from "@/components/MapManager";
import SponsorManager from "@/components/admin/SponsorManager";
import { VODManager } from "@/components/admin/VODManager";
import TournamentMedicManager from "@/components/TournamentMedicManager";
import VetoMedicManager from "@/components/VetoMedicManager";
import BracketMedicManager from "@/components/BracketMedicManager";
import { BetaBracketRepairTool, AdminAlertCenter } from "@/components-beta/admin";
import MatchMedicManager from "@/components/MatchMedicManager";
import AchievementMedicManager from "@/components/AchievementMedicManager";
import { ShopMedicManager } from "@/components/admin/ShopMedicManager";
import { TeamSessionMedicManager } from "@/components/TeamSessionMedicManager";
import StatisticsMedicManager from "@/components/medic-enhanced/StatisticsMedicManager";
import EnhancedDiscordIntegration from "@/components/medic-enhanced/EnhancedDiscordIntegration";
import AdvancedMonitoringSystem from "@/components/medic-enhanced/AdvancedMonitoringSystem";
import AuditLogManager from "@/components/admin/AuditLogManager";
import AppSettingsManager from "@/components/admin/AppSettingsManager";
import DiscordWebhookManager from "@/components/DiscordWebhookManager";
import AdminLogoutAll from "@/components/AdminLogoutAll";
import SendNotificationTestButton from "@/components/SendNotificationTestButton";
import SchemaExportButton from "@/components/admin/SchemaExportButton";
import StatisticsManager from "@/components/admin/StatisticsManager";
import { RankWeightSyncManager } from "@/components/admin/RankWeightSyncManager";
import AdminHelpTab from "@/components/admin/AdminHelpTab";
import CreateTournamentDialog from "@/components/CreateTournamentDialog";
import { BetaDisputeManager } from "@/components-beta/dispute";

// Tab configuration
const adminTabs = [
  { id: "overview", label: "Overview", icon: <Settings className="w-4 h-4" />, category: "main" },
  { id: "tournaments", label: "Tournaments", icon: <Trophy className="w-4 h-4" />, category: "management" },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, category: "management" },
  { id: "maps", label: "Maps", icon: <Map className="w-4 h-4" />, category: "management" },
  { id: "sponsors", label: "Sponsors", icon: <Trophy className="w-4 h-4" />, category: "management" },
  { id: "vods", label: "VODs", icon: <Video className="w-4 h-4" />, category: "management" },
  { id: "disputes", label: "Disputes", icon: <MessageSquare className="w-4 h-4" />, category: "management" },
  { id: "tournament-medic", label: "Tournament Medic", icon: <Stethoscope className="w-4 h-4" />, category: "medic" },
  { id: "veto-medic", label: "Veto Medic", icon: <MessageSquare className="w-4 h-4" />, category: "medic" },
  { id: "bracket-medic", label: "Bracket Medic", icon: <Wrench className="w-4 h-4" />, category: "medic" },
  { id: "match-medic", label: "Match Medic", icon: <Shield className="w-4 h-4" />, category: "medic" },
  { id: "achievement-medic", label: "Achievement Medic", icon: <Award className="w-4 h-4" />, category: "medic" },
  { id: "shop-medic", label: "Shop Medic", icon: <Settings className="w-4 h-4" />, category: "medic" },
  { id: "team-medic", label: "Team Session Medic", icon: <Users className="w-4 h-4" />, category: "medic" },
  { id: "stats-medic", label: "Stats Medic", icon: <BarChart3 className="w-4 h-4" />, category: "medic" },
  { id: "discord", label: "Discord", icon: <Bot className="w-4 h-4" />, category: "system" },
  { id: "monitoring", label: "Monitoring", icon: <Activity className="w-4 h-4" />, category: "system" },
  { id: "audit-log", label: "Audit Logs", icon: <FileText className="w-4 h-4" />, category: "system" },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" />, category: "system" },
  { id: "help", label: "Help", icon: <BookOpen className="w-4 h-4" />, category: "system" },
];

// Tab Category Labels
const categoryLabels: Record<string, string> = {
  main: "Main",
  management: "Management",
  medic: "Medic Tools",
  system: "System",
};

const BetaAdmin = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);

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

  // Group tabs by category
  const groupedTabs = adminTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, typeof adminTabs>);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onCreateTournament={() => setCreateTournamentOpen(true)} onNavigateTab={setActiveTab} />;
      case "tournaments":
        return <TournamentManagement />;
      case "users":
        return <UserManagement />;
      case "maps":
        return <MapManager />;
      case "sponsors":
        return <SponsorManager />;
      case "vods":
        return <VODManager />;
      case "disputes":
        return <BetaDisputeManager />;
      case "tournament-medic":
        return <TournamentMedicManager />;
      case "veto-medic":
        return <VetoMedicManager />;
      case "bracket-medic":
        return <BracketMedicWithSelector />;
      case "match-medic":
        return <MatchMedicManager />;
      case "achievement-medic":
        return <AchievementMedicManager />;
      case "shop-medic":
        return <ShopMedicManager />;
      case "team-medic":
        return <TeamSessionMedicManager />;
      case "stats-medic":
        return <StatisticsMedicManager />;
      case "discord":
        return <EnhancedDiscordIntegration />;
      case "monitoring":
        return <AdvancedMonitoringSystem />;
      case "audit-log":
        return <AuditLogManager />;
      case "settings":
        return <SettingsTab />;
      case "help":
        return <AdminHelpTab />;
      default:
        return <OverviewTab onCreateTournament={() => setCreateTournamentOpen(true)} onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <GradientBackground>
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--beta-surface-1)/0.95)] backdrop-blur-md border-b border-[hsl(var(--beta-border))]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
                  <Shield className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">
                    Admin Panel
                  </h1>
                  <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                    Manage tournaments, users, and system settings
                  </p>
                </div>
              </div>
              <BetaButton onClick={() => setCreateTournamentOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </BetaButton>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 shrink-0">
              <GlassCard className="p-3 lg:sticky lg:top-28">
                <nav className="space-y-4">
                  {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-[hsl(var(--beta-text-muted))] uppercase tracking-wider px-3 mb-2">
                        {categoryLabels[category]}
                      </p>
                      <div className="space-y-1">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              activeTab === tab.id
                                ? "bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]"
                                : "text-[hsl(var(--beta-text-secondary))] hover:bg-[hsl(var(--beta-surface-3))] hover:text-[hsl(var(--beta-text-primary))]"
                            }`}
                          >
                            {tab.icon}
                            <span className="truncate">{tab.label}</span>
                            {activeTab === tab.id && (
                              <ChevronRight className="w-4 h-4 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </GlassCard>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {renderTabContent()}
            </main>
          </div>
        </div>
      </div>

      <CreateTournamentDialog
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
        onTournamentCreated={() => setCreateTournamentOpen(false)}
      />
    </GradientBackground>
  );
};

// Overview Tab Component
const OverviewTab = ({ onCreateTournament, onNavigateTab }: { onCreateTournament: () => void; onNavigateTab: (tab: string) => void }) => {
  const [stats, setStats] = useState({ activeTournaments: 0, totalUsers: 0, liveMatches: 0, pendingActions: 0 });
  
  useEffect(() => {
    const fetchStats = async () => {
      const [tournamentsRes, usersRes, liveMatchesRes] = await Promise.all([
        supabase.from("tournaments").select("id", { count: "exact", head: true }).in("status", ["open", "live", "balancing"]),
        supabase.from("public_user_profiles").select("id", { count: "exact", head: true }).eq("is_phantom", false),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live"),
      ]);
      setStats({
        activeTournaments: tournamentsRes.count || 0,
        totalUsers: usersRes.count || 0,
        liveMatches: liveMatchesRes.count || 0,
        pendingActions: 0,
      });
    };
    fetchStats();
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Admin Alert Center - Top Priority */}
      <AdminAlertCenter />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard 
          label="Active Tournaments" 
          value={stats.activeTournaments} 
          icon={<Trophy className="w-5 h-5 text-yellow-400" />}
        />
        <QuickStatCard 
          label="Total Users" 
          value={stats.totalUsers} 
          icon={<Users className="w-5 h-5 text-blue-400" />}
        />
        <QuickStatCard 
          label="Live Matches" 
          value={stats.liveMatches} 
          icon={<Activity className="w-5 h-5 text-red-400" />}
        />
        <QuickStatCard 
          label="Pending Actions" 
          value={stats.pendingActions} 
          icon={<Shield className="w-5 h-5 text-green-400" />}
        />
      </div>

      {/* Quick Actions */}
      <GlassCard variant="strong" className="p-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard 
            title="Create Tournament"
            description="Set up a new tournament event"
            icon={<Plus className="w-5 h-5" />}
            onClick={onCreateTournament}
          />
          <QuickActionCard 
            title="Run Stats Recalc"
            description="Recalculate all user statistics"
            icon={<RefreshCw className="w-5 h-5" />}
          />
          <QuickActionCard 
            title="System Health"
            description="Check system monitoring"
            icon={<Activity className="w-5 h-5" />}
          />
        </div>
      </GlassCard>

      {/* Medic Tools Overview */}
      <GlassCard variant="strong" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
            Medic Tools
          </h2>
        </div>
        <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
          Emergency repair and maintenance tools for the tournament system
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "tournament-medic", label: "Tournament", icon: <Trophy className="w-4 h-4" /> },
            { id: "bracket-medic", label: "Bracket", icon: <Wrench className="w-4 h-4" /> },
            { id: "match-medic", label: "Match", icon: <Shield className="w-4 h-4" /> },
            { id: "stats-medic", label: "Stats", icon: <BarChart3 className="w-4 h-4" /> },
            { id: "veto-medic", label: "Veto", icon: <MessageSquare className="w-4 h-4" /> },
            { id: "team-medic", label: "Team Session", icon: <Users className="w-4 h-4" /> },
            { id: "achievement-medic", label: "Achievements", icon: <Award className="w-4 h-4" /> },
            { id: "shop-medic", label: "Shop", icon: <Settings className="w-4 h-4" /> },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => onNavigateTab(tool.id)}
              className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors text-left"
            >
              <span className="text-[hsl(var(--beta-accent))]">{tool.icon}</span>
              <span className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">{tool.label}</span>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

// Quick Stat Card
const QuickStatCard = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <GlassCard className="p-4">
    <div className="flex items-center justify-between mb-2">
      {icon}
    </div>
    <p className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">{value}</p>
    <p className="text-xs text-[hsl(var(--beta-text-muted))]">{label}</p>
  </GlassCard>
);

// Quick Action Card
const QuickActionCard = ({ title, description, icon, onClick }: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  onClick?: () => void;
}) => (
  <button 
    onClick={onClick}
    className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors text-left group"
  >
    <div className="p-2 rounded-lg bg-[hsl(var(--beta-accent-subtle))] text-[hsl(var(--beta-accent))] group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
      {icon}
    </div>
    <div>
      <p className="font-medium text-[hsl(var(--beta-text-primary))]">{title}</p>
      <p className="text-xs text-[hsl(var(--beta-text-muted))]">{description}</p>
    </div>
  </button>
);

// Settings Tab Component
const SettingsTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="space-y-6">
      <AppSettingsManager />
      <DiscordWebhookManager />
    </div>
    <div className="space-y-6">
      <AdminLogoutAll />
      <SendNotificationTestButton />
      <SchemaExportButton />
      <StatisticsManager />
      <RankWeightSyncManager />
    </div>
  </div>
);

// Bracket Medic with Tournament Selector wrapper
const BracketMedicWithSelector = () => {
  const [tournaments, setTournaments] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('id, name, status')
        .in('status', ['live', 'completed', 'balancing'])
        .order('created_at', { ascending: false })
        .limit(50);
      setTournaments(data || []);
      setLoading(false);
    };
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <GlassCard className="p-8 text-center">
        <Wrench className="w-8 h-8 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
        <p className="text-[hsl(var(--beta-text-muted))]">Loading tournaments...</p>
      </GlassCard>
    );
  }

  if (!selectedTournament) {
    return (
      <GlassCard className="p-6">
        <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          Select Tournament to Repair
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTournament(t.id)}
              className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] hover:border-[hsl(var(--beta-accent))] transition-all text-left"
            >
              <p className="font-semibold text-[hsl(var(--beta-text-primary))] mb-1">{t.name}</p>
              <BetaBadge variant={t.status === 'live' ? 'accent' : t.status === 'completed' ? 'success' : 'warning'} size="sm">
                {t.status}
              </BetaBadge>
            </button>
          ))}
          {tournaments.length === 0 && (
            <p className="col-span-full text-center text-[hsl(var(--beta-text-muted))] py-8">
              No active tournaments with brackets to repair
            </p>
          )}
        </div>
      </GlassCard>
    );
  }

  const selectedName = tournaments.find(t => t.id === selectedTournament)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">{selectedName}</h2>
        </div>
        <BetaButton variant="ghost" size="sm" onClick={() => setSelectedTournament(null)}>
          ← Back to List
        </BetaButton>
      </div>
      <BetaBracketRepairTool tournamentId={selectedTournament} />
    </div>
  );
};

export default BetaAdmin;
