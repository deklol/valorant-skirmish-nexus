
-- Add manual rank override fields to users table
ALTER TABLE public.users 
ADD COLUMN manual_rank_override text,
ADD COLUMN manual_weight_override integer,
ADD COLUMN rank_override_reason text,
ADD COLUMN rank_override_set_by uuid REFERENCES public.users(id),
ADD COLUMN use_manual_override boolean DEFAULT false,
ADD COLUMN rank_override_set_at timestamp with time zone;

-- Update the scrape-rank edge function to also update peak_rank when rank is refreshed
-- This will be handled in the edge function code, but we need to ensure the trigger works properly
-- The existing trigger should handle this, but let's make sure it's robust

-- Add index for better performance on manual override queries
CREATE INDEX idx_users_manual_override ON public.users(use_manual_override) WHERE use_manual_override = true;

-- Add audit logging for manual rank overrides
CREATE OR REPLACE FUNCTION public.log_manual_rank_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log when manual override fields change
  IF (OLD.manual_rank_override IS DISTINCT FROM NEW.manual_rank_override OR 
      OLD.manual_weight_override IS DISTINCT FROM NEW.manual_weight_override OR
      OLD.use_manual_override IS DISTINCT FROM NEW.use_manual_override) THEN
    
    INSERT INTO public.audit_logs (
      table_name,
      action,
      record_id,
      user_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      'users',
      'MANUAL_RANK_OVERRIDE',
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'manual_rank_override', OLD.manual_rank_override,
        'manual_weight_override', OLD.manual_weight_override,
        'use_manual_override', OLD.use_manual_override,
        'rank_override_reason', OLD.rank_override_reason
      ),
      jsonb_build_object(
        'manual_rank_override', NEW.manual_rank_override,
        'manual_weight_override', NEW.manual_weight_override,
        'use_manual_override', NEW.use_manual_override,
        'rank_override_reason', NEW.rank_override_reason,
        'rank_override_set_by', NEW.rank_override_set_by,
        'target_user', NEW.discord_username
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for manual rank override logging
CREATE TRIGGER trigger_log_manual_rank_override
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_manual_rank_override();
