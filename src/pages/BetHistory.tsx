import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const BetHistory = () => {
  const betHistory = [
    {
      id: 1,
      match: "Real Madrid vs FC Barcelona",
      bet: "Real Madrid to Win",
      stake: "€100",
      odds: "2.10",
      result: { type: "won", amount: "+€110" }
    },
    {
      id: 2,
      match: "Atlético de Madrid vs Sevilla FC",
      bet: "Draw",
      stake: "€50",
      odds: "3.80",
      result: { type: "lost", amount: "-€50" }
    },
    {
      id: 3,
      match: "Valencia CF vs Real Betis",
      bet: "Over 2.5 Goals",
      stake: "€75",
      odds: "1.95",
      result: { type: "pending", amount: "Pending" }
    },
    {
      id: 4,
      match: "Villarreal CF vs Real Sociedad",
      bet: "Both Teams to Score",
      stake: "€200",
      odds: "1.80",
      result: { type: "won", amount: "+€160" }
    }
  ];

  const getResultBadge = (result: { type: string; amount: string }) => {
    switch (result.type) {
      case "won":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            Won {result.amount}
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            Lost {result.amount}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            {result.amount}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-soccer-field mb-8">My Bet History</h1>
        
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Match</TableHead>
                <TableHead className="font-semibold">Bet</TableHead>
                <TableHead className="font-semibold">Stake</TableHead>
                <TableHead className="font-semibold">Odds</TableHead>
                <TableHead className="font-semibold">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {betHistory.map((bet) => (
                <TableRow key={bet.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{bet.match}</TableCell>
                  <TableCell>{bet.bet}</TableCell>
                  <TableCell className="font-semibold">{bet.stake}</TableCell>
                  <TableCell className="font-semibold">{bet.odds}</TableCell>
                  <TableCell>
                    {getResultBadge(bet.result)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default BetHistory;