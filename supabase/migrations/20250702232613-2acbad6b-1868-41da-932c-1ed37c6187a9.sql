-- Fix the handle_new_user function to properly reference the user_role enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
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
    'player',  -- Direct string value, let PostgreSQL handle the cast
    NEW.raw_user_meta_data->>'provider_id',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'user_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$function$;