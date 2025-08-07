import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import BetSlip from '@/components/BetSlip';

// --- Type Definitions for API-Football Fixture Data ---
interface Team {
  id: number;
  name: string;
  logo: string;
}

interface FixtureData {
  id: number;
  date: string;
  teams: {
    home: Team;
    away: Team;
  };
}

interface CachedFixturesData {
  response?: { fixture: FixtureData }[];
}

const Bets = () => {
  const [fixtures, setFixtures] = useState<FixtureData[]>([]);
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
        
        if (apiData && Array.isArray(apiData.response)) {
          // Extract the fixture object from each item in the response
          const fixtureList = apiData.response.map(item => item.fixture);
          setFixtures(fixtureList);
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
              {fixtures.map((fixture) => (
                <div key={fixture.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <p className="font-bold text-lg">{fixture.teams.home.name} vs {fixture.teams.away.name}</p>
                  <p className="text-sm text-gray-500">{new Date(fixture.date).toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-2">Odds will be available soon.</p>
                </div>
              ))}
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
