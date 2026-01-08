import { Link } from "react-router-dom";
import { Trophy, MessageSquare } from "lucide-react";

const BetaFooter = () => {
  return (
    <footer className="border-t border-[hsl(var(--beta-glass-border))] bg-[hsl(var(--beta-surface-1))]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and copyright */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-accent))] flex items-center justify-center">
              <Trophy className="h-4 w-4 text-[hsl(var(--beta-surface-1))]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[hsl(var(--beta-text-primary))]">
                TLR Skirmish Hub
              </span>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                © {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              to="/beta/help"
              className="text-sm text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] transition-colors"
            >
              Help
            </Link>
            <a
              href="https://discord.gg/thelastrefuge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-accent))] transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { BetaFooter };
