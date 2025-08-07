import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpcomingTournament {
  id: string;
  name: string;
  status: string;
  start_time: string | null;
  max_players?: number | null;
}

const UpcomingTournamentsRail = () => {
  const [items, setItems] = useState<UpcomingTournament[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUpcoming = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id,name,status,start_time,max_players")
        .in("status", ["open", "draft", "balancing"]) // treat these as upcoming
        .order("start_time", { ascending: true })
        .limit(12);
      if (!error) setItems(data || []);
    };
    fetchUpcoming();
  }, []);

  if (!items.length) return null;

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "TBA";

  return (
    <section aria-labelledby="upcoming-tournaments">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle id="upcoming-tournaments" className="text-white">Upcoming Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <div className="flex gap-4 pb-2">
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="text-left w-[260px] shrink-0 rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white line-clamp-1">{t.name}</div>
                    <Badge className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      {t.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <Calendar className="w-4 h-4" /> {fmt(t.start_time)}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-xs mt-2">
                    <Users className="w-4 h-4" /> {t.max_players ?? 0} max
                    <Clock className="w-4 h-4 ml-3" /> Best of 1
                  </div>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
};

export default UpcomingTournamentsRail;
