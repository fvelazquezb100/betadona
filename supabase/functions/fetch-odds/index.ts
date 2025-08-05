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
    
    // Fetch upcoming Spanish LaLiga matches with all available betting markets
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds?apiKey=${apiKey}&regions=eu&markets=h2h,totals,spreads,double_chance,both_teams_to_score&oddsFormat=decimal&dateFormat=iso`,
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
      // Find a bookmaker with all markets
      const bookmaker = match.bookmakers[0]; // Use first bookmaker for simplicity
      
      let odds = {
        homeWin: 2.00,
        draw: 3.00,
        awayWin: 2.50
      };

      let totals = {
        over05: 2.20,
        under05: 1.65,
        over15: 1.85,
        under15: 1.95,
        over25: 2.00,
        under25: 1.80,
        over35: 2.40,
        under35: 1.55
      };

      let doubleChance = {
        homeOrDraw: 1.30,
        awayOrDraw: 1.35,
        homeOrAway: 1.25
      };

      let bothTeamsToScore = {
        yes: 1.85,
        no: 1.95
      };

      let spreads: Array<{
        point: number;
        homeOdds: number;
        awayOdds: number;
      }> = [];

      if (bookmaker) {
        // Process h2h market
        const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
        if (h2hMarket && h2hMarket.outcomes.length >= 3) {
          const homeOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.home_team);
          const awayOutcome = h2hMarket.outcomes.find(outcome => outcome.name === match.away_team);
          const drawOutcome = h2hMarket.outcomes.find(outcome => outcome.name === 'Draw');

          odds = {
            homeWin: homeOutcome?.price || 2.00,
            draw: drawOutcome?.price || 3.00,
            awayWin: awayOutcome?.price || 2.50
          };
        }

        // Process totals market (over/under)
        const totalsMarkets = bookmaker.markets.filter(market => market.key === 'totals');
        totalsMarkets.forEach(market => {
          market.outcomes.forEach(outcome => {
            if (outcome.name.includes('Over 0.5')) {
              totals.over05 = outcome.price;
            } else if (outcome.name.includes('Under 0.5')) {
              totals.under05 = outcome.price;
            } else if (outcome.name.includes('Over 1.5')) {
              totals.over15 = outcome.price;
            } else if (outcome.name.includes('Under 1.5')) {
              totals.under15 = outcome.price;
            } else if (outcome.name.includes('Over 2.5')) {
              totals.over25 = outcome.price;
            } else if (outcome.name.includes('Under 2.5')) {
              totals.under25 = outcome.price;
            } else if (outcome.name.includes('Over 3.5')) {
              totals.over35 = outcome.price;
            } else if (outcome.name.includes('Under 3.5')) {
              totals.under35 = outcome.price;
            }
          });
        });

        // Process double chance market
        const doubleChanceMarket = bookmaker.markets.find(market => market.key === 'double_chance');
        if (doubleChanceMarket) {
          doubleChanceMarket.outcomes.forEach(outcome => {
            if (outcome.name.includes('1X') || outcome.name.includes(`${match.home_team} or Draw`)) {
              doubleChance.homeOrDraw = outcome.price;
            } else if (outcome.name.includes('X2') || outcome.name.includes(`${match.away_team} or Draw`)) {
              doubleChance.awayOrDraw = outcome.price;
            } else if (outcome.name.includes('12') || outcome.name.includes(`${match.home_team} or ${match.away_team}`)) {
              doubleChance.homeOrAway = outcome.price;
            }
          });
        }

        // Process both teams to score market
        const bttsMarket = bookmaker.markets.find(market => market.key === 'both_teams_to_score');
        if (bttsMarket) {
          bttsMarket.outcomes.forEach(outcome => {
            if (outcome.name.includes('Yes')) {
              bothTeamsToScore.yes = outcome.price;
            } else if (outcome.name.includes('No')) {
              bothTeamsToScore.no = outcome.price;
            }
          });
        }

        // Process spreads market (handicap)
        const spreadsMarkets = bookmaker.markets.filter(market => market.key === 'spreads');
        spreadsMarkets.forEach(market => {
          market.outcomes.forEach((outcome, index) => {
            if (index % 2 === 0) { // Home team spreads
              const point = parseFloat(outcome.name.split(' ')[1] || '0');
              const existingSpread = spreads.find(s => s.point === point);
              if (existingSpread) {
                existingSpread.homeOdds = outcome.price;
              } else {
                spreads.push({ point, homeOdds: outcome.price, awayOdds: 2.00 });
              }
            } else { // Away team spreads
              const point = parseFloat(outcome.name.split(' ')[1] || '0');
              const existingSpread = spreads.find(s => s.point === Math.abs(point));
              if (existingSpread) {
                existingSpread.awayOdds = outcome.price;
              }
            }
          });
        });
      }

      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        startTime: match.commence_time,
        odds,
        totals,
        doubleChance,
        bothTeamsToScore,
        spreads
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