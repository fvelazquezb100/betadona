import Header from "@/components/Header";
import Navigation from "@/components/Navigation";

const Bets = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-soccer-field mb-4">Bets</h1>
          <p className="text-muted-foreground">Betting functionality coming soon...</p>
        </div>
      </main>
    </div>
  );
};

export default Bets;