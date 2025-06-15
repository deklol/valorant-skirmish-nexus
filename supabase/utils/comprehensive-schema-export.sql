
-- SCHEMA: Full Supabase Tournament Platform Structure Export (generated 2025-06-15)
-- 1. Enums
CREATE TYPE public.map_veto_action AS ENUM ('ban', 'pick');
CREATE TYPE public.map_veto_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.match_format AS ENUM ('BO1', 'BO3', 'BO5');
CREATE TYPE public.match_status AS ENUM ('pending', 'live', 'completed');
CREATE TYPE public.team_status AS ENUM ('pending', 'confirmed', 'eliminated', 'winner');
CREATE TYPE public.tournament_status AS ENUM ('draft', 'open', 'balancing', 'live', 'completed', 'archived');
CREATE TYPE public.user_role AS ENUM ('admin', 'player', 'viewer');

-- 2. Tables
-- Audit Logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text,
  action text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  ip_address inet,
  new_values jsonb,
  old_values jsonb,
  record_id uuid,
  user_id uuid
);

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  tournament_id uuid,
  is_important boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- App Settings (singleton config)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'Tournament App',
  announcement_id uuid NULL,
  twitch_embed_enabled boolean NOT NULL DEFAULT false,
  twitch_channel text NULL,
  last_updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.app_settings
  ADD CONSTRAINT fk_announcement FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);
CREATE UNIQUE INDEX one_row_only ON public.app_settings ((true));

-- Maps
CREATE TABLE public.maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tournaments
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status public.tournament_status DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  start_time timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  check_in_required boolean DEFAULT true,
  check_in_starts_at timestamptz,
  check_in_ends_at timestamptz,
  max_teams integer NOT NULL,
  max_players integer DEFAULT 40,
  prize_pool text,
  match_format public.match_format DEFAULT 'BO1',
  team_size integer DEFAULT 5,
  enable_map_veto boolean DEFAULT false,
  map_veto_required_rounds jsonb DEFAULT '[]'::jsonb,
  bracket_type text DEFAULT 'single_elimination',
  final_match_format public.match_format DEFAULT NULL,
  semifinal_match_format public.match_format DEFAULT NULL
);

-- Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tournament_id uuid,
  captain_id uuid,
  seed integer,
  status public.team_status DEFAULT 'pending',
  total_rank_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team Members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid,
  user_id uuid,
  is_captain boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);

-- Tournament Signups
CREATE TABLE public.tournament_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid,
  user_id uuid,
  is_substitute boolean DEFAULT false,
  is_checked_in boolean DEFAULT false,
  checked_in_at timestamptz,
  signed_up_at timestamptz DEFAULT now()
);

-- Users (profile table, mirrors Auth)
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  discord_id text,
  discord_username text,
  discord_avatar_url text,
  riot_id text,
  riot_id_last_updated timestamptz,
  current_rank text,
  rank_points integer DEFAULT 0,
  peak_rank text,
  weight_rating integer DEFAULT 150,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  tournaments_played integer DEFAULT 0,
  tournaments_won integer DEFAULT 0,
  mvp_awards integer DEFAULT 0,
  is_phantom boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  ban_reason text,
  ban_expires_at timestamptz,
  role public.user_role DEFAULT 'player',
  bio text,
  twitter_handle text,
  twitch_handle text,
  profile_visibility text DEFAULT 'public',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_rank_update timestamptz
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  tournament_id uuid,
  match_id uuid,
  team_id uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  read boolean DEFAULT false
);

-- User Notification Preferences
CREATE TABLE public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  new_tournament_posted boolean DEFAULT true,
  tournament_signups_open boolean DEFAULT true,
  tournament_checkin_time boolean DEFAULT true,
  team_assigned boolean DEFAULT true,
  match_assigned boolean DEFAULT true,
  match_ready boolean DEFAULT true,
  post_results boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid,
  team1_id uuid,
  team2_id uuid,
  winner_id uuid,
  round_number integer NOT NULL,
  match_number integer NOT NULL,
  status public.match_status DEFAULT 'pending',
  best_of integer DEFAULT 1,
  score_team1 integer DEFAULT 0,
  score_team2 integer DEFAULT 0,
  scheduled_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  map_veto_enabled boolean DEFAULT NULL,
  bracket_position text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  stream_url text
);

-- Map Veto Sessions
CREATE TABLE public.map_veto_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid,
  status public.map_veto_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  veto_order jsonb,
  current_turn_team_id uuid
);

-- Map Veto Actions
CREATE TABLE public.map_veto_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veto_session_id uuid,
  team_id uuid,
  map_id uuid,
  action public.map_veto_action NOT NULL,
  order_number integer NOT NULL,
  performed_by uuid,
  performed_at timestamptz DEFAULT now()
);

-- Match Maps
CREATE TABLE public.match_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid,
  map_id uuid,
  map_order integer NOT NULL,
  team1_score integer DEFAULT 0,
  team2_score integer DEFAULT 0,
  winner_team_id uuid,
  started_at timestamptz,
  completed_at timestamptz
);

