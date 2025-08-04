import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StandingRow {
  rank: number;
  player: string;
  totalPoints: number;
  lastMatchday: number;
  isCurrentUser?: boolean;
}

const LeagueStandings = () => {
  const standings: StandingRow[] = [
    { rank: 1, player: "User A", totalPoints: 15000, lastMatchday: 500 },
    { rank: 2, player: "User B", totalPoints: 14200, lastMatchday: -100 },
    { rank: 3, player: "User C", totalPoints: 12800, lastMatchday: 1200 },
    { rank: 4, player: "You (John Doe)", totalPoints: 11000, lastMatchday: 250, isCurrentUser: true },
    { rank: 5, player: "User D", totalPoints: 9500, lastMatchday: -300 },
  ];

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const formatLastMatchday = (points: number) => {
    return points > 0 ? `+${points}` : points.toString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-soccer-field">
          League Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 font-semibold text-foreground">Rank</th>
                <th className="text-left py-4 px-6 font-semibold text-foreground">Player</th>
                <th className="text-right py-4 px-6 font-semibold text-foreground">Total Points</th>
                <th className="text-right py-4 px-6 font-semibold text-foreground">Last Matchday</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr
                  key={standing.rank}
                  className={cn(
                    "border-b border-border transition-all duration-200 hover:bg-muted/50 cursor-pointer",
                    standing.isCurrentUser && "bg-soccer-field-light border-soccer-field"
                  )}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          standing.rank === 1 && "bg-soccer-gold text-white",
                          standing.rank === 2 && "bg-gray-400 text-white",
                          standing.rank === 3 && "bg-amber-600 text-white",
                          standing.rank > 3 && "bg-muted text-muted-foreground"
                        )}
                      >
                        {standing.rank}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "font-medium",
                      standing.isCurrentUser && "text-soccer-field font-semibold"
                    )}>
                      {standing.player}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="font-medium">
                      €{formatPoints(standing.totalPoints)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        standing.lastMatchday > 0 && "text-green-600",
                        standing.lastMatchday < 0 && "text-red-600",
                        standing.lastMatchday === 0 && "text-muted-foreground"
                      )}
                    >
                      €{formatLastMatchday(standing.lastMatchday)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeagueStandings;