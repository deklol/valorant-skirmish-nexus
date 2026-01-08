import { Outlet } from "react-router-dom";
import { BetaSidebar } from "./BetaSidebar";
import { BetaHeader } from "./BetaHeader";
import { BetaFooter } from "./BetaFooter";
import { BetaIndicator } from "./BetaIndicator";
import "@/styles/beta-tokens.css";

const BetaLayout = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--beta-surface-1))]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <BetaSidebar />
      </div>

      {/* Main content area */}
      <div className="md:pl-56 flex flex-col min-h-screen">
        <BetaHeader />
        
        <main className="flex-1">
          <Outlet />
        </main>

        <BetaFooter />
      </div>

      {/* Beta indicator badge */}
      <BetaIndicator />
    </div>
  );
};

export { BetaLayout };
