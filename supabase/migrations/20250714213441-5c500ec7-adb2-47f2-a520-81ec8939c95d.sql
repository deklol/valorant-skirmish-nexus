-- Add new categories to the shop_item_category enum
ALTER TYPE shop_item_category ADD VALUE 'skins';
ALTER TYPE shop_item_category ADD VALUE 'in_game_items';

-- Add fulfillment tracking for shop purchases
ALTER TABLE shop_items 
ADD COLUMN fulfillment_required BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN fulfillment_instructions TEXT;

-- Create fulfillment_orders table to track items that need manual delivery
CREATE TABLE fulfillment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES user_purchases(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  fulfillment_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id)
);

-- Enable RLS on fulfillment_orders
ALTER TABLE fulfillment_orders ENABLE ROW LEVEL SECURITY;

-- Admins can manage all fulfillment orders
CREATE POLICY "Admins can manage fulfillment orders"
ON fulfillment_orders
FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- Users can view their own fulfillment orders
CREATE POLICY "Users can view their own fulfillment orders"
ON fulfillment_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fulfillment_orders_status ON fulfillment_orders(status);
CREATE INDEX idx_fulfillment_orders_user_id ON fulfillment_orders(user_id);
CREATE INDEX idx_fulfillment_orders_created_at ON fulfillment_orders(created_at);

-- Create function to automatically create fulfillment orders for fulfillment-required items
CREATE OR REPLACE FUNCTION create_fulfillment_order()
RETURNS TRIGGER AS $$
DECLARE
  item_rec RECORD;
BEGIN
  -- Get the shop item details
  SELECT * INTO item_rec FROM shop_items WHERE id = NEW.shop_item_id;
  
  -- If the item requires fulfillment, create a fulfillment order
  IF item_rec.fulfillment_required THEN
    INSERT INTO fulfillment_orders (purchase_id, shop_item_id, user_id, status)
    VALUES (NEW.id, NEW.shop_item_id, NEW.user_id, 'pending');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create fulfillment orders
CREATE TRIGGER create_fulfillment_order_trigger
  AFTER INSERT ON user_purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_fulfillment_order();