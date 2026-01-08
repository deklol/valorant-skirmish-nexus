import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  Settings, User, Save, RefreshCw, Eye, EyeOff, Bell,
  Twitter, Twitch, Shield, ArrowLeft, Target, Users,
  CheckCircle, Crown, Power, PowerOff, Star
} from "lucide-react";
import { useNameEffects, getNameEffectStyles } from "@/hooks/useNameEffects";
import { useShopContext, ShopProvider } from "@/contexts/ShopContext";

// Role options
const VALORANT_ROLES = ['Duelist', 'Controller', 'Initiator', 'Sentinel'];

// Agent options
const VALORANT_AGENTS = [
  'Brimstone', 'Viper', 'Omen', 'Killjoy', 'Cypher', 'Sova', 'Sage', 
  'Phoenix', 'Jett', 'Reyna', 'Raze', 'Breach', 'Skye', 'Yoru', 
  'Astra', 'KAY/O', 'Chamber', 'Neon', 'Fade', 'Harbor', 'Gekko', 
  'Deadlock', 'Iso', 'Clove', 'Vyse', 'Tejo'
];

const getRoleColorClass = (role: string) => {
  switch (role) {
    case 'Duelist': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'Controller': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case 'Initiator': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'Sentinel': return 'text-green-400 bg-green-500/20 border-green-500/30';
    default: return 'text-[hsl(var(--beta-text-muted))] bg-[hsl(var(--beta-surface-4))]';
  }
};

