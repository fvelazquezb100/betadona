import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
    };
  };
  teams: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  score: {
    fulltime: {
      home: number;
      away: number;
    };
  };
}

interface Bet {
  id: number;
  user_id: string;
  match_description: string;
  bet_selection: string;
  stake: number;
  odds: number;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting matchday results processing...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API Football key
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiFootballKey) {
      throw new Error('API_FOOTBALL_KEY not found');
    }

    // Step 1: Get previous day's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Fetching fixtures for date: ${dateString}`);

    // Step 2: Fetch finished La Liga matches from previous day
    const fixturesResponse = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=140&date=${dateString}&status=FT`,
      {
        headers: {
          'X-RapidAPI-Key': apiFootballKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        }
      }
    );

    if (!fixturesResponse.ok) {
      throw new Error(`API Football request failed: ${fixturesResponse.status}`);
    }

    const fixturesData = await fixturesResponse.json();
    const fixtures: Fixture[] = fixturesData.response || [];

    console.log(`Found ${fixtures.length} finished fixtures`);

    if (fixtures.length === 0) {
      console.log('No finished fixtures found for yesterday');
      return new Response(
        JSON.stringify({ message: 'No finished fixtures found for yesterday', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get all pending bets
    const { data: pendingBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'pending');

    if (betsError) {
      throw new Error(`Error fetching pending bets: ${betsError.message}`);
    }

    console.log(`Found ${pendingBets?.length || 0} pending bets`);

    if (!pendingBets || pendingBets.length === 0) {
      console.log('No pending bets found');
      return new Response(
        JSON.stringify({ message: 'No pending bets found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedBets: any[] = [];
    const userPayouts: { [userId: string]: number } = {};

    // Step 4: Process each pending bet
    for (const bet of pendingBets) {
      try {
        console.log(`Processing bet ${bet.id}: ${bet.match_description} - ${bet.bet_selection}`);

        // Find the corresponding fixture
        const fixture = fixtures.find(f => 
          bet.match_description.includes(f.teams.home.name) && 
          bet.match_description.includes(f.teams.away.name)
        );

        if (!fixture) {
          console.log(`No matching fixture found for bet ${bet.id}`);
          continue;
        }

        // Determine bet outcome
        let betWon = false;
        const homeGoals = fixture.goals.home;
        const awayGoals = fixture.goals.away;
        const totalGoals = homeGoals + awayGoals;

        // Parse bet selection to determine bet type and outcome
        if (bet.bet_selection.includes('Match Winner') || bet.bet_selection.includes('Ganador del Partido')) {
          // Match Winner bet
          let winnerSelection = '';
          if (bet.bet_selection.includes(fixture.teams.home.name)) {
            winnerSelection = 'home';
          } else if (bet.bet_selection.includes(fixture.teams.away.name)) {
            winnerSelection = 'away';
          } else if (bet.bet_selection.includes('Draw') || bet.bet_selection.includes('Empate')) {
            winnerSelection = 'draw';
          }

          if (homeGoals > awayGoals && winnerSelection === 'home') {
            betWon = true;
          } else if (awayGoals > homeGoals && winnerSelection === 'away') {
            betWon = true;
          } else if (homeGoals === awayGoals && winnerSelection === 'draw') {
            betWon = true;
          }
        } else if (bet.bet_selection.includes('Goals Over/Under') || bet.bet_selection.includes('Goles Más/Menos')) {
          // Goals Over/Under bet
          const overUnderMatch = bet.bet_selection.match(/(\d+\.?\d*)/);
          if (overUnderMatch) {
            const threshold = parseFloat(overUnderMatch[1]);
            if (bet.bet_selection.includes('Over') || bet.bet_selection.includes('Más de')) {
              betWon = totalGoals > threshold;
            } else if (bet.bet_selection.includes('Under') || bet.bet_selection.includes('Menos de')) {
              betWon = totalGoals < threshold;
            }
          }
        } else if (bet.bet_selection.includes('Both Teams To Score') || bet.bet_selection.includes('Ambos Equipos Marcan')) {
          // Both Teams To Score bet
          if (bet.bet_selection.includes('Yes') || bet.bet_selection.includes('Sí')) {
            betWon = homeGoals > 0 && awayGoals > 0;
          } else if (bet.bet_selection.includes('No')) {
            betWon = homeGoals === 0 || awayGoals === 0;
          }
        }

        // Calculate payout
        let newStatus = '';
        let payout = 0;

        if (betWon) {
          newStatus = 'won';
          payout = (bet.stake * bet.odds) - bet.stake; // Profit only
        } else {
          newStatus = 'lost';
          payout = -bet.stake; // Loss
        }

        // Update the bet in database
        const { error: updateError } = await supabase
          .from('bets')
          .update({
            status: newStatus,
            payout: payout
          })
          .eq('id', bet.id);

        if (updateError) {
          console.error(`Error updating bet ${bet.id}: ${updateError.message}`);
          continue;
        }

        // Track user payout
        if (!userPayouts[bet.user_id]) {
          userPayouts[bet.user_id] = 0;
        }
        userPayouts[bet.user_id] += payout;

        processedBets.push({
          betId: bet.id,
          status: newStatus,
          payout: payout,
          fixture: `${fixture.teams.home.name} ${homeGoals}-${awayGoals} ${fixture.teams.away.name}`
        });

        console.log(`Bet ${bet.id} processed: ${newStatus}, payout: ${payout}`);

      } catch (error) {
        console.error(`Error processing bet ${bet.id}: ${error.message}`);
      }
    }

    // Step 5: Update user standings
    console.log('Updating user standings...');
    
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    const updatedUsers: any[] = [];

    for (const profile of profiles || []) {
      try {
        const userPayout = userPayouts[profile.id] || 0;
        const newTotalPoints = (profile.total_points || 0) + userPayout;

        // Update user's total points and reset weekly budget
        const { error: updateUserError } = await supabase
          .from('profiles')
          .update({
            total_points: newTotalPoints,
            weekly_budget: 1000 // Reset to 1000
          })
          .eq('id', profile.id);

        if (updateUserError) {
          console.error(`Error updating user ${profile.id}: ${updateUserError.message}`);
          continue;
        }

        updatedUsers.push({
          userId: profile.id,
          username: profile.username,
          payout: userPayout,
          newTotalPoints: newTotalPoints
        });

        console.log(`User ${profile.username} updated: payout ${userPayout}, new total: ${newTotalPoints}`);

      } catch (error) {
        console.error(`Error updating user ${profile.id}: ${error.message}`);
      }
    }

    console.log(`Matchday processing completed. Processed ${processedBets.length} bets, updated ${updatedUsers.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateString,
        fixturesFound: fixtures.length,
        betsProcessed: processedBets.length,
        usersUpdated: updatedUsers.length,
        processedBets: processedBets,
        updatedUsers: updatedUsers
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in process-matchday-results function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});