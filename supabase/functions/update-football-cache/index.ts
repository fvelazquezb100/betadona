import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled football odds cache update...');
    
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!apiFootballKey) {
      console.error('API_FOOTBALL_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API Football key not configured' }),
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

    // Get current year for the season parameter
    const currentYear = new Date().getFullYear();
    
    console.log(`Fetching La Liga odds for season ${currentYear} from API-Football...`);
    
    // Fetch La Liga odds from API-Football
    const response = await fetch(
      `https://v3.football.api-sports.io/odds?league=140&season=${currentYear}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiFootballKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        },
      }
    );

    if (!response.ok) {
      console.error('API-Football response not ok:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch football odds data' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const footballData = await response.json();
    console.log(`Successfully fetched football odds data with ${footballData.response?.length || 0} matches`);

    // Update the cache in Supabase with the entire API response
    console.log('Updating football odds cache in database...');
    const { error: updateError } = await supabase
      .from('match_odds_cache')
      .update({ 
        data: footballData,
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

    console.log('Football cache updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Football odds cache updated successfully',
        matches_count: footballData.response?.length || 0,
        season: currentYear,
        updated_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-football-cache function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});