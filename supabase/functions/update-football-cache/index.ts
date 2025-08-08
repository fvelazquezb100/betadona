import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log(`Function "update-football-cache" up and running!`)

// Helper function to add a delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = Deno.env.get('API_FOOTBALL_KEY')
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY is not set in Edge Function secrets.')
    }
    
    console.log('API Key found. Starting optimized two-step odds fetch...');

    // --- STEP 1: Fetch the NEXT 10 upcoming fixture IDs ---
    const currentYear = new Date().getFullYear();
    // This is the optimized call for just the next matchday
    const fixturesResponse = await fetch(`https://v3.football.api-sports.io/fixtures?league=40&season=${currentYear}&next=10`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    if (!fixturesResponse.ok) {
      throw new Error(`Failed to fetch fixtures: ${await fixturesResponse.text()}`);
    }

    const fixturesData = await fixturesResponse.json();
    const fixtureIDs: number[] = fixturesData.response.map((item: any) => item.fixture.id);
    console.log(`Found ${fixtureIDs.length} upcoming fixtures for the next matchday.`);

    if (fixtureIDs.length === 0) {
      console.log('No upcoming fixtures found. Cache will not be updated.');
       return new Response(JSON.stringify({ message: 'No upcoming fixtures to fetch odds for.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- STEP 2: Fetch odds for each of those fixture IDs ---
    const allOddsData = [];
    for (const fixtureId of fixtureIDs) {
      console.log(`Fetching odds for fixture ID: ${fixtureId}`);
      const oddsResponse = await fetch(`https://v3.football.api-sports.io/odds?fixture=${fixtureId}`, {
         headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': apiKey,
        },
      });

      if (oddsResponse.ok) {
        const oddsJson = await oddsResponse.json();
        if (oddsJson.response && oddsJson.response.length > 0) {
            allOddsData.push(...oddsJson.response);
        }
      } else {
        console.warn(`Could not fetch odds for fixture ${fixtureId}: ${await oddsResponse.text()}`);
      }
      // Add a small delay to avoid hitting API rate limits
      await delay(500); 
    }

    console.log(`Successfully fetched odds for ${allOddsData.length} matches.`);

    // --- STEP 3: Update the cache ---
    const finalCacheObject = { response: allOddsData };
    const { error: updateError } = await supabaseAdmin
      .from('match_odds_cache')
      .update({
        data: finalCacheObject, 
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1);

    if (updateError) {
      throw new Error(`Failed to update cache: ${updateError.message}`);
    }
    
    console.log('Cache updated successfully!');

    return new Response(JSON.stringify({ message: 'Cache updated successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});