import { useState, useEffect } from 'react';
import { Crown, Power, PowerOff } from 'lucide-react';
import { useShopContext } from '@/contexts/ShopContext';
import { useAuth } from '@/hooks/useAuth';
import { useNameEffects } from '@/hooks/useNameEffects';
import { supabase } from '@/integrations/supabase/client';
import { 
  StandardText,
  StandardHeading,
  StandardBadge,
  Button,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent
} from '@/components/ui';

export function PurchasedNameEffects() {
  const { getPurchasedNameEffects, activateNameEffect, deactivateNameEffect, activating } = useShopContext();
  const { user, profile } = useAuth();
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
    
    // Handle new format with direct color values (like Golden Name)
    if (itemData.color) {
      return {
        color: itemData.color,
        fontWeight: itemData.weight || '600',
        textShadow: `0 0 8px ${itemData.color}60`
      };
    }
    
    // Handle legacy format with style names
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
          background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(139, 92, 246), rgb(124, 58, 237))',
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
          fontWeight: 'bold',
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
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

  if (purchasedEffects.length === 0) {
    return null;
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-primary" />
          Your Name Effects
          <StandardBadge status="info">
            {purchasedEffects.length} owned
          </StandardBadge>
        </PageCardTitle>
        <StandardText color="muted">
          Activate one of your purchased name effects. Only one can be active at a time.
        </StandardText>
      </PageCardHeader>
      <PageCardContent>
        <div className="space-y-4">
          {/* Deactivate button if something is active */}
          {activeEffectPurchaseId && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <StandardHeading level="h4">No Effect</StandardHeading>
                <StandardText color="muted" size="sm">
                  Use your default username appearance
                </StandardText>
              </div>
              <Button
                variant="outline"
                onClick={() => deactivateNameEffect()}
                disabled={activating === 'deactivating'}
                className="flex items-center gap-2"
              >
                <PowerOff className="h-4 w-4" />
                {activating === 'deactivating' ? 'Deactivating...' : 'Deactivate All'}
              </Button>
            </div>
          )}

          {purchasedEffects.map((purchase) => {
            const isActive = activeEffectPurchaseId === purchase.id;
            const isActivating = activating === purchase.id;
            
            return (
              <div
                key={purchase.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  isActive ? 'bg-primary/10 border-primary/50' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StandardHeading level="h4">
                      {purchase.shop_items.name}
                    </StandardHeading>
                    {isActive && (
                      <StandardBadge status="success" className="flex items-center gap-1">
                        <Power className="h-3 w-3" />
                        Active
                      </StandardBadge>
                    )}
                  </div>
                  
                  <StandardText color="muted" size="sm" className="mb-3">
                    {purchase.shop_items.description}
                  </StandardText>

                  <div className="rounded-md bg-muted/30 p-3">
                    <StandardText size="sm" color="muted" className="mb-1">
                      Preview:
                    </StandardText>
                    <StandardText 
                      className="font-medium"
                      style={getPreviewStyle(purchase.shop_items.item_data)}
                    >
                      {profile?.discord_username || "Your Username"}
                    </StandardText>
                  </div>
                </div>

                <div className="ml-4">
                  {isActive ? (
                    <Button
                      variant="outline"
                      onClick={() => deactivateNameEffect()}
                      disabled={activating === 'deactivating'}
                      className="flex items-center gap-2"
                    >
                      <PowerOff className="h-4 w-4" />
                      {activating === 'deactivating' ? 'Deactivating...' : 'Deactivate'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => activateNameEffect(purchase.id)}
                      disabled={!!activating}
                      className="flex items-center gap-2"
                    >
                      <Power className="h-4 w-4" />
                      {isActivating ? 'Activating...' : 'Activate'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageCardContent>
    </PageCard>
  );
}