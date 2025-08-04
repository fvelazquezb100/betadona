import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

const Bets = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('fetch-odds');
        
        if (error) {
          console.error('Error fetching odds:', error);
          toast({
            title: "Error",
            description: "Failed to fetch live betting data. Please try again later.",
            variant: "destructive",
          });
          return;
        }

        if (data?.matches) {
          setMatches(data.matches);
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

    fetchMatches();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
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
                <Tabs defaultValue="main" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="main">Main</TabsTrigger>
                    <TabsTrigger value="goals">Goals</TabsTrigger>
                    <TabsTrigger value="player-props">Player Props</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="main">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                          {match.homeTeam} to Win
                        </p>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-lg font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                        >
                          {match.odds.homeWin}
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                          Draw
                        </p>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-lg font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                        >
                          {match.odds.draw}
                        </Button>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                          {match.awayTeam} to Win
                        </p>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-lg font-bold hover:bg-soccer-field hover:text-white hover:border-soccer-field transition-colors"
                        >
                          {match.odds.awayWin}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="goals">
                    <div className="text-center text-muted-foreground py-8">
                      Goals betting markets coming soon...
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="player-props">
                    <div className="text-center text-muted-foreground py-8">
                      Player props betting markets coming soon...
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Bets;