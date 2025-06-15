
import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Search } from "lucide-react";

type Tournament = {
  id: string;
  name: string;
  status?: string; // Optional for future extension
};

interface BracketMedicTournamentListProps {
  tournaments: Tournament[];
  loading?: boolean;
  onSelect: (id: string) => void;
}

export default function BracketMedicTournamentList({
  tournaments,
  loading,
  onSelect,
}: BracketMedicTournamentListProps) {
  const [search, setSearch] = useState("");
  // Add filter/sorting logic as needed
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tournaments;
    return tournaments.filter((t) =>
      t.name.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term)
    );
  }, [tournaments, search]);

  return (
    <div>
      {/* Search and (future) filters */}
      <div className="flex gap-2 mb-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="pl-8 pr-3 py-2 rounded bg-slate-900 border border-slate-700 text-white w-full"
            placeholder="Search by name or ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
        {/* Example sort/filter buttons could go here if needed */}
      </div>
      {/* Tournament list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-slate-400 text-center py-8">No tournaments found.</div>
        ) : (
          filtered.map(t => (
            <Card key={t.id} className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-cyan-300" />
                    <span className="font-medium text-white">{t.name}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    ID: <span className="font-mono text-slate-500">{t.id.slice(0, 8)}...</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="text-cyan-400 border-cyan-600"
                  size="sm"
                  onClick={() => onSelect(t.id)}
                  disabled={loading}
                >
                  Bracket Repair
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
