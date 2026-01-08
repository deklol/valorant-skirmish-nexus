import { Link } from "react-router-dom";

const BetaFooter = () => {
  return (
    <footer className="border-t border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-2))]">
      <div className="w-full px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            © {new Date().getFullYear()} TLR Skirmish Hub
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/beta/help"
              className="text-sm text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
            >
              Help
            </Link>
            <Link 
              to="/"
              className="text-sm text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-accent))] transition-colors"
            >
              Production Site
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { BetaFooter };
