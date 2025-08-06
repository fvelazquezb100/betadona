import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // Assuming you have a custom auth hook

// Define the shape of a single bet selection
interface BetSelection {
  id: string;
  matchDescription: string;
  market: string;
  selection: string;
  odds: number;
}

// Define the props the BetSlip component will receive
interface BetSlipProps {
  selectedBets: BetSelection[];
  setSelectedBets: React.Dispatch<React.SetStateAction<BetSelection[]>>;
}

const BetSlip: React.FC<BetSlipProps> = ({ selectedBets, setSelectedBets }) => {
  const [stakes, setStakes] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Get the current user

  const handleStakeChange = (id: string, value: string) => {
    setStakes(prev => ({ ...prev, [id]: value }));
  };

  const handleRemoveBet = (id: string) => {
    setSelectedBets(prev => prev.filter(bet => bet.id !== id));
  };

  const handlePlaceBets = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to place bets.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const betsToPlace = selectedBets.map(bet => ({
      ...bet,
      stake: parseFloat(stakes[bet.id] || '0'),
    })).filter(bet => bet.stake > 0);

    if (betsToPlace.length === 0) {
      toast({ title: "No bets to place", description: "Please enter a stake for at least one bet.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const totalStake = betsToPlace.reduce((acc, bet) => acc + bet.stake, 0);

    try {
      // Fetch user's current budget in a transaction
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('weekly_budget')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not fetch user profile.");
      if (profile.weekly_budget < totalStake) throw new Error("Insufficient budget.");

      // Prepare bets for insertion
      const newBetRows = betsToPlace.map(bet => ({
        user_id: user.id,
        match_description: bet.matchDescription,
        bet_selection: `${bet.market}: ${bet.selection}`,
        stake: bet.stake,
        odds: bet.odds,
        status: 'pending',
        matchday: 1, // Placeholder for matchday
      }));

      // Insert bets and update budget in a single transaction
      const { error: insertError } = await supabase.rpc('place_bets_and_update_budget' as any, {
        bets_to_insert: newBetRows,
        new_budget: profile.weekly_budget - totalStake,
        user_id_to_update: user.id,
      });

      if (insertError) throw insertError;

      toast({ title: "Success!", description: "Your bets have been placed." });
      setSelectedBets([]);
      setStakes({});

    } catch (error: any) {
      toast({ title: "Error placing bets", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStake = Object.values(stakes).reduce((acc, stake) => acc + (parseFloat(stake) || 0), 0);
  const totalWinnings = selectedBets.reduce((acc, bet) => {
    const stake = parseFloat(stakes[bet.id] || '0');
    return acc + (stake * bet.odds);
  }, 0);

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Bet Slip</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedBets.length === 0 ? (
          <p className="text-sm text-gray-500">Click on odds to add bets to your slip.</p>
        ) : (
          <div className="space-y-4">
            {selectedBets.map(bet => (
              <div key={bet.id} className="p-2 border rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{bet.selection}</p>
                    <p className="text-xs text-gray-500">{bet.matchDescription}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveBet(bet.id)}>X</Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    placeholder="Stake"
                    className="w-24 h-8"
                    value={stakes[bet.id] || ''}
                    onChange={(e) => handleStakeChange(bet.id, e.target.value)}
                  />
                  <p className="text-sm">@ {bet.odds.toFixed(2)}</p>
                </div>
              </div>
            ))}
            <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between font-semibold">
                    <span>Total Stake:</span>
                    <span>€{totalStake.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span>Potential Winnings:</span>
                    <span>€{totalWinnings.toFixed(2)}</span>
                </div>
            </div>
            <Button className="w-full" onClick={handlePlaceBets} disabled={isSubmitting || totalStake === 0}>
              {isSubmitting ? 'Placing Bets...' : 'Place Bets'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BetSlip;
