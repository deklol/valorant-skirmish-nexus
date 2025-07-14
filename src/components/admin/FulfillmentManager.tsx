import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StandardText, StandardHeading } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, Clock, Package, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FulfillmentOrder {
  id: string;
  status: string;
  fulfillment_notes: string | null;
  created_at: string;
  completed_at: string | null;
  users: {
    discord_username: string | null;
  } | null;
  shop_items: {
    name: string;
    fulfillment_instructions: string | null;
  } | null;
  user_purchases: {
    points_spent: number;
  } | null;
}

const statusIcons = {
  pending: AlertCircle,
  in_progress: Clock,
  completed: Check,
  cancelled: Package,
};

const statusColors = {
  pending: 'destructive',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'outline',
} as const;

export function FulfillmentManager() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('fulfillment_orders')
        .select(`
          *,
          users!fulfillment_orders_user_id_fkey(discord_username),
          shop_items!fulfillment_orders_shop_item_id_fkey(name, fulfillment_instructions),
          user_purchases!fulfillment_orders_purchase_id_fkey(points_spent)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching fulfillment orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch fulfillment orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    setUpdatingOrder(orderId);
    try {
      const updateData: any = { 
        status,
        fulfillment_notes: notes || null
      };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from('fulfillment_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Order marked as ${status}`,
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Package;
    const variant = statusColors[status as keyof typeof statusColors] || 'outline';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const inProgressOrders = orders.filter(order => order.status === 'in_progress');
  const completedOrders = orders.filter(order => order.status === 'completed');

  if (loading) {
    return <div className="flex justify-center p-8">Loading fulfillment orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <StandardHeading level="h3" className="text-red-700 dark:text-red-300">
              Pending Orders
            </StandardHeading>
          </div>
          <StandardText className="text-2xl font-bold text-red-600 dark:text-red-400">
            {pendingOrders.length}
          </StandardText>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <StandardHeading level="h3" className="text-yellow-700 dark:text-yellow-300">
              In Progress
            </StandardHeading>
          </div>
          <StandardText className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {inProgressOrders.length}
          </StandardText>
        </div>
        
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <StandardHeading level="h3" className="text-green-700 dark:text-green-300">
              Completed
            </StandardHeading>
          </div>
          <StandardText className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedOrders.length}
          </StandardText>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Instructions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  {formatDate(order.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {order.users?.discord_username || 'Unknown User'}
                  </div>
                </TableCell>
                <TableCell>
                  {order.shop_items?.name || 'Unknown Item'}
                </TableCell>
                <TableCell>
                  {order.user_purchases?.points_spent || 0} pts
                </TableCell>
                <TableCell>
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell className="max-w-xs">
                  <StandardText size="sm" color="muted" className="truncate">
                    {order.shop_items?.fulfillment_instructions || 'No instructions'}
                  </StandardText>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <>
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                          disabled={updatingOrder === order.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {order.status === 'in_progress' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={updatingOrder === order.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <StandardHeading level="h3" color="muted">
            No fulfillment orders found
          </StandardHeading>
          <StandardText color="muted">
            Orders requiring manual fulfillment will appear here
          </StandardText>
        </div>
      )}
    </div>
  );
}