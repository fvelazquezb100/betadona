import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import BetSlip from '@/components/BetSlip';

// --- Corrected Type Definitions for API-Football Fixture Data ---
interface Team {
  id: number;
  name: string;
  logo: string;
}

// This represents a single item in the API's 'response' array
interface FixtureResponseItem {
  fixture: {
    id: number;
    date: string;
  };
  teams: {
    home: Team;
    away: Team;
  };
}

// This represents the top-level structure of the cached data
interface CachedFixturesData {
  response?: FixtureResponseItem[];
}

const Bets = () => {
  // State should hold the full response item, not just the fixture part
  const [fixtures, setFixtures] = useState<FixtureResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBets, setSelectedBets] = useState<any[]>([]);

  useEffect(() => {
    const fetchFixtures = async () => {
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

        const apiData = cacheData.data as unknown as CachedFixturesData;
        
        // Check for the response array and set it directly
        if (apiData && Array.isArray(apiData.response)) {
          setFixtures(apiData.response);
        } else {
          setFixtures([]);
        }

      } catch (err: any) {
        setError('Failed to fetch or parse fixture data. Please try again later.');
        console.error("Error details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Spanish LaLiga - Upcoming Matches</h1>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-grow space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg bg-white shadow-sm">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
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
      <h1 className="text-3xl font-bold mb-4">Spanish LaLiga - Upcoming Matches</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          {fixtures.length > 0 ? (
            <div className="space-y-4">
              {fixtures.map((item) => {
                // Add a guard clause to prevent rendering items with incomplete data
                if (!item.fixture || !item.teams?.home || !item.teams?.away) {
                  return null;
                }
                return (
                  <div key={item.fixture.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    {/* Correctly access team names and fixture date */}
                    <p className="font-bold text-lg">{item.teams.home.name} vs {item.teams.away.name}</p>
                    <p className="text-sm text-gray-500">{new Date(item.fixture.date).toLocaleString()}</p>
                    <p className="text-sm text-gray-400 mt-2">Odds will be available soon.</p>
                  </div>
                );
              })}
            </div>
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
