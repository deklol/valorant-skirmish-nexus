import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Coins, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';

const PointsSpendingReminder = () => {
  const { user } = useAuth();
  const { spendablePoints } = useShop();
  const navigate = useNavigate();

  // Only show if user is logged in and has over 5000 points
  if (!user || !spendablePoints || spendablePoints <= 5000) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30 border-amber-700/50 shadow-lg shadow-amber-500/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Coins className="w-8 h-8 text-amber-400" />
              <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-100 mb-1">
                You have {spendablePoints.toLocaleString()} points to spend!
              </h3>
              <p className="text-amber-200/80 text-sm">
                Visit the shop to unlock exclusive name effects and more
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/shop')}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-amber-500/25 transition-all duration-200"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Shop Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsSpendingReminder;