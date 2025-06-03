
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  currentSignups: number;
  maxPlayers: number;
  prizePool: string;
  startTime: Date;
  status: "open" | "balancing" | "live" | "completed";
  format: "BO1" | "BO3";
}

interface TournamentCardProps {
  tournament: Tournament;
}

const TournamentCard = ({ tournament }: TournamentCardProps) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [signupStatus, setSignupStatus] = useState<'not_signed' | 'main' | 'substitute'>('not_signed');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkSignupStatus();
  }, [user, tournament.id]);

  const checkSignupStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_signups')
        .select('is_substitute')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking signup status:', error);
        return;
      }

      if (data) {
        setIsSignedUp(true);
        setSignupStatus(data.is_substitute ? 'substitute' : 'main');
      }
    } catch (error) {
      console.error('Error checking signup status:', error);
    }
  };

  const handleSignup = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join tournaments",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting tournament signup for:', {
      tournamentId: tournament.id,
      userId: user.id,
      tournamentName: tournament.name
    });

    setIsSigningUp(true);
    try {
      // Check if tournament is full
      const isFull = tournament.currentSignups >= tournament.maxPlayers;
      const isSubstitute = isFull;

      console.log('Inserting tournament signup with:', {
        tournament_id: tournament.id,
        user_id: user.id,
        is_substitute: isSubstitute
      });

      const { data, error } = await supabase
        .from('tournament_signups')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          is_substitute: isSubstitute,
        })
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '23505') {
          toast({
            title: "Already Signed Up",
            description: "You're already registered for this tournament",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to join tournament: ${error.message}`,
            variant: "destructive",
          });
        }
      } else {
        console.log('Successfully signed up for tournament');
        setIsSignedUp(true);
        setSignupStatus(isSubstitute ? 'substitute' : 'main');
        
        if (isSubstitute) {
          toast({
            title: "Added to Waitlist",
            description: "Tournament is full. You've been added as a substitute!",
          });
        } else {
          toast({
            title: "Success!",
            description: "Successfully joined the tournament",
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error during tournament signup:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const getStatusBadge = (status: Tournament["status"]) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Open</Badge>;
      case "balancing":
        return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">Balancing</Badge>;
      case "live":
        return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">Live</Badge>;
      case "completed":
        return <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30">Completed</Badge>;
    }
  };

  const getSignupBadge = () => {
    switch (signupStatus) {
      case 'main':
        return <Badge className="bg-green-500/20 text-green-400">Registered</Badge>;
      case 'substitute':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Substitute</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const spotsRemaining = tournament.maxPlayers - tournament.currentSignups;
  const isFull = spotsRemaining <= 0;

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-xl mb-2">{tournament.name}</CardTitle>
            <div className="flex items-center gap-2 mb-3">
              {getStatusBadge(tournament.status)}
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.format}
              </Badge>
              {getSignupBadge()}
            </div>
          </div>
          <Trophy className="w-6 h-6 text-yellow-500" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tournament Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span>{tournament.currentSignups}/{tournament.maxPlayers} players</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span>{formatDate(tournament.startTime)}</span>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="text-sm text-slate-300">
          <span className="text-yellow-400 font-medium">Prize: </span>
          {tournament.prizePool}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Signups</span>
            <span className="text-slate-300">{tournament.currentSignups}/{tournament.maxPlayers}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((tournament.currentSignups / tournament.maxPlayers) * 100, 100)}%` }}
            />
          </div>
          {!isFull && spotsRemaining > 0 && (
            <p className="text-xs text-slate-400">{spotsRemaining} spots remaining</p>
          )}
          {isFull && (
            <p className="text-xs text-yellow-400">Tournament Full - Join as Substitute</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {tournament.status === "open" && !isSignedUp && (
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSignup}
              disabled={isSigningUp}
            >
              {isSigningUp 
                ? "Joining..." 
                : isFull 
                  ? "Join as Substitute" 
                  : "Join Tournament"
              }
            </Button>
          )}
          {tournament.status === "open" && isSignedUp && (
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled>
              {signupStatus === 'substitute' ? 'Substitute!' : 'Joined!'}
            </Button>
          )}
          {tournament.status !== "open" && (
            <Link to={`/tournament/${tournament.id}`} className="flex-1">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                View Details
              </Button>
            </Link>
          )}
          <Link to={`/bracket/${tournament.id}`}>
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              Bracket
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentCard;
