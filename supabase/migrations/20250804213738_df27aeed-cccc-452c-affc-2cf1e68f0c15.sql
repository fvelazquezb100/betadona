-- Fix security issues from linter

-- Update function with proper search path
CREATE OR REPLACE FUNCTION public.get_league_standings(league_id_param UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  total_points NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, username, total_points
  FROM public.profiles
  WHERE league_id = league_id_param
  ORDER BY total_points DESC;
$$;

-- Update handle_new_user function with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, weekly_budget, total_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User'),
    1000,
    0
  );
  RETURN NEW;
END;
$$;

-- Add missing RLS policies for bets table
CREATE POLICY "Users can view their own bets" 
ON public.bets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bets" 
ON public.bets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets" 
ON public.bets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add missing RLS policies for leagues table
CREATE POLICY "All users can view leagues" 
ON public.leagues 
FOR SELECT 
USING (true);