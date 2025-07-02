
-- First, let's check if the trigger exists and recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Log the attempt
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  
  -- Insert new user with player role (most common role for new signups)
  INSERT INTO public.users (
    id, 
    role,
    discord_id,
    discord_username,
    discord_avatar_url,
    created_at
  ) VALUES (
    NEW.id, 
    'player'::user_role,
    NEW.raw_user_meta_data->>'provider_id',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'user_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  
  RAISE LOG 'Successfully created user profile for: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Also create a manual function to fix existing users who don't have profiles
CREATE OR REPLACE FUNCTION public.create_missing_user_profile(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  auth_user_data RECORD;
BEGIN
  -- Get the auth user data
  SELECT * INTO auth_user_data FROM auth.users WHERE id = user_id;
  
  IF auth_user_data IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Insert the missing profile
  INSERT INTO public.users (
    id, 
    role,
    discord_id,
    discord_username,
    discord_avatar_url,
    created_at
  ) VALUES (
    auth_user_data.id, 
    'player'::user_role,
    auth_user_data.raw_user_meta_data->>'provider_id',
    COALESCE(
      auth_user_data.raw_user_meta_data->>'full_name',
      auth_user_data.raw_user_meta_data->>'name', 
      auth_user_data.raw_user_meta_data->>'user_name'
    ),
    auth_user_data.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create missing profile for %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Create the missing profile for the current user who is stuck
SELECT public.create_missing_user_profile('96ba475d-3835-4467-8851-b3f24a9777bd');
