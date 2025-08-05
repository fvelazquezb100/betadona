import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BetSelection {
  id: string;
  matchDescription: string;
  selection: string;
  odds: number;
  stake: number;
}

interface BetSlipProps {
  selections: BetSelection[];
  onRemoveSelection: (id: string) => void;
  onUpdateStake: (id: string, stake: number) => void;
  onClearAll: () => void;
  userBudget: number;
  onBudgetUpdate: (newBudget: number) => void;
}

const BetSlip = ({ 
  selections, 
  onRemoveSelection, 
  onUpdateStake, 
  onClearAll,
  userBudget,
  onBudgetUpdate 
}: BetSlipProps) => {
  const [isPlacing, setIsPlacing] = useState(false);
  const { toast } = useToast();

  const totalStake = selections.reduce((sum, bet) => sum + bet.stake, 0);
  const totalPotentialWinnings = selections.reduce((sum, bet) => sum + (bet.stake * bet.odds), 0);

  const handlePlaceBets = async () => {
    if (selections.length === 0) return;

    // Validation
    if (totalStake > userBudget) {
      toast({
        title: "Insufficient Budget",
        description: `You need €${totalStake} but only have €${userBudget} available.`,
        variant: "destructive",
      });
      return;
    }

    if (selections.some(bet => bet.stake <= 0)) {
      toast({
        title: "Invalid Stakes",
        description: "Please enter a valid stake for all bets.",
        variant: "destructive",
      });
      return;
    }

    setIsPlacing(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please log in to place bets');
      }

      // Check current bet count for validation (assuming we want to limit to 5 bets per week)
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: existingBets, error: countError } = await supabase
        .from('bets')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      if (countError) throw countError;

      if (existingBets && existingBets.length + selections.length > 5) {
        toast({
          title: "Bet Limit Reached",
          description: "You can only place 5 bets per week.",
          variant: "destructive",
        });
        return;
      }

      // Insert all bets
      const betsToInsert = selections.map(bet => ({
        user_id: user.id,
        match_description: bet.matchDescription,
        bet_selection: bet.selection,
        stake: bet.stake,
        odds: bet.odds,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('bets')
        .insert(betsToInsert);

      if (insertError) throw insertError;

      // Update user budget
      const newBudget = userBudget - totalStake;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ weekly_budget: newBudget })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Success
      onBudgetUpdate(newBudget);
      onClearAll();
      
      toast({
        title: "Bets Placed Successfully!",
        description: `${selections.length} bet(s) placed for €${totalStake.toFixed(2)}`,
      });

    } catch (error: any) {
      console.error('Error placing bets:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to place bets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <Card className="w-80 h-fit bg-card border shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bet Slip</CardTitle>
          {selections.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {selections.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Click on odds to add bets to your slip
          </p>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selections.map((bet) => (
                <div key={bet.id} className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{bet.matchDescription}</p>
                      <p className="text-xs text-muted-foreground">{bet.selection}</p>
                      <p className="text-xs font-semibold text-soccer-field">
                        Odds: {bet.odds.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSelection(bet.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-muted-foreground">Stake (€):</label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={bet.stake || ''}
                        onChange={(e) => onUpdateStake(bet.id, Number(e.target.value))}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    {bet.stake > 0 && (
                      <p className="text-xs text-green-600">
                        Potential Win: €{(bet.stake * bet.odds).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Stake:</span>
                <span className="font-semibold">€{totalStake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Potential Winnings:</span>
                <span className="font-semibold text-green-600">
                  €{totalPotentialWinnings.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available Budget:</span>
                <span>€{userBudget.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={handlePlaceBets}
              disabled={isPlacing || totalStake === 0 || totalStake > userBudget}
              className="w-full bg-soccer-field hover:bg-soccer-field/90"
            >
              {isPlacing ? "Placing Bets..." : "Place Bets"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BetSlip;