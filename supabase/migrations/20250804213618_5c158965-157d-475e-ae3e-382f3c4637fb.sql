-- Create function to get league standings
CREATE OR REPLACE FUNCTION public.get_league_standings(league_id_param UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  total_points NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT id, username, total_points
  FROM public.profiles
  WHERE league_id = league_id_param
  ORDER BY total_points DESC;
$$;