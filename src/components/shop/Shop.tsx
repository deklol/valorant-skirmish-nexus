import { useState } from 'react';
import { Sparkles, ShoppingBag, History, Crown, Package, Gift, Zap } from 'lucide-react';
import { ShopProvider, useShopContext } from '@/contexts/ShopContext';
import { ShopItemCard } from './ShopItemCard';
import { PurchaseHistory } from './PurchaseHistory';
import { PurchasedNameEffects } from './PurchasedNameEffects';
import { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent,
  StandardText,
  StandardHeading,
  StandardBadge,
  PageLayout,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent
} from '@/components/ui';

const categoryInfo = {
  name_effects: {
    label: 'Name Effects',
    icon: Crown,
    description: 'Customize how your name appears across the platform'
  },
  profile_enhancements: {
    label: 'Profile Enhancements', 
    icon: Sparkles,
    description: 'Make your profile stand out with special badges and effects'
  },
  gaming_rewards: {
    label: 'Gaming Rewards',
    icon: Package,
    description: 'Real gaming items and gift cards for your favorite games'
  },
  platform_perks: {
    label: 'Platform Perks',
    icon: Zap,
    description: 'Special privileges and features on the tournament platform'
  },
  random_boxes: {
    label: 'Mystery Boxes',
    icon: Gift,
    description: 'Random rewards with surprises inside'
  },
  skins: {
    label: 'Game Skins',
    icon: Package,
    description: 'Exclusive game skins and cosmetic items'
  },
  in_game_items: {
    label: 'In-Game Items',
    icon: Gift,
    description: 'Gift cards, subscriptions, and other gaming items'
  }
};

function ShopContent() {
  const {
    shopItems,
    spendablePoints,
    loading,
    purchasing,
    purchaseItem,
    getItemsByCategory,
    canAfford,
    hasAnyPurchases,
    getPurchasedNameEffects
  } = useShopContext();

  const [activeTab, setActiveTab] = useState('shop');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <StandardText>Loading shop...</StandardText>
          </div>
        </div>
      </div>
    );
  }

  const categories = Object.keys(categoryInfo).filter(category => 
    getItemsByCategory(category).length > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <StandardHeading level="h1" className="flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-primary" />
                Achievement Shop
              </StandardHeading>
              <StandardText color="muted">
                Spend your achievement points on exclusive rewards and customizations
              </StandardText>
            </div>
            
            <div className="text-right">
              <StandardText size="sm" color="muted">Your Balance</StandardText>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <StandardText size="lg" weight="bold">
                  {spendablePoints} Points
                </StandardText>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <StandardTabs value={activeTab} onValueChange={setActiveTab}>
            <StandardTabsList>
              <StandardTabsTrigger value="shop">Shop</StandardTabsTrigger>
              {hasAnyPurchases() && (
                <StandardTabsTrigger value="history">
                  <History className="mr-2 h-4 w-4" />
                  Purchase History
                </StandardTabsTrigger>
              )}
            </StandardTabsList>

            <StandardTabsContent value="shop" className="space-y-6">
              {/* Show purchased name effects if user has any */}
              {getPurchasedNameEffects().length > 0 && <PurchasedNameEffects />}
              {categories.length === 0 ? (
                <PageCard>
                  <PageCardContent className="text-center py-12">
                    <StandardText color="muted">No items available in the shop at the moment.</StandardText>
                  </PageCardContent>
                </PageCard>
              ) : (
                categories.map(category => {
                  const items = getItemsByCategory(category);
                  const categoryConfig = categoryInfo[category as keyof typeof categoryInfo];
                  const CategoryIcon = categoryConfig.icon;

                  return (
                    <PageCard key={category}>
                      <PageCardHeader>
                        <PageCardTitle className="flex items-center gap-3">
                          <CategoryIcon className="h-6 w-6 text-primary" />
                          {categoryConfig.label}
                          <StandardBadge status="info">
                            {items.length} items
                          </StandardBadge>
                        </PageCardTitle>
                        <StandardText color="muted">
                          {categoryConfig.description}
                        </StandardText>
                      </PageCardHeader>
                      <PageCardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map(item => (
                            <ShopItemCard
                              key={item.id}
                              item={item}
                              canAfford={canAfford(item.price_points)}
                              onPurchase={purchaseItem}
                              isPurchasing={purchasing === item.id}
                            />
                          ))}
                        </div>
                      </PageCardContent>
                    </PageCard>
                  );
                })
              )}
            </StandardTabsContent>

            {hasAnyPurchases() && (
              <StandardTabsContent value="history">
                <PurchaseHistory />
              </StandardTabsContent>
            )}
          </StandardTabs>
        </div>
      </div>
    </div>
  );
}

export function Shop() {
  return (
    <ShopProvider>
      <ShopContent />
    </ShopProvider>
  );
}