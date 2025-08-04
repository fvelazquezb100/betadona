import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import LeagueStandings from "@/components/LeagueStandings";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-soccer-field-light/30">
      <Header />
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <LeagueStandings />
      </main>
    </div>
  );
};

export default Home;