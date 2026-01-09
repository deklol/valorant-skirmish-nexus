import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  ShoppingBag, Coins, Gift, Sparkles, Tag, 
  CheckCircle, Lock, TrendingUp, Star, Crown,
  Power, PowerOff
} from "lucide-react";
import { useNameEffects } from "@/hooks/useNameEffects";

const BetaShop = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { nameEffect: currentEffect } = useNameEffects(user?.id || null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [activeEffectPurchaseId, setActiveEffectPurchaseId] = useState<string | null>(null);

  // Fetch user points
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['beta-user-points', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('spendable_points')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch shop items
  const { data: shopItems, isLoading } = useQuery({
    queryKey: ['beta-shop-items'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('price_points', { ascending: true });
      return data || [];
    }
  });

  // Fetch user purchases with item details
  const { data: purchases, refetch: refetchPurchases } = useQuery({
    queryKey: ['beta-user-purchases-detailed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_purchases')
        .select('id, shop_item_id, status, shop_items(id, name, description, category, item_data)')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch active effect
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cosmetic': return <Sparkles className="w-5 h-5" />;
      case 'name_effect': return <Star className="w-5 h-5" />;
      case 'priority': return <TrendingUp className="w-5 h-5" />;
      default: return <Gift className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cosmetic': return 'text-purple-400 bg-purple-500/20';
      case 'name_effect': return 'text-amber-400 bg-amber-500/20';
      case 'priority': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-[hsl(var(--beta-text-muted))] bg-[hsl(var(--beta-surface-4))]';
    }
  };

  const hasPurchased = (itemId: string) => purchases?.some(p => p.shop_item_id === itemId);
  const canAfford = (price: number) => (userProfile?.spendable_points || 0) >= price;

  const handlePurchase = async (itemId: string, price: number) => {
    if (!user) return;
    
    setPurchasing(itemId);
    try {
      const { error } = await supabase.rpc('process_shop_purchase', {
        p_user_id: user.id,
        p_shop_item_id: itemId
      });

      if (error) throw error;

      toast({
        title: "Purchase successful!",
        description: "Item has been added to your inventory.",
      });

      refetchProfile();
      refetchPurchases();
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleActivateEffect = async (purchaseId: string) => {
    if (!user) return;
    
    setActivating(purchaseId);
    try {
      const { error } = await supabase.rpc('activate_name_effect', {
        p_purchase_id: purchaseId,
        p_user_id: user.id
      });

      if (error) throw error;

      setActiveEffectPurchaseId(purchaseId);
      toast({
        title: "Effect activated!",
        description: "Your name effect is now active.",
      });
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: "Activation failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const handleDeactivateEffect = async () => {
    if (!user) return;
    
    setActivating('deactivating');
    try {
      const { error } = await supabase.rpc('deactivate_name_effect', {
        p_user_id: user.id
      });

      if (error) throw error;

      setActiveEffectPurchaseId(null);
      toast({
        title: "Effect deactivated",
        description: "Your name is back to normal.",
      });
    } catch (error: any) {
      console.error('Deactivation error:', error);
      toast({
        title: "Deactivation failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const getPreviewStyle = (itemData: any): React.CSSProperties => {
    if (!itemData) return {};
    
    // Handle new format with color and weight properties (like Golden Name)
    if (itemData.color) {
      return {
        color: itemData.color,
        fontWeight: itemData.weight === 'bold' ? 'bold' : '600',
        textShadow: `0 0 8px ${itemData.color}60`
      };
    }
    
    // Handle legacy format with style property
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
      case 'ice':
        return {
          background: 'linear-gradient(to right, rgb(34, 211, 238), rgb(59, 130, 246), rgb(37, 99, 235))',
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
      case 'royal':
        return {
          background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(139, 92, 246), rgb(126, 34, 206))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        };
      case 'shadow':
        return {
          color: 'rgb(209, 213, 219)',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          fontWeight: '600'
        };
      case 'electric':
        return {
          background: 'linear-gradient(to right, rgb(250, 204, 21), rgb(59, 130, 246), rgb(34, 211, 238))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 'bold'
        };
      case 'silver':
        return {
          color: 'rgb(192, 192, 192)',
          textShadow: '0 0 5px rgba(192, 192, 192, 0.5)',
          fontWeight: '600'
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

  // Get purchased name effects
  const purchasedNameEffects = purchases?.filter(p => p.shop_items?.category === 'name_effects') || [];

  if (isLoading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <ShoppingBag className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading shop...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
              <ShoppingBag className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                Points Shop
              </h1>
              <p className="text-[hsl(var(--beta-text-secondary))]">
                Spend your hard-earned points on rewards
              </p>
            </div>
          </div>

          {/* Points Balance */}
          {user && (
            <GlassCard variant="strong" className="px-6 py-3 flex items-center gap-3">
              <Coins className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
              <div>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Your Balance</p>
                <p className="text-2xl font-bold text-[hsl(var(--beta-accent))]">
                  {userProfile?.spendable_points || 0}
                </p>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Not Logged In */}
        {!user && (
          <GlassCard className="p-8 text-center">
            <Lock className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[hsl(var(--beta-text-primary))] mb-2">
              Login Required
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))] mb-4">
              Please log in to view your points balance and make purchases.
            </p>
            <Link to="/login">
              <BetaButton>Login to Continue</BetaButton>
            </Link>
          </GlassCard>
        )}

        {/* Your Name Effects Section */}
        {user && purchasedNameEffects.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
              <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Your Name Effects</h2>
              <BetaBadge variant="accent" size="sm">{purchasedNameEffects.length} owned</BetaBadge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedNameEffects.map((purchase: any) => {
                const isActive = activeEffectPurchaseId === purchase.id;
                const isActivating = activating === purchase.id;
                
                return (
                  <div
                    key={purchase.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-[hsl(var(--beta-accent)/0.1)] border-[hsl(var(--beta-accent)/0.5)]' 
                        : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-[hsl(var(--beta-text-primary))]">
                        {purchase.shop_items?.name}
                      </span>
                      {isActive && (
                        <BetaBadge variant="success" size="sm">
                          <Power className="w-3 h-3 mr-1" />
                          Active
                        </BetaBadge>
                      )}
                    </div>
                    
                    <div className="p-3 rounded-lg bg-[hsl(var(--beta-surface-2))] mb-3">
                      <span className="text-xs text-[hsl(var(--beta-text-muted))]">Preview: </span>
                      <span style={getPreviewStyle(purchase.shop_items?.item_data)}>
                        {(profile as any)?.discord_username || "Your Name"}
                      </span>
                    </div>
                    
                    {isActive ? (
                      <BetaButton
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleDeactivateEffect}
                        disabled={activating === 'deactivating'}
                      >
                        <PowerOff className="w-4 h-4 mr-2" />
                        {activating === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
                      </BetaButton>
                    ) : (
                      <BetaButton
                        size="sm"
                        className="w-full"
                        onClick={() => handleActivateEffect(purchase.id)}
                        disabled={!!activating}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {isActivating ? 'Activating...' : 'Activate'}
                      </BetaButton>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Shop Items Grid */}
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4">Available Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shopItems?.map((item, index) => {
              const owned = hasPurchased(item.id);
              const affordable = canAfford(item.price_points);
              const isPurchasing = purchasing === item.id;
              
              return (
                <GlassCard 
                  key={item.id} 
                  hover={!owned}
                  className={`p-5 beta-animate-fade-in ${owned ? 'opacity-75' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${getCategoryColor(item.category)}`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    {owned && (
                      <BetaBadge variant="success" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Owned
                      </BetaBadge>
                    )}
                  </div>

                  {/* Item Info */}
                  <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Preview for name effects */}
                  {item.category === 'name_effects' && item.item_data && (
                    <div className="p-2 rounded-lg bg-[hsl(var(--beta-surface-3))] mb-3">
                      <span className="text-xs text-[hsl(var(--beta-text-muted))]">Preview: </span>
                      <span style={getPreviewStyle(item.item_data as any)}>
                        {(profile as any)?.discord_username || "Your Name"}
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--beta-glass-border))]">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                      <span className={`font-bold ${affordable ? 'text-[hsl(var(--beta-accent))]' : 'text-red-400'}`}>
                        {item.price_points} pts
                      </span>
                    </div>
                    
                    {!owned && user && (
                      <BetaButton 
                        size="sm" 
                        variant={affordable ? 'primary' : 'outline'}
                        disabled={!affordable || isPurchasing}
                        onClick={() => handlePurchase(item.id, item.price_points)}
                      >
                        {isPurchasing ? '...' : affordable ? 'Buy' : 'Not Enough'}
                      </BetaButton>
                    )}
                  </div>

                  {/* Stock indicator */}
                  {item.quantity_available !== null && (
                    <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-2">
                      {item.quantity_available > 0 
                        ? `${item.quantity_available} left in stock` 
                        : 'Out of stock'}
                    </p>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>

        {shopItems?.length === 0 && (
          <GlassCard className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              Shop is Empty
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              Check back later for new items!
            </p>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaShop;
