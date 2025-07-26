import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wrench, RefreshCw, Edit, ShieldAlert, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicEditModal from "./TournamentMedicEditModal";
import { Tournament } from "@/types/tournament";

// Remove local Tournament type, use the imported one

const TOURNAMENT_STATUS: { key: string; label: string; color: string }[] = [
  { key: "all", label: "All", color: "bg-slate-600" },
  { key: "draft", label: "Draft", color: "bg-gray-500/40" },
  { key: "open", label: "Open", color: "bg-green-500/30" },
  { key: "balancing", label: "Balancing", color: "bg-yellow-500/30" },
  { key: "live", label: "Live", color: "bg-red-500/30" },
  { key: "completed", label: "Completed", color: "bg-blue-500/30" },
  { key: "archived", label: "Archived", color: "bg-slate-500/30" },
];

export default function TournamentMedicManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editModal, setEditModal] = useState<Tournament | null>(null);
  const { toast } = useToast();

  // Fetch tournaments (ensure we select ALL Tournament fields)
  useEffect(() => {
    async function fetchTournaments() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          id,
          name,
          description,
          status,
          match_format,
          bracket_type,
          team_size,
          max_teams,
          max_players,
          prize_pool,
          start_time,
          created_at,
          registration_opens_at,
          registration_closes_at,
          check_in_starts_at,
          check_in_ends_at
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        toast({ title: "Error", description: "Failed to fetch tournaments", variant: "destructive" });
        setTournaments([]);
      } else {
        // Force all objects to fulfill Tournament type (fill possible nulls)
        setTournaments(
          (data ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description ?? null,
            start_time: t.start_time ?? null,
            registration_opens_at: t.registration_opens_at ?? null,
            registration_closes_at: t.registration_closes_at ?? null,
            check_in_starts_at: t.check_in_starts_at ?? null,
            check_in_ends_at: t.check_in_ends_at ?? null,
            max_teams: t.max_teams ?? 0,
            max_players: t.max_players ?? 0,
            team_size: t.team_size ?? 5, // FIX: Ensure team_size is always defined
            prize_pool: t.prize_pool ?? null,
            status: t.status,
            match_format: t.match_format ?? "BO1",
            bracket_type: t.bracket_type ?? "single_elimination",
          })) as Tournament[]
        );
      }
      setLoading(false);
    }
    fetchTournaments();
    // eslint-disable-next-line
  }, [refreshKey]);

  const filteredTournaments = tournaments.filter(t => {
    const statusMatch = filterStatus === "all" || t.status === filterStatus;
    const searchMatch =
      !search ||
      (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const getStatusBadge = (status: string) => {
    const variant = TOURNAMENT_STATUS.find(s => s.key === status);
    return (
      <Badge className={variant?.color || "bg-slate-700/50"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wrench className="w-5 h-5 text-yellow-500" />
            Tournament Medic{" "}
            <span className="text-xs text-yellow-400">(Emergency Tools)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search, filter, refresh controls */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <Input
              type="text"
              placeholder="Search by name or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-52"
            />
            <div className="flex gap-1">
              {TOURNAMENT_STATUS.map(s =>
                <Button
                  key={s.key}
                  variant={filterStatus === s.key ? "default" : "outline"}
                  className={`${filterStatus === s.key ? s.color + " text-white" : ""} px-2 py-1 text-xs`}
                  size="sm"
                  onClick={() => setFilterStatus(s.key)}
                >
                  {s.label}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
              className="ml-auto"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading tournaments...</div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No tournaments found.</div>
          ) : (
            <div className="space-y-3">
              {filteredTournaments.map(t => (
                <div
                  key={t.id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                >
                  <div className="flex flex-col flex-1 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(t.status)}
                      <span className="text-xs font-bold px-2 rounded bg-yellow-800/30 text-yellow-200">{t.name}</span>
                      <span className="text-xs text-slate-400 font-mono">ID: {t.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex flex-col text-xs gap-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Trophy className="inline-block w-4 h-4" />Prize: <span className="text-white">{t.prize_pool || "—"}</span>
                      </span>
                      <span className="text-slate-400">Teams: <span className="text-white">{t.max_teams ?? "?"}</span> • Players: <span className="text-white">{t.max_players ?? "—"}</span></span>
                      <span className="text-slate-500">Format: <span className="text-white">{t.match_format || "?"}</span> • {t.team_size}v{t.team_size}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        Start: <span className="text-white">{formatDate(t.start_time)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end justify-end mt-2 md:mt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-300"
                      onClick={() => setEditModal(t)}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit Tournament
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Tournament Modal */}
      {editModal && (
        <TournamentMedicEditModal
          tournament={editModal}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
