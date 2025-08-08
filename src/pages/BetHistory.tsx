import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Bet {
  id: number;
  match_description: string | null;
  bet_selection: string | null;
  stake: number | null;
  odds: number | null;
  status: string | null;
  created_at: string;
}

const BetHistory = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user's bets
        const { data: userBets, error } = await supabase
          .from('bets')
          .select('id, match_description, bet_selection, stake, odds, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bets:', error);
          return;
        }

        setBets(userBets || []);
      } catch (error) {
        console.error('Error fetching bets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, []);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "won":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            Ganada
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            Perdida
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Pendiente
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-soccer-field mb-8">Mi Historial de Apuestas</h1>
        
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Partido</TableHead>
                <TableHead className="font-semibold">Apuesta</TableHead>
                <TableHead className="font-semibold">Importe</TableHead>
                <TableHead className="font-semibold">Cuota</TableHead>
                <TableHead className="font-semibold">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index} className="border-b border-border">
                    <TableCell className="py-4 px-6">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : bets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No se encontraron apuestas. ¡Comienza realizando tu primera apuesta!
                  </TableCell>
                </TableRow>
              ) : (
                bets.map((bet) => (
                  <TableRow key={bet.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      {bet.match_description || "Partido Desconocido"}
                    </TableCell>
                    <TableCell>{bet.bet_selection || "Apuesta Desconocida"}</TableCell>
                    <TableCell className="font-semibold">
                      €{bet.stake ? Number(bet.stake).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {bet.odds ? Number(bet.odds).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(bet.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default BetHistory;