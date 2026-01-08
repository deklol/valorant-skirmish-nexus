import { Outlet } from "react-router-dom";
import { BetaSidebar } from "./BetaSidebar";
import { BetaHeader } from "./BetaHeader";
import { BetaFooter } from "./BetaFooter";
import { BetaIndicator } from "./BetaIndicator";
import "@/styles/beta-tokens.css";

const BetaLayout = () => {
  return (
    <div className="min-h-screen w-full bg-[hsl(var(--beta-surface-1))]">
      {/* Ambient glow effect */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--beta-gradient-glow)' }}
      />
      
      <div className="flex min-h-screen w-full">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-60 shrink-0">
          <BetaSidebar />
        </aside>

        {/* Main content area - full width */}
        <div className="flex-1 flex flex-col min-h-screen w-full">
          <BetaHeader />
          
          <main className="flex-1 w-full">
            <Outlet />
          </main>

          <BetaFooter />
        </div>
      </div>

      {/* Beta indicator badge */}
      <BetaIndicator />
    </div>
  );
};

export { BetaLayout };
