-- Add some example fulfillment-required items
INSERT INTO shop_items (name, description, price_points, category, item_data, fulfillment_required, fulfillment_instructions) VALUES
('Valorant Skin Bundle', 'Premium weapon skin bundle delivered to your Valorant account', 500, 'skins', '{"game": "valorant", "type": "weapon_bundle"}', true, 'Contact user via Discord to arrange Valorant account skin transfer'),
('CS2 Knife Skin', 'Rare knife skin for Counter-Strike 2', 750, 'skins', '{"game": "cs2", "type": "knife_skin"}', true, 'Steam trade required - get Steam profile from user'),
('Discord Nitro 1 Month', 'One month of Discord Nitro subscription', 300, 'in_game_items', '{"service": "discord", "duration": "1_month"}', true, 'Send Discord Nitro gift code via DM'),
('Steam Gift Card $10', '$10 Steam wallet credit', 400, 'in_game_items', '{"service": "steam", "amount": 10}', true, 'Send Steam gift card code via Discord or email');