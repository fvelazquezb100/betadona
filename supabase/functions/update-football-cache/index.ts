import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for web app requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the structure of the API response
interface ApiResponse {
  response: any[];
}

console.log('Edge Function starting...');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('1. Retrieving environment variables...');
    
    // 1. Securely get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');

    if (!supabaseUrl || !serviceRoleKey || !apiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!apiKey) missing.push('API_FOOTBALL_KEY');
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('2. Initializing Supabase admin client...');
    
    // 2. Create a Supabase admin client with the correct permissions
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log('3. Fetching data from API-Football...');

    // 3. Make the request to API-Football
    const currentYear = new Date().getFullYear();
    const apiUrl = `https://v3.football.api-sports.io/odds?league=140&season=${currentYear}`;
    
    console.log(`API URL: ${apiUrl}`);
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    console.log(`API Response status: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`API request failed: ${errorBody}`);
      throw new Error(`API request failed with status ${apiResponse.status}: ${errorBody}`);
    }

    const oddsData: ApiResponse = await apiResponse.json();
    console.log(`4. Successfully fetched ${oddsData.response?.length || 0} matches from API.`);

    console.log('5. Updating cache table in database...');

    // 4. Update the cache table in your database
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('match_odds_cache')
      .update({
        data: oddsData,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1)
      .select();

    if (updateError) {
      console.error(`Database update failed: ${updateError.message}`);
      throw new Error(`Failed to update cache: ${updateError.message}`);
    }
    
    console.log('6. Cache updated successfully!', updateData);

    return new Response(
      JSON.stringify({ 
        message: 'Cache updated successfully',
        matches_count: oddsData.response?.length || 0,
        updated_at: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
