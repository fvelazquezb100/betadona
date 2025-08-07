-- Temporarily insert some test data to see current structure
INSERT INTO match_odds_cache (id, data, last_updated) 
VALUES (1, '{"response": [{"fixture": {"id": 1, "date": "2025-08-07T18:00:00+00:00", "teams": {"home": {"id": 1, "name": "Real Madrid", "logo": "https://example.com/logo1.png"}, "away": {"id": 2, "name": "Barcelona", "logo": "https://example.com/logo2.png"}}}, "bookmakers": [{"id": 1, "name": "Bet365", "bets": [{"id": 1, "name": "Match Winner", "values": [{"value": "Home", "odd": "2.10"}, {"value": "Draw", "odd": "3.40"}, {"value": "Away", "odd": "3.25"}]}]}]}]}', now()) 
ON CONFLICT (id) DO UPDATE SET 
  data = EXCLUDED.data,
  last_updated = EXCLUDED.last_updated;