-- Match Result Submissions
CREATE TABLE public.match_result_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  score_team1 integer NOT NULL DEFAULT 0,
  score_team2 integer NOT NULL DEFAULT 0,
  winner_id uuid,
  submitted_by uuid NOT NULL,
  confirmed_by uuid,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phantom Players
CREATE TABLE public.phantom_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tournament_id uuid NOT NULL,
  weight_rating integer DEFAULT 150,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Rank History
CREATE TABLE public.rank_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_rank text,
  new_rank text NOT NULL,
  rank_change_type text NOT NULL CHECK (rank_change_type IN ('promotion', 'demotion', 'same')),
  rank_points_change integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_rank_history_user_id ON public.rank_history(user_id);
CREATE INDEX idx_rank_history_updated_at ON public.rank_history(updated_at DESC);
CREATE INDEX idx_tournament_signups_user_id ON public.tournament_signups(user_id);
CREATE INDEX idx_tournament_signups_tournament_id ON public.tournament_signups(tournament_id);

-- 4. Foreign Keys
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);

ALTER TABLE public.maps
  ADD CONSTRAINT maps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE public.teams
  ADD CONSTRAINT teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);
ALTER TABLE public.teams
  ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.users(id);

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.tournament_signups
  ADD CONSTRAINT tournament_signups_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);
ALTER TABLE public.tournament_signups
  ADD CONSTRAINT tournament_signups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);

ALTER TABLE public.user_notification_preferences
  ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.matches
  ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);
ALTER TABLE public.matches
  ADD CONSTRAINT matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id);
ALTER TABLE public.matches
  ADD CONSTRAINT matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id);
ALTER TABLE public.matches
  ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);

ALTER TABLE public.map_veto_sessions
  ADD CONSTRAINT map_veto_sessions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
ALTER TABLE public.map_veto_sessions
  ADD CONSTRAINT map_veto_sessions_current_turn_team_id_fkey FOREIGN KEY (current_turn_team_id) REFERENCES public.teams(id);

ALTER TABLE public.map_veto_actions
  ADD CONSTRAINT map_veto_actions_veto_session_id_fkey FOREIGN KEY (veto_session_id) REFERENCES public.map_veto_sessions(id);
ALTER TABLE public.map_veto_actions
  ADD CONSTRAINT map_veto_actions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
ALTER TABLE public.map_veto_actions
  ADD CONSTRAINT map_veto_actions_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);
ALTER TABLE public.map_veto_actions
  ADD CONSTRAINT map_veto_actions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);

ALTER TABLE public.match_maps
  ADD CONSTRAINT match_maps_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
ALTER TABLE public.match_maps
  ADD CONSTRAINT match_maps_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);
ALTER TABLE public.match_maps
  ADD CONSTRAINT match_maps_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id);

ALTER TABLE public.match_result_submissions
  ADD CONSTRAINT match_result_submissions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);
ALTER TABLE public.match_result_submissions
  ADD CONSTRAINT match_result_submissions_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);

ALTER TABLE public.phantom_players
  ADD CONSTRAINT phantom_players_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.phantom_players
  ADD CONSTRAINT phantom_players_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);

ALTER TABLE public.rank_history
  ADD CONSTRAINT rank_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- 5. Row-Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_veto_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_veto_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phantom_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- [POLICIES - only a subset, add all app policies here as needed from code/migrations]
-- Example RLS policies (add all your app's policies as in migrations):
-- App Settings - public select, admin update
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view app settings"
  ON public.app_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- [Add ALL policies for all your protected tables here, following your actual migrations]

-- 6. Functions (core user/tournament logic)
-- -- (abbreviated; copy full PL/pgSQL function content for all your custom functions from migrations)
-- Example:
CREATE OR REPLACE FUNCTION public.increment_user_wins(user_id uuid) RETURNS void AS $$
BEGIN
  UPDATE users SET wins = COALESCE(wins, 0) + 1 WHERE id = user_id;
  RAISE LOG 'Incremented wins for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (add all other user functions defined in migrations, e.g. increment_user_losses, veto actions, etc.)

-- 7. Triggers
-- Example: track rank changes
CREATE OR REPLACE FUNCTION public.track_rank_change() RETURNS trigger AS $$
BEGIN
  IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
    INSERT INTO public.rank_history (
      user_id, previous_rank, new_rank, rank_change_type, rank_points_change
    ) VALUES (
      NEW.id, OLD.current_rank, NEW.current_rank,
      CASE
        WHEN OLD.rank_points < NEW.rank_points THEN 'promotion'
        WHEN OLD.rank_points > NEW.rank_points THEN 'demotion'
        ELSE 'same'
      END,
      COALESCE(NEW.rank_points, 0) - COALESCE(OLD.rank_points, 0)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trigger_track_rank_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.track_rank_change();

-- (Add all other triggers from your migrations here.)

-- 8. Real-time Configuration (REPLICA IDENTITY + Publication)
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER TABLE public.match_result_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_result_submissions;
ALTER TABLE public.map_veto_actions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_veto_actions;

-- 9. Comments
-- (Optional: Add column/table comments for clarity, as in your migrations.)

-- END EXPORT
