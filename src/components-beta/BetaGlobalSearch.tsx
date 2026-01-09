import { useState, useEffect, useRef } from "react";
import { Search, Trophy, Users, User, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BetaBadge } from "./ui-beta";

interface SearchResult {
  id: string;
  type: 'tournament' | 'team' | 'user';
  name: string;
  subtitle?: string;
}

export const BetaGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query.toLowerCase()}%`;

        // Parallel search queries
        const [tournamentsRes, teamsRes, usersRes] = await Promise.all([
          supabase
            .from('tournaments')
            .select('id, name, status')
            .ilike('name', searchTerm)
            .limit(5),
          supabase
            .from('persistent_teams')
            .select('id, name')
            .ilike('name', searchTerm)
            .eq('is_active', true)
            .limit(5),
          supabase
            .from('users')
            .select('id, discord_username, current_rank')
            .ilike('discord_username', searchTerm)
            .limit(5)
        ]);

        const combined: SearchResult[] = [
          ...(tournamentsRes.data || []).map(t => ({
            id: t.id,
            type: 'tournament' as const,
            name: t.name,
            subtitle: t.status
          })),
          ...(teamsRes.data || []).map(t => ({
            id: t.id,
            type: 'team' as const,
            name: t.name
          })),
          ...(usersRes.data || []).map(u => ({
            id: u.id,
            type: 'user' as const,
            name: u.discord_username,
            subtitle: u.current_rank
          }))
        ];

        setResults(combined);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'tournament': return <Trophy className="w-4 h-4 text-[hsl(var(--beta-accent))]" />;
      case 'team': return <Users className="w-4 h-4 text-[hsl(var(--beta-secondary))]" />;
      case 'user': return <User className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />;
      default: return null;
    }
  };

  const getLink = (result: SearchResult) => {
    switch (result.type) {
      case 'tournament': return `/beta/tournament/${result.id}`;
      case 'team': return `/beta/team/${result.id}`;
      case 'user': return `/beta/profile/${result.id}`;
      default: return '#';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger / input */}
      <div className="flex items-center">
        {isOpen ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
            <Search className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, teams, tournaments..."
              className="w-48 lg:w-64 bg-transparent text-sm text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none"
              autoFocus
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--beta-text-muted))]" />}
            <button onClick={() => { setIsOpen(false); setQuery(""); }}>
              <X className="w-4 h-4 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="p-2 rounded-[var(--beta-radius-md)] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-border))] rounded-[var(--beta-radius-lg)] shadow-xl overflow-hidden z-50 min-w-[300px]">
          {results.length === 0 && !loading ? (
            <div className="p-4 text-center text-sm text-[hsl(var(--beta-text-muted))]">
              No results found for "{query}"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={getLink(result)}
                  onClick={() => { setIsOpen(false); setQuery(""); }}
                  className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
                >
                  <div className="flex-shrink-0">{getIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))] truncate">{result.name}</p>
                    {result.subtitle && (
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <BetaBadge variant="default" size="sm" className="capitalize">{result.type}</BetaBadge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
