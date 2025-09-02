import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  team1?: { name: string };
  team2?: { name: string };
  winner?: { name: string };
  status: string;
  score_team1?: number;
  score_team2?: number;
}

export default function BracketOverlay() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  useEffect(() => {
    if (!id) return;

    const fetchBracketData = async () => {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) {
        setLoading(false);
        return;
      }

      setTournament(tournamentData as Tournament);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name),
          team2:teams!matches_team2_id_fkey (name),
          winner:teams!matches_winner_id_fkey (name)
        `)
        .eq('tournament_id', id)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (!matchesError && matchesData) {
        setMatches(matchesData);
      }

      setLoading(false);
    };

    fetchBracketData();
  }, [id]);

  if (loading || !tournament) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading bracket...</div>
      </div>
    );
  }

  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const sceneSettings = settings.sceneSettings.bracketOverlay;
  const containerStyle = {
    backgroundColor: sceneSettings.backgroundColor || settings.backgroundColor,
    backgroundImage: sceneSettings.backgroundImage || settings.backgroundImage ? `url(${sceneSettings.backgroundImage || settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit',
  };

  const maxRound = Math.max(...Object.keys(rounds).map(Number));

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden p-8" style={containerStyle}>
      {/* Tournament Header */}
      <div className="text-center mb-8">
        <div 
          className="text-4xl font-bold mb-2"
          style={{ 
            color: sceneSettings.headerTextColor || settings.headerTextColor,
            fontFamily: sceneSettings.fontFamily || 'inherit',
            fontSize: sceneSettings.headerFontSize || 36
          }}
        >
          {tournament.name}
        </div>
        <div 
          className="text-xl"
          style={{ 
            color: (sceneSettings.textColor || settings.textColor) + '70',
            fontFamily: sceneSettings.fontFamily || 'inherit'
          }}
        >
          Tournament Bracket
        </div>
      </div>

      {/* Bracket */}
      <div className="flex justify-center space-x-12 overflow-x-auto">
        {Object.entries(rounds)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([roundNum, roundMatches]) => (
          <div key={roundNum} className="flex flex-col space-y-8 min-w-[300px]">
            <div className="text-center">
              <div 
                className="text-lg font-semibold mb-4"
                style={{ 
                  color: sceneSettings.headerTextColor || settings.headerTextColor,
                  fontFamily: sceneSettings.fontFamily || 'inherit'
                }}
              >
                {Number(roundNum) === maxRound 
                  ? 'Final' 
                  : Number(roundNum) === maxRound - 1 
                    ? 'Semifinals'
                    : `Round ${roundNum}`
                }
              </div>
            </div>
            
            <div className="space-y-6">
              {roundMatches.map((match) => (
                <div 
                  key={match.id}
                  className="backdrop-blur-sm rounded-lg border overflow-hidden"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderColor: sceneSettings.borderColor || '#ffffff20',
                    borderRadius: sceneSettings.borderRadius || 8,
                    borderWidth: sceneSettings.borderWidth || 1,
                  }}
                >
                  {/* Team 1 */}
                  <div className={`p-4 border-b border-white/10 ${
                    match.winner?.name === match.team1?.name 
                      ? 'bg-green-500/20 border-l-4 border-l-green-500' 
                      : match.status === 'completed' 
                        ? 'bg-red-500/10' 
                        : 'bg-black/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-medium"
                        style={{ 
                          color: sceneSettings.textColor || settings.textColor,
                          fontFamily: sceneSettings.fontFamily || 'inherit'
                        }}
                      >
                        {match.team1?.name || 'TBD'}
                      </span>
                      {match.score_team1 !== undefined && (
                        <span 
                          className="font-bold text-lg"
                          style={{ 
                            color: sceneSettings.headerTextColor || settings.headerTextColor,
                            fontFamily: sceneSettings.fontFamily || 'inherit'
                          }}
                        >
                          {match.score_team1}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Team 2 */}
                  <div className={`p-4 ${
                    match.winner?.name === match.team2?.name 
                      ? 'bg-green-500/20 border-l-4 border-l-green-500' 
                      : match.status === 'completed' 
                        ? 'bg-red-500/10' 
                        : 'bg-black/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">
                        {match.team2?.name || 'TBD'}
                      </span>
                      {match.score_team2 !== undefined && (
                        <span className="text-white font-bold text-lg">
                          {match.score_team2}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Match Status */}
                  <div className="px-4 py-2 bg-black/30 text-center">
                    <span className={`text-sm font-medium ${
                      match.status === 'completed' 
                        ? 'text-green-400' 
                        : match.status === 'live' 
                          ? 'text-red-400' 
                          : 'text-white/60'
                    }`}>
                      {match.status === 'completed' 
                        ? 'Completed' 
                        : match.status === 'live' 
                          ? 'LIVE' 
                          : 'Upcoming'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}