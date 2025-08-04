const Header = () => {
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
              <p className="font-semibold">John Doe</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-soccer-field-light">Weekly Budget</p>
              <p className="font-semibold text-soccer-gold">€1000</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-soccer-field-light">League</p>
              <p className="font-semibold">The Winners League</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;