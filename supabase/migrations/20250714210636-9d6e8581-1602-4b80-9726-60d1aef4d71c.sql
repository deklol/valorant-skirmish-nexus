-- Create enum for shop item categories
CREATE TYPE shop_item_category AS ENUM (
  'name_effects',
  'profile_enhancements', 
  'gaming_rewards',
  'platform_perks',
  'random_boxes'
);

-- Create enum for purchase status
CREATE TYPE purchase_status AS ENUM (
  'completed',
  'refunded'
);

-- Add spendable_points to users table
ALTER TABLE users 
ADD COLUMN spendable_points INTEGER NOT NULL DEFAULT 0;

-- Create shop_items table
CREATE TABLE shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category shop_item_category NOT NULL,
  price_points INTEGER NOT NULL CHECK (price_points > 0),
  item_data JSONB NOT NULL DEFAULT '{}',
  quantity_available INTEGER, -- NULL means unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Create user_purchases table
CREATE TABLE user_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id),
  points_spent INTEGER NOT NULL,
  purchase_data JSONB NOT NULL DEFAULT '{}',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status purchase_status NOT NULL DEFAULT 'completed',
  refunded_at TIMESTAMP WITH TIME ZONE,
  refunded_by UUID REFERENCES users(id),
  refund_reason TEXT
);

-- Create user_active_effects table for tracking active name effects and other cosmetics
CREATE TABLE user_active_effects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effect_type TEXT NOT NULL,
  effect_data JSONB NOT NULL DEFAULT '{}',
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means permanent
  purchase_id UUID REFERENCES user_purchases(id)
);

-- Enable RLS
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_effects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_items
CREATE POLICY "Anyone can view active shop items"
ON shop_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage shop items"
ON shop_items FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for user_purchases
CREATE POLICY "Users can view their own purchases"
ON user_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
ON user_purchases FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can create purchases"
ON user_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update purchases (for refunds)"
ON user_purchases FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for user_active_effects
CREATE POLICY "Anyone can view user active effects"
ON user_active_effects FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own effects"
ON user_active_effects FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all effects"
ON user_active_effects FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- Create function to award spendable points when achievements are earned
CREATE OR REPLACE FUNCTION award_spendable_points()
RETURNS TRIGGER AS $$
DECLARE
  achievement_points INTEGER;
BEGIN
  -- Get the points for this achievement
  SELECT points INTO achievement_points
  FROM achievements 
  WHERE id = NEW.achievement_id;
  
  -- Award spendable points to user
  UPDATE users 
  SET spendable_points = COALESCE(spendable_points, 0) + achievement_points
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to award spendable points when achievements are earned
CREATE TRIGGER award_spendable_points_trigger
  AFTER INSERT ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION award_spendable_points();

-- Create function to process shop purchases
CREATE OR REPLACE FUNCTION process_shop_purchase(
  p_user_id UUID,
  p_shop_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  item_record RECORD;
  user_points INTEGER;
  purchase_id UUID;
BEGIN
  -- Get shop item details
  SELECT * INTO item_record
  FROM shop_items 
  WHERE id = p_shop_item_id AND is_active = true;
  
  IF item_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or inactive');
  END IF;
  
  -- Check if item has quantity and is available
  IF item_record.quantity_available IS NOT NULL AND item_record.quantity_available <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item out of stock');
  END IF;
  
  -- Get user's spendable points
  SELECT spendable_points INTO user_points
  FROM users 
  WHERE id = p_user_id;
  
  IF user_points < item_record.price_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- Deduct points from user
  UPDATE users 
  SET spendable_points = spendable_points - item_record.price_points
  WHERE id = p_user_id;
  
  -- Reduce quantity if applicable
  IF item_record.quantity_available IS NOT NULL THEN
    UPDATE shop_items 
    SET quantity_available = quantity_available - 1
    WHERE id = p_shop_item_id;
  END IF;
  
  -- Create purchase record
  INSERT INTO user_purchases (user_id, shop_item_id, points_spent, purchase_data)
  VALUES (p_user_id, p_shop_item_id, item_record.price_points, item_record.item_data)
  RETURNING id INTO purchase_id;
  
  -- Apply effect if it's a name effect or other cosmetic
  IF item_record.category = 'name_effects' THEN
    -- Deactivate any existing name effects
    DELETE FROM user_active_effects 
    WHERE user_id = p_user_id AND effect_type = 'name_effect';
    
    -- Apply new name effect
    INSERT INTO user_active_effects (user_id, effect_type, effect_data, purchase_id)
    VALUES (p_user_id, 'name_effect', item_record.item_data, purchase_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'purchase_id', purchase_id,
    'remaining_points', (SELECT spendable_points FROM users WHERE id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to refund purchases (admin only)
CREATE OR REPLACE FUNCTION refund_purchase(
  p_purchase_id UUID,
  p_refund_reason TEXT DEFAULT 'Admin refund'
) RETURNS JSONB AS $$
DECLARE
  purchase_record RECORD;
BEGIN
  -- Get purchase details
  SELECT * INTO purchase_record
  FROM user_purchases 
  WHERE id = p_purchase_id AND status = 'completed';
  
  IF purchase_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or already refunded');
  END IF;
  
  -- Return points to user
  UPDATE users 
  SET spendable_points = spendable_points + purchase_record.points_spent
  WHERE id = purchase_record.user_id;
  
  -- Update purchase status
  UPDATE user_purchases 
  SET 
    status = 'refunded',
    refunded_at = now(),
    refunded_by = auth.uid(),
    refund_reason = p_refund_reason
  WHERE id = p_purchase_id;
  
  -- Remove any active effects from this purchase
  DELETE FROM user_active_effects 
  WHERE purchase_id = p_purchase_id;
  
  -- Restore quantity if applicable
  UPDATE shop_items 
  SET quantity_available = COALESCE(quantity_available, 0) + 1
  WHERE id = purchase_record.shop_item_id 
  AND quantity_available IS NOT NULL;
  
  RETURN jsonb_build_object('success', true, 'refunded_points', purchase_record.points_spent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some initial shop items
INSERT INTO shop_items (name, description, category, price_points, item_data, created_by) VALUES
('Golden Name', 'Display your name in golden color', 'name_effects', 50, '{"color": "#FFD700", "weight": "bold"}', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('Silver Name', 'Display your name in silver color', 'name_effects', 30, '{"color": "#C0C0C0", "weight": "bold"}', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('Rainbow Name', 'Display your name with rainbow gradient', 'name_effects', 100, '{"gradient": "linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8f00ff)", "weight": "bold"}', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('Mystery Box', 'Random reward containing points or cosmetics', 'random_boxes', 25, '{"rewards": [{"type": "points", "min": 10, "max": 50}, {"type": "name_effect", "items": ["silver_name"]}]}', (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- Create indexes for better performance
CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_active ON shop_items(is_active);
CREATE INDEX idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_status ON user_purchases(status);
CREATE INDEX idx_user_active_effects_user_id ON user_active_effects(user_id);
CREATE INDEX idx_user_active_effects_type ON user_active_effects(effect_type);