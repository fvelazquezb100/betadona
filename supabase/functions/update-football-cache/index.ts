import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "update-football-cache" up and running!`)

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke the function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a Supabase client with the correct service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Securely get the API_FOOTBALL_KEY
    const apiKey = Deno.env.get('API_FOOTBALL_KEY')
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY is not set in Edge Function secrets.')
    }
    
    console.log('API Key found. Fetching data from API-Football...')

    // 3. Make the request to API-Football
    const currentYear = new Date().getFullYear()
    const response = await fetch(`https://v3.football.api-sports.io/odds?league=140&season=${currentYear}`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`)
    }

    const oddsData = await response.json()
    console.log(`Successfully fetched data for ${oddsData.response?.length || 0} matches.`)

    // 4. Update the cache table in your database
    const { error: updateError } = await supabaseAdmin
      .from('match_odds_cache')
      .update({
        data: oddsData,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1) // Ensure we update the single row

    if (updateError) {
      throw new Error(`Failed to update cache: ${updateError.message}`)
    }
    
    console.log('Cache updated successfully!')

    return new Response(JSON.stringify({ message: 'Cache updated successfully' }), {
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
