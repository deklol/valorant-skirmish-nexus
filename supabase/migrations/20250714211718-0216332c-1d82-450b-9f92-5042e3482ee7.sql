-- Update existing rainbow name effect to galaxy name effect
UPDATE shop_items 
SET 
  name = 'Galaxy Name Effect',
  description = 'Make your name shimmer with cosmic blues and purples like a distant galaxy',
  item_data = jsonb_build_object('style', 'galaxy')
WHERE item_data->>'style' = 'rainbow';

-- Add new name effects to the shop
INSERT INTO shop_items (name, description, price_points, category, item_data) VALUES
('Fire Name Effect', 'Blaze across the battlefield with fiery red, orange, and yellow gradients', 75, 'name_effects', '{"style": "fire"}'),
('Ice Name Effect', 'Cool and composed with icy cyan and blue tones', 75, 'name_effects', '{"style": "ice"}'),
('Neon Name Effect', 'Electrifying green glow that demands attention', 100, 'name_effects', '{"style": "neon"}'),
('Royal Name Effect', 'Purple majesty fit for tournament royalty', 150, 'name_effects', '{"style": "royal"}'),
('Shadow Name Effect', 'Mysterious gray with subtle shadowing', 50, 'name_effects', '{"style": "shadow"}'),
('Electric Name Effect', 'Dynamic yellow-blue-cyan gradient with pulsing animation', 200, 'name_effects', '{"style": "electric"}');