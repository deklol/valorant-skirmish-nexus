
-- Update the rank tracking trigger to also update peak_rank when a user gets a higher rank
CREATE OR REPLACE FUNCTION public.track_rank_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_rank_points INTEGER;
  new_rank_points INTEGER;
BEGIN
  -- Only process if rank actually changed
  IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
    -- Calculate rank points for comparison
    old_rank_points := CASE
      WHEN OLD.current_rank = 'Iron 1' THEN 10
      WHEN OLD.current_rank = 'Iron 2' THEN 15
      WHEN OLD.current_rank = 'Iron 3' THEN 20
      WHEN OLD.current_rank = 'Bronze 1' THEN 25
      WHEN OLD.current_rank = 'Bronze 2' THEN 30
      WHEN OLD.current_rank = 'Bronze 3' THEN 35
      WHEN OLD.current_rank = 'Silver 1' THEN 40
      WHEN OLD.current_rank = 'Silver 2' THEN 50
      WHEN OLD.current_rank = 'Silver 3' THEN 60
      WHEN OLD.current_rank = 'Gold 1' THEN 70
      WHEN OLD.current_rank = 'Gold 2' THEN 80
      WHEN OLD.current_rank = 'Gold 3' THEN 90
      WHEN OLD.current_rank = 'Platinum 1' THEN 100
      WHEN OLD.current_rank = 'Platinum 2' THEN 115
      WHEN OLD.current_rank = 'Platinum 3' THEN 130
      WHEN OLD.current_rank = 'Diamond 1' THEN 150
      WHEN OLD.current_rank = 'Diamond 2' THEN 170
      WHEN OLD.current_rank = 'Diamond 3' THEN 190
      WHEN OLD.current_rank = 'Ascendant 1' THEN 215
      WHEN OLD.current_rank = 'Ascendant 2' THEN 240
      WHEN OLD.current_rank = 'Ascendant 3' THEN 265
      WHEN OLD.current_rank = 'Immortal 1' THEN 300
      WHEN OLD.current_rank = 'Immortal 2' THEN 350
      WHEN OLD.current_rank = 'Immortal 3' THEN 400
      WHEN OLD.current_rank = 'Radiant' THEN 500
      ELSE 150
    END;

    new_rank_points := CASE
      WHEN NEW.current_rank = 'Iron 1' THEN 10
      WHEN NEW.current_rank = 'Iron 2' THEN 15
      WHEN NEW.current_rank = 'Iron 3' THEN 20
      WHEN NEW.current_rank = 'Bronze 1' THEN 25
      WHEN NEW.current_rank = 'Bronze 2' THEN 30
      WHEN NEW.current_rank = 'Bronze 3' THEN 35
      WHEN NEW.current_rank = 'Silver 1' THEN 40
      WHEN NEW.current_rank = 'Silver 2' THEN 50
      WHEN NEW.current_rank = 'Silver 3' THEN 60
      WHEN NEW.current_rank = 'Gold 1' THEN 70
      WHEN NEW.current_rank = 'Gold 2' THEN 80
      WHEN NEW.current_rank = 'Gold 3' THEN 90
      WHEN NEW.current_rank = 'Platinum 1' THEN 100
      WHEN NEW.current_rank = 'Platinum 2' THEN 115
      WHEN NEW.current_rank = 'Platinum 3' THEN 130
      WHEN NEW.current_rank = 'Diamond 1' THEN 150
      WHEN NEW.current_rank = 'Diamond 2' THEN 170
      WHEN NEW.current_rank = 'Diamond 3' THEN 190
      WHEN NEW.current_rank = 'Ascendant 1' THEN 215
      WHEN NEW.current_rank = 'Ascendant 2' THEN 240
      WHEN NEW.current_rank = 'Ascendant 3' THEN 265
      WHEN NEW.current_rank = 'Immortal 1' THEN 300
      WHEN NEW.current_rank = 'Immortal 2' THEN 350
      WHEN NEW.current_rank = 'Immortal 3' THEN 400
      WHEN NEW.current_rank = 'Radiant' THEN 500
      ELSE 150
    END;

    -- Update peak_rank if new rank is higher than current peak
    IF NEW.current_rank != 'Unranked' AND NEW.current_rank IS NOT NULL THEN
      IF OLD.peak_rank IS NULL OR new_rank_points > COALESCE(
        CASE
          WHEN OLD.peak_rank = 'Iron 1' THEN 10
          WHEN OLD.peak_rank = 'Iron 2' THEN 15
          WHEN OLD.peak_rank = 'Iron 3' THEN 20
          WHEN OLD.peak_rank = 'Bronze 1' THEN 25
          WHEN OLD.peak_rank = 'Bronze 2' THEN 30
          WHEN OLD.peak_rank = 'Bronze 3' THEN 35
          WHEN OLD.peak_rank = 'Silver 1' THEN 40
          WHEN OLD.peak_rank = 'Silver 2' THEN 50
          WHEN OLD.peak_rank = 'Silver 3' THEN 60
          WHEN OLD.peak_rank = 'Gold 1' THEN 70
          WHEN OLD.peak_rank = 'Gold 2' THEN 80
          WHEN OLD.peak_rank = 'Gold 3' THEN 90
          WHEN OLD.peak_rank = 'Platinum 1' THEN 100
          WHEN OLD.peak_rank = 'Platinum 2' THEN 115
          WHEN OLD.peak_rank = 'Platinum 3' THEN 130
          WHEN OLD.peak_rank = 'Diamond 1' THEN 150
          WHEN OLD.peak_rank = 'Diamond 2' THEN 170
          WHEN OLD.peak_rank = 'Diamond 3' THEN 190
          WHEN OLD.peak_rank = 'Ascendant 1' THEN 215
          WHEN OLD.peak_rank = 'Ascendant 2' THEN 240
          WHEN OLD.peak_rank = 'Ascendant 3' THEN 265
          WHEN OLD.peak_rank = 'Immortal 1' THEN 300
          WHEN OLD.peak_rank = 'Immortal 2' THEN 350
          WHEN OLD.peak_rank = 'Immortal 3' THEN 400
          WHEN OLD.peak_rank = 'Radiant' THEN 500
          ELSE 150
        END, 0) THEN
        NEW.peak_rank := NEW.current_rank;
      END IF;
    END IF;

    -- Insert rank history record
    INSERT INTO public.rank_history (
      user_id,
      previous_rank,
      new_rank,
      rank_change_type,
      rank_points_change
    ) VALUES (
      NEW.id,
      OLD.current_rank,
      NEW.current_rank,
      CASE
        WHEN old_rank_points < new_rank_points THEN 'promotion'
        WHEN old_rank_points > new_rank_points THEN 'demotion'
        ELSE 'same'
      END,
      new_rank_points - old_rank_points
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Backfill peak_rank for existing users based on their rank history
UPDATE users 
SET peak_rank = (
  SELECT new_rank 
  FROM rank_history rh
  WHERE rh.user_id = users.id 
  AND rh.new_rank IS NOT NULL 
  AND rh.new_rank != 'Unranked'
  ORDER BY 
    CASE rh.new_rank
      WHEN 'Radiant' THEN 500
      WHEN 'Immortal 3' THEN 400
      WHEN 'Immortal 2' THEN 350
      WHEN 'Immortal 1' THEN 300
      WHEN 'Ascendant 3' THEN 265
      WHEN 'Ascendant 2' THEN 240
      WHEN 'Ascendant 1' THEN 215
      WHEN 'Diamond 3' THEN 190
      WHEN 'Diamond 2' THEN 170
      WHEN 'Diamond 1' THEN 150
      WHEN 'Platinum 3' THEN 130
      WHEN 'Platinum 2' THEN 115
      WHEN 'Platinum 1' THEN 100
      WHEN 'Gold 3' THEN 90
      WHEN 'Gold 2' THEN 80
      WHEN 'Gold 1' THEN 70
      WHEN 'Silver 3' THEN 60
      WHEN 'Silver 2' THEN 50
      WHEN 'Silver 1' THEN 40
      WHEN 'Bronze 3' THEN 35
      WHEN 'Bronze 2' THEN 30
      WHEN 'Bronze 1' THEN 25
      WHEN 'Iron 3' THEN 20
      WHEN 'Iron 2' THEN 15
      WHEN 'Iron 1' THEN 10
      ELSE 150
    END DESC
  LIMIT 1
)
WHERE peak_rank IS NULL 
AND EXISTS (
  SELECT 1 FROM rank_history 
  WHERE user_id = users.id 
  AND new_rank IS NOT NULL 
  AND new_rank != 'Unranked'
);

-- Also set peak_rank to current_rank for users who don't have rank history but have a current rank
UPDATE users 
SET peak_rank = current_rank 
WHERE peak_rank IS NULL 
AND current_rank IS NOT NULL 
AND current_rank != 'Unranked';
