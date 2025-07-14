import { Clock, Package, RotateCcw, CheckCircle } from 'lucide-react';
import { useShopContext } from '@/contexts/ShopContext';
import { 
  StandardText,
  StandardHeading,
  StandardBadge,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent
} from '@/components/ui';

export function PurchaseHistory() {
  const { userPurchases, loading } = useShopContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <StandardText>Loading purchase history...</StandardText>
      </div>
    );
  }

  if (userPurchases.length === 0) {
    return (
      <PageCard>
        <PageCardContent className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <StandardHeading level="h3" className="mb-2">No purchases yet</StandardHeading>
          <StandardText color="muted">
            Start shopping to see your purchase history here
          </StandardText>
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle className="flex items-center gap-3">
          <Clock className="h-6 w-6" />
          Purchase History
        </PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <div className="space-y-4">
          {userPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {purchase.status === 'completed' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <RotateCcw className="h-8 w-8 text-orange-600" />
                  )}
                </div>
                
                <div>
                  <StandardHeading level="h4">
                    {purchase.shop_items.name}
                  </StandardHeading>
                  <StandardText color="muted" size="sm">
                    {new Date(purchase.purchased_at).toLocaleDateString()} at{' '}
                    {new Date(purchase.purchased_at).toLocaleTimeString()}
                  </StandardText>
                  <StandardText color="muted" size="sm">
                    {purchase.shop_items.description}
                  </StandardText>
                </div>
              </div>

              <div className="text-right">
                <StandardBadge 
                  status={purchase.status === 'completed' ? 'success' : 'warning'}
                  className="mb-2"
                >
                  {purchase.status === 'completed' ? 'Completed' : 'Refunded'}
                </StandardBadge>
                <StandardText weight="semibold">
                  {purchase.points_spent} points
                </StandardText>
              </div>
            </div>
          ))}
        </div>
      </PageCardContent>
    </PageCard>
  );
}