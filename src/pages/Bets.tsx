import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import BetSlip from '@/components/BetSlip';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// --- Type Definitions for API-Football Data ---
interface Team {
  id: number;
  name: string;
  logo: string;
}

interface Fixture {
  id: number;
  date: string;
  teams: {
    home: Team;
    away: Team;
  };
}

interface BetValue {
  value: string;
  odd: string;
}

interface BetMarket {
  id: number;
  name: string;
  values: BetValue[];
}

interface Bookmaker {
  id: number;
  name: string;
  bets: BetMarket[];
}

interface MatchData {
  fixture: Fixture;
  bookmakers: Bookmaker[];
}

interface ApiResponse {
  response: MatchData[];
}

// --- Component ---
const Bets = () => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBets, setSelectedBets] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOdds = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: cacheData, error: cacheError } = await supabase
          .from('match_odds_cache')
          .select('data')
          .single();

        if (cacheError || !cacheData) {
          throw new Error('Failed to fetch data from cache.');
        }

        // The 'data' property from the cache contains the full API response
        const apiResponse: ApiResponse = cacheData.data as ApiResponse;
        
        console.log("Parsed API Response:", apiResponse);

        if (apiResponse && apiResponse.response && apiResponse.response.length > 0) {
          setMatches(apiResponse.response);
        } else {
          // This case handles when the API returns an empty 'response' array
          setMatches([]);
        }

      } catch (err: any) {
        setError('Failed to fetch or parse live betting data. Please try again later.');
        console.error("Error details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
  }, []);

  const handleAddToSlip = (match: MatchData, marketName: string, selection: BetValue) => {
    const bet = {
      id: `${match.fixture.id}-${marketName}-${selection.value}`,
      matchDescription: `${match.fixture.teams.home.name} vs ${match.fixture.teams.away.name}`,
      market: marketName,
      selection: selection.value,
      odds: parseFloat(selection.odd),
    };

    if (selectedBets.some(b => b.id === bet.id)) {
      toast({
        title: 'Bet already in slip',
        description: 'You have already added this selection to your bet slip.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedBets(prev => [...prev, bet]);
    toast({
      title: 'Bet added to slip!',
      description: `${selection.value} @ ${selection.odd}`,
    });
  };

  const findMarket = (match: MatchData, marketName: string) => {
    // Use the first bookmaker's odds as a reference
    return match.bookmakers?.[0]?.bets.find(bet => bet.name === marketName);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Spanish LaLiga - Live Odds</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-grow space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="w-full md:w-1/3">
            <BetSlip selectedBets={selectedBets} setSelectedBets={setSelectedBets} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="p-8 bg-red-100 text-red-700 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Spanish LaLiga - Live Odds</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          {matches.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {matches.map((match) => {
                const matchWinnerMarket = findMarket(match, 'Match Winner');
                const goalsMarket = findMarket(match, 'Goals Over/Under');
                const bttsMarket = findMarket(match, 'Both Teams To Score');

                return (
                  <AccordionItem value={`match-${match.fixture.id}`} key={match.fixture.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <AccordionTrigger>
                      <div className="text-left">
                        <p className="font-bold text-lg">{match.fixture.teams.home.name} vs {match.fixture.teams.away.name}</p>
                        <p className="text-sm text-gray-500">{new Date(match.fixture.date).toLocaleString()}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {matchWinnerMarket && (
                          <div>
                            <h4 className="font-semibold mb-2">Match Winner</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {matchWinnerMarket.values.map(value => (
                                <Button key={value.value} variant="outline" className="flex flex-col h-auto" onClick={() => handleAddToSlip(match, 'Match Winner', value)}>
                                  <span>{value.value}</span>
                                  <span className="font-bold">{value.odd}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {bttsMarket && (
                           <div>
                            <h4 className="font-semibold mb-2">Both Teams To Score</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {bttsMarket.values.map(value => (
                                <Button key={value.value} variant="outline" className="flex flex-col h-auto" onClick={() => handleAddToSlip(match, 'Both Teams To Score', value)}>
                                  <span>{value.value}</span>
                                  <span className="font-bold">{value.odd}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {goalsMarket && (
                          <div>
                            <h4 className="font-semibold mb-2">Goals Over/Under</h4>
                             <div className="grid grid-cols-2 gap-2">
                              {goalsMarket.values.map(value => (
                                <Button key={value.value} variant="outline" className="flex flex-col h-auto" onClick={() => handleAddToSlip(match, 'Goals Over/Under', value)}>
                                  <span>{value.value}</span>
                                  <span className="font-bold">{value.odd}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <p>No upcoming matches available at the moment.</p>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/3">
          <BetSlip selectedBets={selectedBets} setSelectedBets={setSelectedBets} />
        </div>
      </div>
    </div>
  );
};

export default Bets;
