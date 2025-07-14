-- Update the process_shop_purchase function to not auto-activate name effects
DROP FUNCTION public.process_shop_purchase(uuid, uuid);

CREATE OR REPLACE FUNCTION public.process_shop_purchase(p_user_id uuid, p_shop_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  
  -- Note: We no longer auto-activate name effects here
  -- Users will manually activate them from the shop
  
  RETURN jsonb_build_object(
    'success', true, 
    'purchase_id', purchase_id,
    'remaining_points', (SELECT spendable_points FROM users WHERE id = p_user_id)
  );
END;
$function$;

-- Create function to activate a name effect
CREATE OR REPLACE FUNCTION public.activate_name_effect(p_user_id uuid, p_purchase_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  purchase_record RECORD;
  item_record RECORD;
BEGIN
  -- Get purchase details
  SELECT * INTO purchase_record
  FROM user_purchases 
  WHERE id = p_purchase_id AND user_id = p_user_id AND status = 'completed';
  
  IF purchase_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found or not owned by user');
  END IF;
  
  -- Get item details
  SELECT * INTO item_record
  FROM shop_items 
  WHERE id = purchase_record.shop_item_id;
  
  IF item_record.category != 'name_effects' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is not a name effect');
  END IF;
  
  -- Deactivate any existing name effects
  DELETE FROM user_active_effects 
  WHERE user_id = p_user_id AND effect_type = 'name_effect';
  
  -- Apply new name effect
  INSERT INTO user_active_effects (user_id, effect_type, effect_data, purchase_id)
  VALUES (p_user_id, 'name_effect', item_record.item_data, p_purchase_id);
  
  RETURN jsonb_build_object('success', true, 'message', 'Name effect activated');
END;
$function$;

-- Create function to deactivate name effects
CREATE OR REPLACE FUNCTION public.deactivate_name_effect(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Remove any active name effects
  DELETE FROM user_active_effects 
  WHERE user_id = p_user_id AND effect_type = 'name_effect';
  
  RETURN jsonb_build_object('success', true, 'message', 'Name effect deactivated');
END;
$function$;