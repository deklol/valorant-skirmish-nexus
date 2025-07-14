import { ShoppingCart, Sparkles, Package, Gift, Crown, Zap } from 'lucide-react';
import { StandardBadge, StandardText, StandardHeading, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price_points: number;
  item_data: any;
  quantity_available: number | null;
  is_active: boolean;
}

interface ShopItemCardProps {
  item: ShopItem;
  canAfford: boolean;
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
  disabled?: boolean;
}

const categoryIcons = {
  name_effects: Crown,
  profile_enhancements: Sparkles,
  gaming_rewards: Package,
  platform_perks: Zap,
  random_boxes: Gift,
  skins: Package,
  in_game_items: Gift,
};

const categoryColors = {
  name_effects: 'hsl(var(--chart-1))',
  profile_enhancements: 'hsl(var(--chart-2))',
  gaming_rewards: 'hsl(var(--chart-3))',
  platform_perks: 'hsl(var(--chart-4))',
  random_boxes: 'hsl(var(--chart-5))',
  skins: 'hsl(var(--chart-6))',
  in_game_items: 'hsl(var(--chart-7))',
};

export function ShopItemCard({ item, canAfford, onPurchase, isPurchasing, disabled }: ShopItemCardProps) {
  const { profile } = useAuth();
  const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons] || Package;
  const isOutOfStock = item.quantity_available !== null && item.quantity_available <= 0;
  const isDisabled = disabled || isPurchasing || !canAfford || isOutOfStock;

  const getPreviewStyle = () => {
    if (item.category === 'name_effects' && item.item_data?.style) {
      const style = item.item_data.style;
      
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
        default:
          return {};
      }
    }
    return {};
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="rounded-full p-2"
            style={{ backgroundColor: categoryColors[item.category as keyof typeof categoryColors] + '20' }}
          >
            <CategoryIcon 
              className="h-5 w-5" 
              style={{ color: categoryColors[item.category as keyof typeof categoryColors] }}
            />
          </div>
          <div>
            <StandardHeading 
              level="h4" 
              className="group-hover:text-primary transition-colors"
              style={item.category === 'name_effects' ? getPreviewStyle() : {}}
            >
              {item.name}
            </StandardHeading>
          <StandardText color="muted" size="sm">
            {item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </StandardText>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <StandardText className="font-semibold">
              {item.price_points}
            </StandardText>
          </div>
          {item.quantity_available !== null && (
            <StandardText color="muted" size="sm">
              {item.quantity_available} left
            </StandardText>
          )}
        </div>
      </div>

      <StandardText color="muted" className="mb-4">
        {item.description}
      </StandardText>

      {isOutOfStock && (
        <StandardBadge status="neutral" className="mb-4">
          Out of Stock
        </StandardBadge>
      )}

      {item.category === 'name_effects' && item.item_data && (
        <div className="mb-4 rounded-md bg-muted/50 p-3">
          <StandardText size="sm" color="muted" className="mb-1">
            Preview:
          </StandardText>
          <StandardText 
            className="font-medium"
            style={getPreviewStyle()}
          >
            {profile?.discord_username || "Your Username"}
          </StandardText>
        </div>
      )}

      <Button
        className="w-full"
        onClick={() => onPurchase(item.id)}
        disabled={isDisabled}
        variant={canAfford ? "default" : "secondary"}
      >
        {isPurchasing ? (
          <>
            <ShoppingCart className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : isOutOfStock ? (
          'Out of Stock'
        ) : !canAfford ? (
          'Insufficient Points'
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchase
          </>
        )}
      </Button>
    </div>
  );
}