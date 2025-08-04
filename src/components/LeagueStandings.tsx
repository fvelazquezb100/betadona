import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StandingRow {
  rank: number;
  player: string;
  totalPoints: number;
  lastMatchday: number;
  isCurrentUser?: boolean;
  userId: string;
}

const LeagueStandings = () => {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        if (!user) return;

        // First, get current user's league_id
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('league_id')
          .eq('id', user.id)
          .single();

        if (!currentUserProfile?.league_id) {
          setStandings([]);
          return;
        }

        // Use RPC to get league standings
        const { data: profiles, error } = await supabase
          .rpc('get_league_standings', { league_id_param: currentUserProfile.league_id });

        if (error) {
          console.error('Error fetching standings:', error);
          return;
        }

        // Transform data to standings format with ranks
        const standingsData: StandingRow[] = profiles?.map((profile, index) => ({
          rank: index + 1,
          player: profile.username,
          totalPoints: Number(profile.total_points) || 0,
          lastMatchday: 0, // Placeholder as requested
          isCurrentUser: profile.id === user?.id,
          userId: profile.id
        })) || [];

        setStandings(standingsData);
      } catch (error) {
        console.error('Error fetching standings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

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
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="py-4 px-6">
                      <Skeleton className="w-8 h-8 rounded-full" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : standings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No players found in the league
                  </td>
                </tr>
              ) : (
                standings.map((standing) => (
                  <tr
                    key={standing.userId}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeagueStandings;