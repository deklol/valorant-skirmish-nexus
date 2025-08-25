-- Create tournament_talent table to store talent/staff information for tournaments
CREATE TABLE public.tournament_talent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL,
  lead_tournament_admin_id UUID REFERENCES auth.users(id),
  tournament_admin_ids UUID[],
  production_lead_id UUID REFERENCES auth.users(id),
  production_lead_manual_name TEXT,
  production_assistant_id UUID REFERENCES auth.users(id),  
  production_assistant_manual_name TEXT,
  production_assistant_social_link TEXT,
  caster_1_id UUID REFERENCES auth.users(id),
  caster_1_manual_name TEXT,
  caster_1_social_link TEXT,
  caster_2_id UUID REFERENCES auth.users(id),
  caster_2_manual_name TEXT, 
  caster_2_social_link TEXT,
  observer_id UUID REFERENCES auth.users(id),
  observer_manual_name TEXT,
  observer_social_link TEXT,
  replay_op_id UUID REFERENCES auth.users(id),
  replay_op_manual_name TEXT,
  replay_op_social_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_talent ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage tournament talent" 
ON public.tournament_talent 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Anyone can view tournament talent" 
ON public.tournament_talent 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_tournament_talent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tournament_talent_updated_at
BEFORE UPDATE ON public.tournament_talent
FOR EACH ROW
EXECUTE FUNCTION public.update_tournament_talent_updated_at();