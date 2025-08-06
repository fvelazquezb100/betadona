import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the structure of the API response
interface ApiResponse {
  response: any[];
}

console.log('Function starting...');

Deno.serve(async (req) => {
  try {
    // 1. Create a Supabase client with the correct permissions
    // The service_role key is required to bypass RLS for server-side operations.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Securely get the API_FOOTBALL_KEY from Edge Function secrets
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY is not set in Edge Function secrets.');
    }
    
    console.log('API Key found. Fetching data from API-Football...');

    // 3. Make the request to API-Football
    const currentYear = new Date().getFullYear();
    const apiResponse = await fetch(`https://v3.football.api-sports.io/odds?league=140&season=${currentYear}`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      throw new Error(`API request failed with status ${apiResponse.status}: ${errorBody}`);
    }

    const oddsData: ApiResponse = await apiResponse.json();
    console.log(`Successfully fetched ${oddsData.response?.length || 0} matches.`);

    // 4. Update the cache table in your database
    const { error: updateError } = await supabaseAdmin
      .from('match_odds_cache')
      .update({
        data: oddsData,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1); // Ensure we update the single row

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
