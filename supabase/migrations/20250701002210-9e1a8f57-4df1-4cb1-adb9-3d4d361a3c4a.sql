
-- Add manual rank override fields to users table (only if they don't exist)
DO $$
BEGIN
    -- Check and add manual_rank_override column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'manual_rank_override') THEN
        ALTER TABLE public.users ADD COLUMN manual_rank_override text;
    END IF;
    
    -- Check and add manual_weight_override column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'manual_weight_override') THEN
        ALTER TABLE public.users ADD COLUMN manual_weight_override integer;
    END IF;
    
    -- Check and add rank_override_reason column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'rank_override_reason') THEN
        ALTER TABLE public.users ADD COLUMN rank_override_reason text;
    END IF;
    
    -- Check and add rank_override_set_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'rank_override_set_by') THEN
        ALTER TABLE public.users ADD COLUMN rank_override_set_by uuid REFERENCES public.users(id);
    END IF;
    
    -- Check and add use_manual_override column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'use_manual_override') THEN
        ALTER TABLE public.users ADD COLUMN use_manual_override boolean DEFAULT false;
    END IF;
    
    -- Check and add rank_override_set_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'rank_override_set_at') THEN
        ALTER TABLE public.users ADD COLUMN rank_override_set_at timestamp with time zone;
    END IF;
END $$;

-- Add index for better performance on manual override queries (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_manual_override') THEN
        CREATE INDEX idx_users_manual_override ON public.users(use_manual_override) WHERE use_manual_override = true;
    END IF;
END $$;

-- Create or replace the manual rank override logging function
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

-- Create trigger for manual rank override logging (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_manual_rank_override') THEN
        CREATE TRIGGER trigger_log_manual_rank_override
          AFTER UPDATE ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.log_manual_rank_override();
    END IF;
END $$;
