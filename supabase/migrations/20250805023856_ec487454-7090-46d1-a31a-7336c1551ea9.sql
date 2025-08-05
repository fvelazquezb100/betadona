-- Create match_odds_cache table for storing API data
CREATE TABLE public.match_odds_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT single_row_only CHECK (id = 1)
);

-- Enable Row Level Security
ALTER TABLE public.match_odds_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read from this table
CREATE POLICY "Anyone can read odds cache" 
ON public.match_odds_cache 
FOR SELECT 
USING (true);

-- Insert initial empty row
INSERT INTO public.match_odds_cache (id, data) 
VALUES (1, '{"matches": []}');

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;