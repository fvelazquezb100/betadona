import Header from "@/components/Header";
import Navigation from "@/components/Navigation";

const BetHistory = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-soccer-field mb-4">Bet History</h1>
          <p className="text-muted-foreground">Bet history functionality coming soon...</p>
        </div>
      </main>
    </div>
  );
};

export default BetHistory;