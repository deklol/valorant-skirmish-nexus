
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Trophy, Clock } from "lucide-react";
import TournamentSpotlight from "@/components/TournamentSpotlight";

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  status: string;
  prize_pool?: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "live": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-green-500/20 text-green-400 border-green-500/30";
  }
}

export default function TournamentTabs() {
  const [live, setLive] = useState<Tournament[]>([]);
  const [upcoming, setUpcoming] = useState<Tournament[]>([]);
  const [past, setPast] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      setLoading(true);
      // Live (status: 'live', 'balancing')
      const { data: liveData } = await supabase
        .from("tournaments")
        .select("id,name,start_time,status,prize_pool")
        .in("status", ["live", "balancing"])
        .order("start_time", { ascending: true });

      // Upcoming (status: 'open', 'draft')
      const { data: upcomingData } = await supabase
        .from("tournaments")
        .select("id,name,start_time,status,prize_pool")
        .in("status", ["open", "draft"])
        .order("start_time", { ascending: true });

      // Past (status: 'completed')
      const { data: pastData } = await supabase
        .from("tournaments")
        .select("id,name,start_time,status,prize_pool")
        .eq("status", "completed")
        .order("start_time", { ascending: false });

      setLive(liveData || []);
      setUpcoming(upcomingData || []);
      setPast(pastData || []);
      setLoading(false);
    }
    fetchTournaments();
  }, []);

  // Show at most 5 tournaments per list for brevity
  function List({ tournaments, showSpotlight = false }: { tournaments: Tournament[], showSpotlight?: boolean }) {
    if (tournaments.length === 0) {
      return showSpotlight ? <TournamentSpotlight /> : <div className="text-slate-400 text-sm text-center py-4">No results</div>;
    }
    return (
      <div className="flex flex-col gap-2">
        {tournaments.slice(0, 5).map(t => (
          <Card key={t.id} className="bg-slate-700 border-slate-600 hover:bg-slate-700/80 transition cursor-pointer" onClick={() => window.location.href = `/tournament/${t.id}`}>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-white text-base">{t.name}</CardTitle>
              <span className={getStatusColor(t.status) + ' px-2 py-1 rounded text-xs'}>
                {t.status === "completed" ? "Past" : "Live"}
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex gap-3 text-sm text-slate-300">
               <span className="flex items-center gap-1">
                 <Calendar className="w-4 h-4" />
                 {new Date(t.start_time).toLocaleString("en-GB", { 
                   timeZone: "UTC",
                   day: "2-digit", 
                   month: "short",
                   hour: "2-digit",
                   minute: "2-digit"
                 })}
               </span>
              {t.prize_pool && (
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />{t.prize_pool}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700 mb-4">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Tournaments</CardTitle>
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="bg-slate-800/90 border border-slate-700 mt-2">
            <TabsTrigger value="live" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Live</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Past</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="pt-4">
            {loading ? <div className="text-slate-400 text-sm text-center">Loading...</div> : <List tournaments={live} showSpotlight={true} />}
          </TabsContent>
          <TabsContent value="upcoming" className="pt-4">
            {loading ? <div className="text-slate-400 text-sm text-center">Loading...</div> : <List tournaments={upcoming} showSpotlight={true} />}
          </TabsContent>
          <TabsContent value="past" className="pt-4">
            {loading ? <div className="text-slate-400 text-sm text-center">Loading...</div> : <List tournaments={past} />}
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
