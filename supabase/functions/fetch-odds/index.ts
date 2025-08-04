import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OddsResponse {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Array<{
    key: string
    title: string
    markets: Array<{
      key: string
      outcomes: Array<{
        name: string
        price: number
      }>
    }>
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ODDS_API_KEY');
    
    if (!apiKey) {
      console.error('ODDS_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching Spanish LaLiga odds...');
    
    // Fetch upcoming Spanish LaLiga matches with odds
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Odds API response not ok:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch odds data' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const oddsData: OddsResponse[] = await response.json();
    console.log(`Successfully fetched ${oddsData.length} matches`);

    // Transform the data to match our frontend structure
    const transformedMatches = oddsData.map((match) => {
      // Find a bookmaker with h2h odds
      const bookmakerWithH2H = match.bookmakers.find(bookmaker => 
        bookmaker.markets.some(market => market.key === 'h2h')
      );
      
      let odds = {
        homeWin: 2.00,
        draw: 3.00,
        awayWin: 2.50
      };

      if (bookmakerWithH2H) {
        const h2hMarket = bookmakerWithH2H.markets.find(market => market.key === 'h2h');
        if (h2hMarket && h2hMarket.outcomes.length >= 3) {
          // Map outcomes to our structure
          const homeOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.home_team);
          const awayOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.away_team);
          const drawOutcome = h2hMarket.outcomes.find(outcome => outcome.name === 'Draw');

          odds = {
            homeWin: homeOutcome?.price || 2.00,
            draw: drawOutcome?.price || 3.00,
            awayWin: awayOutcome?.price || 2.50
          };
        }
      }

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        startTime: match.commence_time,
        odds
      };
    });

    console.log('Transformed matches:', transformedMatches.length);

    return new Response(
      JSON.stringify({ matches: transformedMatches }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-odds function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});