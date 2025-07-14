import { ShoppingCart, Sparkles, Package, Gift, Crown, Zap } from 'lucide-react';
import { StandardBadge, StandardText, StandardHeading, Button } from '@/components/ui';

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
};

const categoryColors = {
  name_effects: 'hsl(var(--chart-1))',
  profile_enhancements: 'hsl(var(--chart-2))',
  gaming_rewards: 'hsl(var(--chart-3))',
  platform_perks: 'hsl(var(--chart-4))',
  random_boxes: 'hsl(var(--chart-5))',
};

export function ShopItemCard({ item, canAfford, onPurchase, isPurchasing, disabled }: ShopItemCardProps) {
  const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons] || Package;
  const isOutOfStock = item.quantity_available !== null && item.quantity_available <= 0;
  const isDisabled = disabled || isPurchasing || !canAfford || isOutOfStock;

  const getPreviewStyle = () => {
    if (item.category === 'name_effects' && item.item_data) {
      if (item.item_data.gradient) {
        return {
          background: item.item_data.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: item.item_data.weight || 'normal',
        };
      } else if (item.item_data.color) {
        return {
          color: item.item_data.color,
          fontWeight: item.item_data.weight || 'normal',
        };
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
            Your Username
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