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
    console.log('Starting scheduled odds cache update...');
    
    const apiKey = Deno.env.get('ODDS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration not found');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key for database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching Spanish LaLiga odds from API...');
    
    // Fetch upcoming Spanish LaLiga matches with h2h and totals markets
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`,
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
    console.log(`Successfully fetched ${oddsData.length} matches from API`);

    // Transform the data to match our frontend structure
    const transformedMatches = oddsData.map((match) => {
      // Find a bookmaker with all markets
      const bookmaker = match.bookmakers[0]; // Use first bookmaker for simplicity
      
      let odds = {
        homeWin: 2.00,
        draw: 3.00,
        awayWin: 2.50
      };

      let totals = {
        over25: 2.00,
        under25: 1.80
      };

      if (bookmaker) {
        // Process h2h market
        const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
        if (h2hMarket && h2hMarket.outcomes.length >= 3) {
          const homeOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.home_team);
          const awayOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.away_team);
          const drawOutcome = h2hMarket.outcomes.find(outcome => outcome.name === 'Draw');

          if (homeOutcome && awayOutcome && drawOutcome) {
            odds = {
              homeWin: homeOutcome.price,
              draw: drawOutcome.price,
              awayWin: awayOutcome.price
            };
          }
        }

        // Process totals market (over/under)
        const totalsMarket = bookmaker.markets.find(market => market.key === 'totals');
        if (totalsMarket && totalsMarket.outcomes.length >= 2) {
          totalsMarket.outcomes.forEach(outcome => {
            if (outcome.name.includes('Over 2.5') || outcome.name === 'Over') {
              totals.over25 = outcome.price;
            } else if (outcome.name.includes('Under 2.5') || outcome.name === 'Under') {
              totals.under25 = outcome.price;
            }
          });
        }
      }

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        startTime: match.commence_time,
        odds,
        totals
      };
    });

    const cacheData = { matches: transformedMatches };

    // Update the cache in Supabase
    console.log('Updating odds cache in database...');
    const { error: updateError } = await supabase
      .from('match_odds_cache')
      .update({ 
        data: cacheData,
        last_updated: new Date().toISOString()
      })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating cache:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update cache' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Cache updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Odds cache updated successfully',
        matches_count: transformedMatches.length,
        updated_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-odds-cache function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});