import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const navItems = [
    { name: "Clasificación", path: "/home" },
    { name: "Apuestas", path: "/bets" },
    { name: "Historial", path: "/bet-history" },
  ];

  return (
    <nav className="bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "py-4 px-2 text-sm font-medium border-b-2 transition-colors hover:text-soccer-field",
                  isActive
                    ? "border-soccer-field text-soccer-field"
                    : "border-transparent text-muted-foreground"
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;