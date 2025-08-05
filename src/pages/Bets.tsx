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

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  odds: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  totals: {
    over05: number;
    under05: number;
    over15: number;
    under15: number;
    over25: number;
    under25: number;
    over35: number;
    under35: number;
  };
  doubleChance: {
    homeOrDraw: number;
    awayOrDraw: number;
    homeOrAway: number;
  };
  bothTeamsToScore: {
    yes: number;
    no: number;
  };
  spreads: Array<{
    point: number;
    homeOdds: number;
    awayOdds: number;
  }>;
}

const Bets = () => {
  const [matches, setMatches] = useState<Match[]>([]);
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

  const addToBetSlip = (match: Match, selection: string, odds: number) => {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch matches
        const { data: oddsData, error: oddsError } = await supabase.functions.invoke('fetch-odds');
        
        if (oddsError) {
          console.error('Error fetching odds:', oddsError);
          toast({
            title: "Error",
            description: "Failed to fetch live betting data. Please try again later.",
            variant: "destructive",
          });
          return;
        }

        if (oddsData?.matches) {
          setMatches(oddsData.matches);
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
                      {/* Result Section */}
                      <AccordionItem value="result">
                        <AccordionTrigger className="text-lg font-semibold">
                          Result
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6">
                          {/* Standard 1X2 */}
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Match Winner</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {match.homeTeam}
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, `${match.homeTeam} to Win`, match.odds.homeWin)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.odds.homeWin.toFixed(2)}
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Draw
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, 'Draw', match.odds.draw)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.odds.draw.toFixed(2)}
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {match.awayTeam}
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, `${match.awayTeam} to Win`, match.odds.awayWin)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.odds.awayWin.toFixed(2)}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Double Chance */}
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Double Chance</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {match.homeTeam} or Draw
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, `${match.homeTeam} or Draw`, match.doubleChance.homeOrDraw)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.doubleChance.homeOrDraw.toFixed(2)}
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {match.awayTeam} or Draw
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, `${match.awayTeam} or Draw`, match.doubleChance.awayOrDraw)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.doubleChance.awayOrDraw.toFixed(2)}
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {match.homeTeam} or {match.awayTeam}
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, `${match.homeTeam} or ${match.awayTeam}`, match.doubleChance.homeOrAway)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.doubleChance.homeOrAway.toFixed(2)}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Goals Section */}
                      <AccordionItem value="goals">
                        <AccordionTrigger className="text-lg font-semibold">
                          Goals
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6">
                          {/* Both Teams to Score */}
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Both Teams to Score</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">Yes</p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, 'Both Teams to Score - Yes', match.bothTeamsToScore.yes)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.bothTeamsToScore.yes.toFixed(2)}
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">No</p>
                                <Button
                                  variant="outline"
                                  onClick={() => addToBetSlip(match, 'Both Teams to Score - No', match.bothTeamsToScore.no)}
                                  className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                >
                                  {match.bothTeamsToScore.no.toFixed(2)}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Total Goals */}
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Total Goals</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Over 0.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Over 0.5 Goals', match.totals.over05)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.over05.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Over 1.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Over 1.5 Goals', match.totals.over15)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.over15.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Over 2.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Over 2.5 Goals', match.totals.over25)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.over25.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Over 3.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Over 3.5 Goals', match.totals.over35)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.over35.toFixed(2)}
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Under 0.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Under 0.5 Goals', match.totals.under05)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.under05.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Under 1.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Under 1.5 Goals', match.totals.under15)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.under15.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Under 2.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Under 2.5 Goals', match.totals.under25)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.under25.toFixed(2)}
                                  </Button>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Under 3.5</p>
                                  <Button
                                    variant="outline"
                                    onClick={() => addToBetSlip(match, 'Under 3.5 Goals', match.totals.under35)}
                                    className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                  >
                                    {match.totals.under35.toFixed(2)}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Handicap Section */}
                      <AccordionItem value="handicap">
                        <AccordionTrigger className="text-lg font-semibold">
                          Handicap
                        </AccordionTrigger>
                        <AccordionContent>
                          {match.spreads.length > 0 ? (
                            <div className="space-y-3">
                              {match.spreads.map((spread, index) => (
                                <div key={index} className="grid grid-cols-2 gap-3">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {match.homeTeam} ({spread.point > 0 ? '+' : ''}{spread.point})
                                    </p>
                                    <Button
                                      variant="outline"
                                      onClick={() => addToBetSlip(match, `${match.homeTeam} (${spread.point > 0 ? '+' : ''}${spread.point})`, spread.homeOdds)}
                                      className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                    >
                                      {spread.homeOdds.toFixed(2)}
                                    </Button>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {match.awayTeam} ({-spread.point > 0 ? '+' : ''}{-spread.point})
                                    </p>
                                    <Button
                                      variant="outline"
                                      onClick={() => addToBetSlip(match, `${match.awayTeam} (${-spread.point > 0 ? '+' : ''}${-spread.point})`, spread.awayOdds)}
                                      className="w-full h-10 text-sm font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                                    >
                                      {spread.awayOdds.toFixed(2)}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              No handicap markets available for this match.
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
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