// Name Effects Section Component
const NameEffectsSection = () => {
  const { user, profile } = useAuth();
  const { getPurchasedNameEffects, activateNameEffect, deactivateNameEffect, activating } = useShopContext();
  const { nameEffect: currentEffect } = useNameEffects(user?.id || null);
  const [activeEffectPurchaseId, setActiveEffectPurchaseId] = useState<string | null>(null);

  const purchasedEffects = getPurchasedNameEffects();

  useEffect(() => {
    if (!user || !currentEffect) {
      setActiveEffectPurchaseId(null);
      return;
    }

    const fetchActiveEffect = async () => {
      const { data } = await supabase
        .from('user_active_effects')
        .select('purchase_id')
        .eq('user_id', user.id)
        .eq('effect_type', 'name_effect')
        .single();

      setActiveEffectPurchaseId(data?.purchase_id || null);
    };

    fetchActiveEffect();
  }, [user, currentEffect]);

  const getPreviewStyle = (itemData: any) => {
    if (!itemData) return {};
    
    if (itemData.color) {
      return {
        color: itemData.color,
        fontWeight: itemData.weight || '600',
        textShadow: `0 0 8px ${itemData.color}60`
      };
    }
    
    if (!itemData.style) return {};
    
    const style = itemData.style;
    
    switch (style) {
      case 'galaxy':
        return {
          background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(168, 85, 247), rgb(99, 102, 241))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: '600'
        };
      case 'fire':
        return {
          background: 'linear-gradient(to right, rgb(239, 68, 68), rgb(249, 115, 22), rgb(234, 179, 8))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: '600'
        };
      case 'neon':
        return {
          color: 'rgb(34, 197, 94)',
          textShadow: '0 0 10px rgba(34, 197, 94, 0.9)',
          fontWeight: 'bold'
        };
      case 'golden':
        return {
          color: 'rgb(255, 215, 0)',
          textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
          fontWeight: '600'
        };
      default:
        return {};
    }
  };

  if (purchasedEffects.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Star className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Name Effects</h3>
        </div>
        <p className="text-[hsl(var(--beta-text-muted))] mb-4">
          You don't have any name effects yet. Visit the shop to purchase one!
        </p>
        <Link to="/beta/shop">
          <BetaButton variant="outline" size="sm">Browse Shop</BetaButton>
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Crown className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
        <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Your Name Effects</h3>
        <BetaBadge variant="accent" size="sm">{purchasedEffects.length} owned</BetaBadge>
      </div>
      
      <p className="text-[hsl(var(--beta-text-muted))] text-sm mb-4">
        Activate one of your purchased name effects. Only one can be active at a time.
      </p>

      <div className="space-y-3">
        {/* Deactivate option */}
        {activeEffectPurchaseId && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
            <div>
              <p className="font-medium text-[hsl(var(--beta-text-primary))]">No Effect</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Use default username appearance</p>
            </div>
            <BetaButton
              variant="outline"
              size="sm"
              onClick={() => deactivateNameEffect()}
              disabled={activating === 'deactivating'}
            >
              <PowerOff className="w-4 h-4 mr-2" />
              {activating === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
            </BetaButton>
          </div>
        )}

        {purchasedEffects.map((purchase: any) => {
          const isActive = activeEffectPurchaseId === purchase.id;
          const isActivating = activating === purchase.id;
          
          return (
            <div
              key={purchase.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive 
                  ? 'bg-[hsl(var(--beta-accent)/0.1)] border-[hsl(var(--beta-accent)/0.5)]' 
                  : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))] hover:bg-[hsl(var(--beta-surface-4))]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-[hsl(var(--beta-text-primary))]">
                      {purchase.shop_items.name}
                    </p>
                    {isActive && (
                      <BetaBadge variant="success" size="sm">
                        <Power className="w-3 h-3 mr-1" />
                        Active
                      </BetaBadge>
                    )}
                  </div>
                  
                  <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-2">
                    {purchase.shop_items.description}
                  </p>

                  <div className="p-2 rounded-lg bg-[hsl(var(--beta-surface-2))]">
                    <span className="text-xs text-[hsl(var(--beta-text-muted))]">Preview: </span>
                    <span style={getPreviewStyle(purchase.shop_items.item_data)}>
                      {profile?.discord_username || "Your Username"}
                    </span>
                  </div>
                </div>

                <div className="ml-4">
                  {isActive ? (
                    <BetaButton
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateNameEffect()}
                      disabled={activating === 'deactivating'}
                    >
                      <PowerOff className="w-4 h-4" />
                    </BetaButton>
                  ) : (
                    <BetaButton
                      size="sm"
                      onClick={() => activateNameEffect(purchase.id)}
                      disabled={!!activating}
                    >
                      <Power className="w-4 h-4 mr-1" />
                      {isActivating ? '...' : 'Activate'}
                    </BetaButton>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

const ProfileSettingsContent = () => {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [refreshingRank, setRefreshingRank] = useState(false);
  
  const [formData, setFormData] = useState({
    bio: '',
    twitter_handle: '',
    twitch_handle: '',
    profile_visibility: 'public',
    valorant_agent: '',
    valorant_role: '',
    status_message: '',
    looking_for_team: false
  });

  useEffect(() => {
    if (authProfile) {
      setFormData({
        bio: (authProfile as any).bio || '',
        twitter_handle: (authProfile as any).twitter_handle || '',
        twitch_handle: (authProfile as any).twitch_handle || '',
        profile_visibility: (authProfile as any).profile_visibility || 'public',
        valorant_agent: (authProfile as any).valorant_agent || '',
        valorant_role: (authProfile as any).valorant_role || '',
        status_message: (authProfile as any).status_message || '',
        looking_for_team: (authProfile as any).looking_for_team || false
      });
    }
  }, [authProfile]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          bio: formData.bio,
          twitter_handle: formData.twitter_handle,
          twitch_handle: formData.twitch_handle,
          profile_visibility: formData.profile_visibility,
          valorant_agent: formData.valorant_agent,
          valorant_role: formData.valorant_role as any,
          status_message: formData.status_message,
          looking_for_team: formData.looking_for_team
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshRank = async () => {
    if (!user || !(authProfile as any)?.riot_id) {
      toast({
        title: "No Riot ID",
        description: "Please set your Riot ID first",
        variant: "destructive",
      });
      return;
    }

    setRefreshingRank(true);
    try {
      const { error } = await supabase.functions.invoke('scrape-rank', {
        body: { riot_id: (authProfile as any).riot_id, user_id: user.id }
      });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Rank refreshed",
        description: "Your rank data has been updated",
      });
    } catch (error: any) {
      console.error('Error refreshing rank:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh rank data",
        variant: "destructive",
      });
    } finally {
      setRefreshingRank(false);
    }
  };

  if (!user) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <GlassCard className="p-12 text-center">
            <User className="w-16 h-16 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Login Required
            </h2>
            <p className="text-[hsl(var(--beta-text-muted))] mb-6">
              Please log in to access your profile settings.
            </p>
            <Link to="/login">
              <BetaButton>Login</BetaButton>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Back Navigation */}
        <Link 
          to="/beta/profile" 
          className="inline-flex items-center gap-2 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
              <Settings className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))]">Profile Settings</h1>
              <p className="text-[hsl(var(--beta-text-muted))]">Manage your account and preferences</p>
            </div>
          </div>
          
          <BetaButton onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </BetaButton>
        </div>

        {/* Rank & Riot ID Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Rank & Riot ID</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))]">
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">Riot ID</p>
              <p className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
                {(authProfile as any)?.riot_id || 'Not set'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[hsl(var(--beta-surface-3))]">
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">Current Rank</p>
              <p className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
                {(authProfile as any)?.current_rank || 'Unranked'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <BetaButton 
              variant="outline" 
              size="sm"
              onClick={handleRefreshRank}
              disabled={refreshingRank}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshingRank ? 'animate-spin' : ''}`} />
              {refreshingRank ? 'Refreshing...' : 'Refresh Rank'}
            </BetaButton>
          </div>
        </GlassCard>

        {/* Personal Info */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Personal Info</h3>
          </div>
          
          <div className="space-y-4">
            {/* Status Message */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                Status Message
              </label>
              <input
                type="text"
                value={formData.status_message}
                onChange={(e) => setFormData(prev => ({ ...prev, status_message: e.target.value }))}
                placeholder="What's on your mind?"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))] resize-none"
              />
            </div>

            {/* Looking for Team */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, looking_for_team: !prev.looking_for_team }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.looking_for_team 
                    ? 'bg-[hsl(var(--beta-success))]' 
                    : 'bg-[hsl(var(--beta-surface-4))]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.looking_for_team ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">Looking for Team</p>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Show LFT badge on your profile</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Valorant Settings */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Valorant Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                Primary Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VALORANT_ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setFormData(prev => ({ ...prev, valorant_role: role }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      formData.valorant_role === role
                        ? getRoleColorClass(role) + ' border-current'
                        : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                Main Agent
              </label>
              <select
                value={formData.valorant_agent}
                onChange={(e) => setFormData(prev => ({ ...prev, valorant_agent: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
              >
                <option value="">Select an agent</option>
                {VALORANT_AGENTS.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Social Links */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Social Links</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                <Twitter className="w-4 h-4 inline mr-2" />
                Twitter Handle
              </label>
              <input
                type="text"
                value={formData.twitter_handle}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter_handle: e.target.value }))}
                placeholder="@username"
                className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
                <Twitch className="w-4 h-4 inline mr-2" />
                Twitch Handle
              </label>
              <input
                type="text"
                value={formData.twitch_handle}
                onChange={(e) => setFormData(prev => ({ ...prev, twitch_handle: e.target.value }))}
                placeholder="username"
                className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
              />
            </div>
          </div>
        </GlassCard>

        {/* Privacy */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {formData.profile_visibility === 'private' ? (
              <EyeOff className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            ) : (
              <Eye className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            )}
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Privacy</h3>
          </div>
          
          <div className="flex gap-3">
            {['public', 'private'].map(visibility => (
              <button
                key={visibility}
                onClick={() => setFormData(prev => ({ ...prev, profile_visibility: visibility }))}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  formData.profile_visibility === visibility
                    ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))] border-[hsl(var(--beta-accent))]'
                    : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]'
                }`}
              >
                {visibility === 'public' && <Eye className="w-4 h-4 inline mr-2" />}
                {visibility === 'private' && <EyeOff className="w-4 h-4 inline mr-2" />}
                {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-2">
            {formData.profile_visibility === 'private' 
              ? "Your profile is hidden from other players" 
              : "Your profile is visible to everyone"}
          </p>
        </GlassCard>

        {/* Name Effects */}
        <NameEffectsSection />
      </div>
    </GradientBackground>
  );
};

const BetaProfileSettings = () => (
  <ShopProvider>
    <ProfileSettingsContent />
  </ShopProvider>
);

export default BetaProfileSettings;
