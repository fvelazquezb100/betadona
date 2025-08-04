import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  username: string;
  weekly_budget: number;
  league_id: string;
}

interface League {
  name: string;
}

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [league, setLeague] = useState<League | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, weekly_budget, league_id')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profileData);
          
          // Fetch league information if league_id exists
          if (profileData?.league_id) {
            const { data: leagueData } = await supabase
              .from('leagues')
              .select('name')
              .eq('id', profileData.league_id)
              .single();
            
            setLeague(leagueData);
          }
        } else {
          setProfile(null);
          setLeague(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, weekly_budget, league_id')
          .eq('id', session.user.id)
          .single();
        
        setProfile(profileData);
        
        // Fetch league information if league_id exists
        if (profileData?.league_id) {
          const { data: leagueData } = await supabase
            .from('leagues')
            .select('name')
            .eq('id', profileData.league_id)
            .single();
          
          setLeague(leagueData);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-soccer-field text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* App Name */}
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">LaLiga Fantasy Bets</h1>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <p className="text-sm text-soccer-field-light">User</p>
              <p className="font-semibold">{profile?.username || "Loading..."}</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-soccer-field-light">Weekly Budget</p>
              <p className="font-semibold text-soccer-gold">
                €{profile?.weekly_budget || 0}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-soccer-field-light">League</p>
              <p className="font-semibold">{league?.name || "No League"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;