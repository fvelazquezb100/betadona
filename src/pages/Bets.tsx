import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const Bets = () => {
  const matches = [
    {
      id: 1,
      homeTeam: "Real Madrid",
      awayTeam: "FC Barcelona",
      startTime: "Sat, 21:00",
      odds: {
        homeWin: 2.10,
        draw: 3.50,
        awayWin: 3.20
      }
    },
    {
      id: 2,
      homeTeam: "Atlético de Madrid",
      awayTeam: "Sevilla FC",
      startTime: "Sun, 18:30",
      odds: {
        homeWin: 1.90,
        draw: 3.80,
        awayWin: 4.00
      }
    },
    {
      id: 3,
      homeTeam: "Valencia CF",
      awayTeam: "Real Betis",
      startTime: "Sun, 21:00",
      odds: {
        homeWin: 2.50,
        draw: 3.30,
        awayWin: 2.80
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-soccer-field mb-8">Upcoming Matchday</h1>
        
        <div className="space-y-6">
          {matches.map((match) => (
            <Card key={match.id} className="bg-card border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-center">
                  {match.homeTeam} vs {match.awayTeam}
                </CardTitle>
                <p className="text-center text-muted-foreground font-medium">
                  {match.startTime}
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
      </main>
    </div>
  );
};

export default Bets;