
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
// Map veto functionality removed

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  team1: { name: string } | null;
  team2: { name: string } | null;
  winner_id: string | null;
  round_number: number;
  match_number: number;
  status: string;
}

interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url: string | null;
  is_active: boolean;
}

export default function BracketView() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [bracketData, setBracketData] = useState<any>(null);
  const [tournamentMapPool, setTournamentMapPool] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      toast({
        title: "Error",
        description: "No tournament ID provided in URL.",
        variant: "destructive",
      });
      navigate(-1);
      return;
    }

    const fetchBracketData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select(`
            *,
            matches (
              id,
              team1_id,
              team2_id,
              round_number,
              match_number,
            status,
            team1:team1_id (name),
            team2:team2_id (name)
            )
          `)
          .eq("id", tournamentId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Tournament not found");

        setBracketData(data);

        // Load tournament map pool - fix the type conversion
        if (data.map_pool && Array.isArray(data.map_pool) && data.map_pool.length > 0) {
          // Convert Json[] to string[] safely
          const mapPoolIds = data.map_pool
            .filter((id): id is string => typeof id === 'string')
            .filter(Boolean);
          
          if (mapPoolIds.length > 0) {
            const { data: mapData } = await supabase
              .from('maps')
              .select('*')
              .in('id', mapPoolIds)
              .eq('is_active', true);
            
            if (mapData) {
              setTournamentMapPool(mapData.sort((a, b) => a.display_name.localeCompare(b.display_name)));
            }
          }
        }

        // Find user's team ID if they are participating
        if (user) {
          const { data: teamData } = await supabase
            .from("team_members")
            .select("team_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

          setUserTeamId(teamData?.team_id || null);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load bracket data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBracketData();
  }, [tournamentId, user, navigate, toast]);

  const handleMatchClick = (match: Match) => {
    // Match click functionality removed with veto system
  };

  const refreshBracketData = async () => {
    if (!tournamentId) return;
    
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select(`
          *,
          matches (
            id,
            team1_id,
            team2_id,
            round_number,
            match_number,
            status,
            team1:team1_id (name),
            team2:team2_id (name)
          )
        `)
        .eq("id", tournamentId)
        .single();

      if (error) throw error;
      if (data) {
        setBracketData(data);
      }
    } catch (error: any) {
      console.error('Failed to refresh bracket data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Skeleton className="w-[200px] h-8 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="w-[150px] h-6" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-full h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bracketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <div className="text-center text-white">Tournament not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        <h1 className="text-2xl font-bold text-white mb-4">
          {bracketData.name} Bracket
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bracketData.matches.map((match: Match) => (
            <Card
              key={match.id}
              className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-700"
              onClick={() => handleMatchClick(match)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  Match {match.match_number}
                  <Badge
                    variant="secondary"
                    className={cn(
                      match.status === "completed"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : match.status === "in_progress"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    )}
                  >
                    {match.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <div className="flex justify-between">
                  <div>
                    {match.team1 ? match.team1.name : "TBD"}
                  </div>
                  <div>vs</div>
                  <div>
                    {match.team2 ? match.team2.name : "TBD"}
                  </div>
                </div>
                <div className="text-slate-400 text-sm mt-2">
                  Round: {match.round_number}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Map veto dialog removed - veto system deleted */}
      </div>
    </div>
  );
}
