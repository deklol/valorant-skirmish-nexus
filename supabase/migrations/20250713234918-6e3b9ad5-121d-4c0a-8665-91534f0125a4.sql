-- Fix veto system data inconsistency
-- Update side_choice values to match what the application expects

-- Fix 'defense' to 'defend' (the application expects 'defend', not 'defense')
UPDATE public.map_veto_actions
SET side_choice = 'defend'
WHERE side_choice = 'defense';

-- Fix capitalized values to lowercase
UPDATE public.map_veto_actions
SET side_choice = 'defend'
WHERE side_choice = 'Defense';

UPDATE public.map_veto_actions
SET side_choice = 'attack'
WHERE side_choice = 'Attack';

-- Log the fix
INSERT INTO audit_logs (
  table_name, action, record_id, user_id, new_values, created_at
) VALUES (
  'map_veto_actions',
  'DATA_FIX',
  gen_random_uuid(),
  NULL,
  jsonb_build_object(
    'description', 'Fixed side_choice data inconsistency',
    'changes', 'Updated defense->defend, Defense->defend, Attack->attack'
  ),
  now()
);