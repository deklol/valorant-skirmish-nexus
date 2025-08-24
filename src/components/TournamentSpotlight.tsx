import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Users, Eye, UserPlus, UserMinus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  status: string;
  prize_pool?: string;
  banner_image_url?: string;
  max_players: number;
  currentSignups?: number;
}

const TournamentSpotlight = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpotlightTournament();
  }, []);

  useEffect(() => {
    if (tournament && user) {
      checkSignupStatus();
    }
  }, [tournament, user]);

  const fetchSpotlightTournament = async () => {
    try {
      // Get tournaments that are open for signup or live
      const { data: tournaments } = await supabase
        .from("tournaments")
        .select(`
          id, name, description, start_time, status, prize_pool, 
          banner_image_url, max_players
        `)
        .in("status", ["open", "live", "balancing"])
        .order("start_time", { ascending: true })
        .limit(1);

      if (tournaments && tournaments.length > 0) {
        const spotlightTournament = tournaments[0];
        
        // Get current signup count
        const { count } = await supabase
          .from("tournament_signups")
          .select("*", { count: "exact" })
          .eq("tournament_id", spotlightTournament.id);

        setTournament({
          ...spotlightTournament,
          currentSignups: count || 0
        });
      }
    } catch (error) {
      console.error("Error fetching spotlight tournament:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSignupStatus = async () => {
    if (!tournament || !user) return;

    try {
      const { data } = await supabase
        .from("tournament_signups")
        .select("id")
        .eq("tournament_id", tournament.id)
        .eq("user_id", user.id)
        .single();

      setIsSignedUp(!!data);
    } catch (error) {
      // Not signed up
      setIsSignedUp(false);
    }
  };

  const handleSignup = async () => {
    if (!tournament || !user) {
      navigate("/login");
      return;
    }

    setSigningUp(true);
    try {
      if (isSignedUp) {
        // Cancel signup
        const { error } = await supabase
          .from("tournament_signups")
          .delete()
          .eq("tournament_id", tournament.id)
          .eq("user_id", user.id);

        if (error) throw error;
        
        setIsSignedUp(false);
        toast.success("Successfully withdrew from tournament");
      } else {
        // Sign up
        const { error } = await supabase
          .from("tournament_signups")
          .insert({
            tournament_id: tournament.id,
            user_id: user.id,
            is_substitute: (tournament.currentSignups || 0) >= tournament.max_players
          });

        if (error) throw error;
        
        setIsSignedUp(true);
        const isSubstitute = (tournament.currentSignups || 0) >= tournament.max_players;
        toast.success(isSubstitute ? "Signed up as substitute!" : "Successfully signed up!");
      }

      // Refresh tournament data
      fetchSpotlightTournament();
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to update signup status");
    } finally {
      setSigningUp(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Open</Badge>;
      case "live":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Live</Badge>;
      case "balancing":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Balancing</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 mb-4">
        <CardContent className="p-6">
          <div className="text-slate-400 text-sm text-center">Loading tournament...</div>
        </CardContent>
      </Card>
    );
  }

  if (!tournament) {
    return (
      <Card className="bg-slate-800 border-slate-700 mb-4">
        <CardContent className="p-6">
          <div className="text-slate-400 text-sm text-center">No tournaments available</div>
        </CardContent>
      </Card>
    );
  }

  const isFull = (tournament.currentSignups || 0) >= tournament.max_players;
  const canSignupAsSubstitute = tournament.status === "open";

  return (
    <Card className="bg-slate-800 border-slate-700 mb-4 overflow-hidden">
      <div 
        className="relative min-h-[300px] bg-cover bg-center"
        style={{
          backgroundImage: tournament.banner_image_url 
            ? `url(${tournament.banner_image_url})` 
            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
        
        <CardContent className="relative z-10 p-6 h-full flex flex-col justify-end">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{tournament.name}</h3>
                {tournament.description && (
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                    {tournament.description}
                  </p>
                )}
              </div>
              {getStatusBadge(tournament.status)}
            </div>

            {/* Tournament Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(tournament.start_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4" />
                <span>{tournament.currentSignups || 0}/{tournament.max_players} Players</span>
              </div>
              {tournament.prize_pool && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Trophy className="w-4 h-4" />
                  <span>{tournament.prize_pool}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Link to={`/tournament/${tournament.id}`} className="flex-1">
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
              </Link>
              
              {tournament.status === "open" && (
                <Button
                  onClick={handleSignup}
                  disabled={signingUp}
                  className={`flex-1 flex items-center gap-2 ${
                    isSignedUp 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {signingUp ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : isSignedUp ? (
                    <UserMinus className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isSignedUp ? "Withdraw" : isFull ? "Join as Sub" : "Sign Up"}
                </Button>
              )}
            </div>

            {isFull && canSignupAsSubstitute && !isSignedUp && (
              <p className="text-yellow-400 text-xs text-center">
                Tournament is full - you can still sign up as a substitute!
              </p>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default TournamentSpotlight;