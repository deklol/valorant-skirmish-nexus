import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

interface UserPurchase {
  id: string;
  shop_item_id: string;
  points_spent: number;
  purchased_at: string;
  status: 'completed' | 'refunded';
  shop_items: ShopItem;
}

export function useShop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [userPurchases, setUserPurchases] = useState<UserPurchase[]>([]);
  const [spendablePoints, setSpendablePoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchShopData = async () => {
      try {
        // Fetch shop items
        const { data: items } = await supabase
          .from('shop_items')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('price_points', { ascending: true });

        // Fetch user's spendable points
        const { data: userData } = await supabase
          .from('users')
          .select('spendable_points')
          .eq('id', user.id)
          .single();

        // Fetch user's purchase history
        const { data: purchases } = await supabase
          .from('user_purchases')
          .select(`
            *,
            shop_items (*)
          `)
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false });

        setShopItems(items || []);
        setSpendablePoints(userData?.spendable_points || 0);
        setUserPurchases(purchases || []);
      } catch (error) {
        console.error('Error fetching shop data:', error);
        toast({
          title: "Error",
          description: "Failed to load shop data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();

    // Set up real-time subscription for spendable points updates
    const channel = supabase
      .channel(`shop-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.spendable_points !== undefined) {
            setSpendablePoints(payload.new.spendable_points);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_items',
        },
        () => {
          // Refresh shop items when they change
          fetchShopData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const purchaseItem = async (itemId: string) => {
    if (!user || purchasing) return;

    setPurchasing(itemId);
    try {
      const { data, error } = await supabase.rpc('process_shop_purchase', {
        p_user_id: user.id,
        p_shop_item_id: itemId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; purchase_id?: string; remaining_points?: number };

      if (result.success) {
        toast({
          title: "Purchase Successful!",
          description: `Item purchased. Remaining points: ${result.remaining_points}`,
        });
        
        // Refresh data
        const { data: items } = await supabase
          .from('shop_items')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('price_points', { ascending: true });

        const { data: purchases } = await supabase
          .from('user_purchases')
          .select(`
            *,
            shop_items (*)
          `)
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false });

        setShopItems(items || []);
        setUserPurchases(purchases || []);
        setSpendablePoints(result.remaining_points || 0);
      } else {
        toast({
          title: "Purchase Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast({
        title: "Purchase Failed",
        description: "An error occurred while processing your purchase",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const activateNameEffect = async (purchaseId: string) => {
    if (!user || activating) return;

    setActivating(purchaseId);
    try {
      const { data, error } = await supabase.rpc('activate_name_effect', {
        p_user_id: user.id,
        p_purchase_id: purchaseId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast({
          title: "Effect Activated!",
          description: result.message || "Name effect has been activated",
        });
      } else {
        toast({
          title: "Activation Failed",
          description: result.error || "Failed to activate name effect",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error activating name effect:', error);
      toast({
        title: "Activation Failed",
        description: "An error occurred while activating the effect",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const deactivateNameEffect = async () => {
    if (!user || activating) return;

    setActivating('deactivating');
    try {
      const { data, error } = await supabase.rpc('deactivate_name_effect', {
        p_user_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast({
          title: "Effect Deactivated",
          description: result.message || "Name effect has been deactivated",
        });
      } else {
        toast({
          title: "Deactivation Failed",
          description: result.error || "Failed to deactivate name effect",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deactivating name effect:', error);
      toast({
        title: "Deactivation Failed",
        description: "An error occurred while deactivating the effect",
        variant: "destructive",
      });
    } finally {
      setActivating(null);
    }
  };

  const getItemsByCategory = (category: string) => {
    return shopItems.filter(item => item.category === category);
  };

  const canAfford = (price: number) => {
    return spendablePoints >= price;
  };

  const hasAnyPurchases = () => {
    return userPurchases.some(p => p.status === 'completed');
  };

  const getPurchasedNameEffects = () => {
    return userPurchases.filter(p => 
      p.status === 'completed' && 
      p.shop_items.category === 'name_effects'
    );
  };

  return {
    shopItems,
    userPurchases,
    spendablePoints,
    loading,
    purchasing,
    activating,
    purchaseItem,
    activateNameEffect,
    deactivateNameEffect,
    getItemsByCategory,
    canAfford,
    hasAnyPurchases,
    getPurchasedNameEffects,
  };
}