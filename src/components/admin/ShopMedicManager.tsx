import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, RefreshCw, DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

type ShopItem = Tables<"shop_items">;
type Purchase = Tables<"user_purchases"> & {
  users: { discord_username: string | null; email: string } | null;
  shop_items: { name: string } | null;
};

interface ShopAnalytics {
  totalRevenue: number;
  totalSales: number;
  topItems: Array<{
    item_name: string;
    sales_count: number;
    revenue: number;
  }>;
  recentSales: Purchase[];
}

export function ShopMedicManager() {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_points: 0,
    category: "name_effects" as Enums<"shop_item_category">,
    quantity_available: null as number | null,
    item_data: {} as Record<string, any>,
  });

  useEffect(() => {
    fetchShopItems();
    fetchAnalytics();
  }, []);

  const fetchShopItems = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShopItems(data || []);
    } catch (error) {
      console.error("Error fetching shop items:", error);
      toast({
        title: "Error",
        description: "Failed to fetch shop items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Get total revenue and sales count
      const { data: salesData, error: salesError } = await supabase
        .from("user_purchases")
        .select("points_spent, shop_items!inner(name), users!inner(discord_username, email)")
        .eq("status", "completed");

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, purchase) => sum + purchase.points_spent, 0) || 0;
      const totalSales = salesData?.length || 0;

      // Get top items
      const itemStats = salesData?.reduce((acc, purchase) => {
        const itemName = purchase.shop_items?.name || "Unknown";
        if (!acc[itemName]) {
          acc[itemName] = { sales_count: 0, revenue: 0 };
        }
        acc[itemName].sales_count++;
        acc[itemName].revenue += purchase.points_spent;
        return acc;
      }, {} as Record<string, { sales_count: number; revenue: number }>);

      const topItems = Object.entries(itemStats || {})
        .map(([item_name, stats]) => ({ item_name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get recent sales
      const { data: recentSales, error: recentError } = await supabase
        .from("user_purchases")
        .select(`
          *,
          users(discord_username, email),
          shop_items(name)
        `)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      setAnalytics({
        totalRevenue,
        totalSales,
        topItems,
        recentSales: (recentSales || []) as any[],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics",
        variant: "destructive",
      });
    }
  };

  const handleCreateItem = async () => {
    try {
      const { error } = await supabase.from("shop_items").insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shop item created successfully",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchShopItems();
    } catch (error) {
      console.error("Error creating shop item:", error);
      toast({
        title: "Error",
        description: "Failed to create shop item",
        variant: "destructive",
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from("shop_items")
        .update(formData)
        .eq("id", editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shop item updated successfully",
      });

      setEditingItem(null);
      resetForm();
      fetchShopItems();
    } catch (error) {
      console.error("Error updating shop item:", error);
      toast({
        title: "Error",
        description: "Failed to update shop item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("shop_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shop item deleted successfully",
      });

      fetchShopItems();
    } catch (error) {
      console.error("Error deleting shop item:", error);
      toast({
        title: "Error",
        description: "Failed to delete shop item",
        variant: "destructive",
      });
    }
  };

  const handleRefundPurchase = async (purchaseId: string) => {
    if (!confirm("Are you sure you want to refund this purchase?")) return;

    try {
      const { error } = await supabase.rpc("refund_purchase", {
        p_purchase_id: purchaseId,
        p_refund_reason: "Admin refund",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase refunded successfully",
      });

      fetchAnalytics();
    } catch (error) {
      console.error("Error refunding purchase:", error);
      toast({
        title: "Error",
        description: "Failed to refund purchase",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_points: 0,
      category: "name_effects",
      quantity_available: null,
      item_data: {},
    });
  };

  const startEdit = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price_points: item.price_points,
      category: item.category,
      quantity_available: item.quantity_available,
      item_data: item.item_data as Record<string, any>,
    });
  };

  if (loading) {
    return <div className="p-6">Loading shop management...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shop Medic</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Shop Item</DialogTitle>
            </DialogHeader>
            <ItemForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateItem}
              onCancel={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalRevenue}</div>
                    <p className="text-xs text-muted-foreground">Achievement Points</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSales}</div>
                    <p className="text-xs text-muted-foreground">Completed purchases</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {shopItems.filter(item => item.is_active).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Available for purchase</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topItems.map((item, index) => (
                      <div key={item.item_name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{item.item_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{item.revenue} pts</div>
                          <div className="text-sm text-muted-foreground">{item.sales_count} sales</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Shop Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shopItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.price_points} pts</TableCell>
                      <TableCell>
                        {item.quantity_available ? item.quantity_available : "Unlimited"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {sale.users?.discord_username || sale.users?.email || "Unknown"}
                      </TableCell>
                      <TableCell>{sale.shop_items?.name || "Unknown"}</TableCell>
                      <TableCell>{sale.points_spent} pts</TableCell>
                      <TableCell>
                        {new Date(sale.purchased_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "completed" ? "default" : "destructive"}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefundPurchase(sale.id)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Shop Item</DialogTitle>
            </DialogHeader>
            <ItemForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleUpdateItem}
              onCancel={() => {
                setEditingItem(null);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface ItemFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ItemForm({ formData, setFormData, onSubmit, onCancel }: ItemFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_effects">Name Effects</SelectItem>
            <SelectItem value="profile_enhancements">Profile Enhancements</SelectItem>
            <SelectItem value="gaming_rewards">Gaming Rewards</SelectItem>
            <SelectItem value="platform_perks">Platform Perks</SelectItem>
            <SelectItem value="random_boxes">Random Boxes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="price">Price (Achievement Points)</Label>
        <Input
          id="price"
          type="number"
          value={formData.price_points}
          onChange={(e) => setFormData({ ...formData, price_points: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div>
        <Label htmlFor="quantity">Quantity Available (leave empty for unlimited)</Label>
        <Input
          id="quantity"
          type="number"
          value={formData.quantity_available || ""}
          onChange={(e) => setFormData({ 
            ...formData, 
            quantity_available: e.target.value ? parseInt(e.target.value) : null 
          })}
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button onClick={onSubmit} className="flex-1">
          Save
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}