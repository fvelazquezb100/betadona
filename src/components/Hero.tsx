import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import soccerHero from "@/assets/soccer-hero.jpg";

const Hero = () => {
  const navigate = useNavigate();

  const handleSignUpClick = () => {
    navigate("/signup");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-soccer-field-light overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${soccerHero})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-soccer-field/20 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Brand Name */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-soccer-field mb-2 tracking-tight">
            Betadona
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-soccer-field to-soccer-accent mx-auto rounded-full" />
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          Liga de Apuestas Simuladas
        </h2>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          Apostar nunca fue de ganar dinero, sino de demostrarle a los demás que sabes más de fútbol que ellos.
        </p>

        {/* CTA Button */}
        <Button 
          variant="hero" 
          size="xl" 
          className="mb-8"
          onClick={handleSignUpClick}
        >
          Regístrate Para Jugar
        </Button>

        {/* Additional info */}
        <p className="text-sm text-muted-foreground">
          Únete a la única comunidad de apuestas fantasy.
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-soccer-accent/10 rounded-full blur-xl" />
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-soccer-field/10 rounded-full blur-xl" />
      <div className="absolute top-1/3 right-10 w-16 h-16 bg-soccer-gold/20 rounded-full blur-lg" />
    </div>
  );
};

export default Hero;