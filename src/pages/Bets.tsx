import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BetSlip, { BetSelection } from "@/components/BetSlip";

interface BookmakerBet {
  id: number;
  name: string;
  values: Array<{
    value: string;
    odd: string;
  }>;
}

interface ApiFootballMatch {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: BookmakerBet[];
  }>;
}

interface ParsedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  markets: {
    matchWinner?: {
      home?: number;
      draw?: number;
      away?: number;
    };
    goalsOverUnder?: Array<{
      value: string;
      odd: number;
    }>;
    asianHandicap?: Array<{
      value: string;
      odd: number;
    }>;
    bothTeamsToScore?: {
      yes?: number;
      no?: number;
    };
  };
}

const Bets = () => {
  const [matches, setMatches] = useState<ParsedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [betSelections, setBetSelections] = useState<BetSelection[]>([]);
  const [userBudget, setUserBudget] = useState<number>(0);
  const { toast } = useToast();

  const formatMatchTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const addToBetSlip = (match: ParsedMatch, selection: string, odds: number) => {
    const betId = `${match.id}-${selection}`;
    const existingBet = betSelections.find(bet => bet.id === betId);
    
    if (existingBet) {
      toast({
        title: "Already Added",
        description: "This bet is already in your slip.",
        variant: "destructive",
      });
      return;
    }

    const newBet: BetSelection = {
      id: betId,
      matchDescription: `${match.homeTeam} vs ${match.awayTeam}`,
      selection,
      odds,
      stake: 0
    };

    setBetSelections(prev => [...prev, newBet]);
    toast({
      title: "Added to Bet Slip",
      description: `${selection} (${odds.toFixed(2)})`,
    });
  };

  const removeBetSelection = (id: string) => {
    setBetSelections(prev => prev.filter(bet => bet.id !== id));
  };

  const updateBetStake = (id: string, stake: number) => {
    setBetSelections(prev => 
      prev.map(bet => bet.id === id ? { ...bet, stake } : bet)
    );
  };

  const clearAllBets = () => {
    setBetSelections([]);
  };

  const parseApiFootballData = (apiMatches: ApiFootballMatch[]): ParsedMatch[] => {
    return apiMatches.map(match => {
      const markets: ParsedMatch['markets'] = {};
      
      // Parse bookmaker data if available
      if (match.bookmakers && match.bookmakers.length > 0) {
        const bookmaker = match.bookmakers[0];
        
        bookmaker.bets.forEach(bet => {
          switch (bet.name) {
            case 'Match Winner':
              markets.matchWinner = {};
              bet.values.forEach(value => {
                const odd = parseFloat(value.odd);
                if (value.value === 'Home') markets.matchWinner!.home = odd;
                else if (value.value === 'Draw') markets.matchWinner!.draw = odd;
                else if (value.value === 'Away') markets.matchWinner!.away = odd;
              });
              break;
              
            case 'Goals Over/Under':
              markets.goalsOverUnder = bet.values.map(value => ({
                value: value.value,
                odd: parseFloat(value.odd)
              }));
              break;
              
            case 'Asian Handicap':
              markets.asianHandicap = bet.values.map(value => ({
                value: value.value,
                odd: parseFloat(value.odd)
              }));
              break;
              
            case 'Both Teams to Score':
              markets.bothTeamsToScore = {};
              bet.values.forEach(value => {
                const odd = parseFloat(value.odd);
                if (value.value === 'Yes') markets.bothTeamsToScore!.yes = odd;
                else if (value.value === 'No') markets.bothTeamsToScore!.no = odd;
              });
              break;
          }
        });
      }
      
      return {
        id: match.fixture.id.toString(),
        homeTeam: match.fixture.home.name,
        awayTeam: match.fixture.away.name,
        startTime: match.fixture.date,
        markets
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch cached football data
        const { data: cacheData, error: cacheError } = await supabase
          .from('match_odds_cache')
          .select('data')
          .eq('id', 1)
          .single();
        
        if (cacheError) {
          console.error('Error fetching cached data:', cacheError);
          toast({
            title: "Error",
            description: "Failed to fetch live betting data. Please try again later.",
            variant: "destructive",
          });
          return;
        }

        // Type cast the JSON data properly
        const apiData = cacheData.data as { response?: ApiFootballMatch[] };
        if (apiData?.response && Array.isArray(apiData.response)) {
          console.log('Sample API-Football data for debugging:', apiData.response[0]);
          const parsedMatches = parseApiFootballData(apiData.response);
          setMatches(parsedMatches);
        }

        // Fetch user budget
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('User not found:', userError);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('weekly_budget')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        if (profile) {
          setUserBudget(profile.weekly_budget || 0);
        }

      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to load betting data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-soccer-field mb-8">Spanish LaLiga - Live Odds</h1>
        
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-card border shadow-sm">
                    <CardHeader className="pb-4">
                      <Skeleton className="h-6 w-3/4 mx-auto" />
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="text-center">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <Card className="bg-card border shadow-sm">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No upcoming matches available at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {matches.map((match) => (
                <Card key={match.id} className="bg-card border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-center">
                      {match.homeTeam} vs {match.awayTeam}
                    </CardTitle>
                    <p className="text-center text-muted-foreground font-medium">
                      {formatMatchTime(match.startTime)}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <Accordion type="single" defaultValue="result" collapsible className="w-full">
                      {/* Result Section - Match Winner */}
                      {match.markets.matchWinner && (
                        <AccordionItem value="result">
                          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span>Result</span>
                              <span className="text-sm text-muted-foreground font-normal">
                                (Match Winner)
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 animate-accordion-down">
                            <div className="grid grid-cols-3 gap-3">
                              {match.markets.matchWinner.home && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                                    {match.homeTeam}
                                  </p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, `${match.homeTeam} to Win`, match.markets.matchWinner!.home!)}
                                    className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                  >
                                    {match.markets.matchWinner.home.toFixed(2)}
                                  </Button>
                                </div>
                              )}
                              {match.markets.matchWinner.draw && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                                    Draw
                                  </p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Draw', match.markets.matchWinner!.draw!)}
                                    className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                  >
                                    {match.markets.matchWinner.draw.toFixed(2)}
                                  </Button>
                                </div>
                              )}
                              {match.markets.matchWinner.away && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                                    {match.awayTeam}
                                  </p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, `${match.awayTeam} to Win`, match.markets.matchWinner!.away!)}
                                    className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                  >
                                    {match.markets.matchWinner.away.toFixed(2)}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Goals Section - Over/Under */}
                      {match.markets.goalsOverUnder && match.markets.goalsOverUnder.length > 0 && (
                        <AccordionItem value="goals">
                          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span>Goals</span>
                              <span className="text-sm text-muted-foreground font-normal">
                                (Over/Under)
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 animate-accordion-down">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-3">Total Goals</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {match.markets.goalsOverUnder.map((goal, index) => (
                                  <div key={index} className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2">{goal.value}</p>
                                    <Button
                                      variant="outline"
                                      onClick={() => addToBetSlip(match, goal.value, goal.odd)}
                                      className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                    >
                                      {goal.odd.toFixed(2)}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Asian Handicap Section */}
                      {match.markets.asianHandicap && match.markets.asianHandicap.length > 0 && (
                        <AccordionItem value="handicap">
                          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span>Handicap</span>
                              <span className="text-sm text-muted-foreground font-normal">
                                (Asian Handicap)
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 animate-accordion-down">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-3">Asian Handicap</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {match.markets.asianHandicap.map((handicap, index) => (
                                  <div key={index} className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2">{handicap.value}</p>
                                    <Button
                                      variant="outline"
                                      onClick={() => addToBetSlip(match, handicap.value, handicap.odd)}
                                      className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                    >
                                      {handicap.odd.toFixed(2)}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Both Teams to Score Section */}
                      {match.markets.bothTeamsToScore && (
                        <AccordionItem value="btts">
                          <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span>Both Teams to Score</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 animate-accordion-down">
                            <div className="grid grid-cols-2 gap-3">
                              {match.markets.bothTeamsToScore.yes && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2">Yes</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Both Teams to Score - Yes', match.markets.bothTeamsToScore!.yes!)}
                                    className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                  >
                                    {match.markets.bothTeamsToScore.yes.toFixed(2)}
                                  </Button>
                                </div>
                              )}
                              {match.markets.bothTeamsToScore.no && (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2">No</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Both Teams to Score - No', match.markets.bothTeamsToScore!.no!)}
                                    className="w-full h-11 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-all duration-200 hover-scale"
                                  >
                                    {match.markets.bothTeamsToScore.no.toFixed(2)}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Bet Slip Sidebar */}
          <div className="w-80 flex-shrink-0">
            <BetSlip
              selections={betSelections}
              onRemoveSelection={removeBetSelection}
              onUpdateStake={updateBetStake}
              onClearAll={clearAllBets}
              userBudget={userBudget}
              onBudgetUpdate={setUserBudget}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bets;