import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GradientBackground, GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  ShoppingBag, Coins, Gift, Sparkles, Tag, 
  CheckCircle, Lock, TrendingUp, Star
} from "lucide-react";

const BetaShop = () => {
  const { user } = useAuth();

  // Fetch user points
  const { data: userProfile } = useQuery({
    queryKey: ['beta-user-points', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('shop_points')
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

  // Fetch user purchases
  const { data: purchases } = useQuery({
    queryKey: ['beta-user-purchases', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_purchases')
        .select('shop_item_id')
        .eq('user_id', user.id);
      return data?.map(p => p.shop_item_id) || [];
    },
    enabled: !!user?.id
  });

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

  const hasPurchased = (itemId: string) => purchases?.includes(itemId);
  const canAfford = (price: number) => (userProfile?.shop_points || 0) >= price;

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
                  {userProfile?.shop_points || 0}
                </p>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Not Logged In */}
        {!user && (
          <GlassCard className="p-8 text-center mb-8">
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

        {/* Shop Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shopItems?.map((item, index) => {
            const owned = hasPurchased(item.id);
            const affordable = canAfford(item.price_points);
            
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
                <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4 line-clamp-2">
                  {item.description}
                </p>

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
                      disabled={!affordable}
                    >
                      {affordable ? 'Buy' : 'Not Enough'}
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
