import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "update-football-cache" up and running!`)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('1. Retrieving environment variables...')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !apiFootballKey) {
      throw new Error('Missing required environment variables')
    }

    console.log('2. Initializing Supabase admin client...')
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    console.log('3. Fetching data from API-Football...')
    
    // Fetch data from API-Football fixtures endpoint
    const apiUrl = `https://v3.football.api-sports.io/fixtures?league=140&season=2023`
    console.log(`API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiFootballKey,
      },
    })

    console.log(`API Response status: ${response.status}`)

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`)
    }

    const fixturesData = await response.json()
    console.log(`4. Successfully fetched ${fixturesData.response?.length || 0} fixtures from API.`)

    console.log('5. Updating cache table in database...')
    
    // Update the cache table in the database
    const { data, error: updateError } = await supabaseAdmin
      .from('match_odds_cache')
      .update({
        data: fixturesData,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()

    if (updateError) {
      throw new Error(`Failed to update cache: ${updateError.message}`)
    }
    
    console.log('6. Cache updated successfully!', data)

    return new Response(JSON.stringify({ 
      message: 'Cache updated successfully',
      fixtures_count: fixturesData.response?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})