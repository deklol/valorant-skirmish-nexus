import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { BroadcastLoading } from "@/components/broadcast/BroadcastLoading";
import { 
  getBroadcastContainerStyle, 
  getBroadcastHeaderStyle, 
  getBroadcastTextStyle,
  getBroadcastCardStyle,
  BROADCAST_CONTAINER_CLASSES,
  BROADCAST_DEFAULTS
} from "@/utils/broadcastLayoutUtils";

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
    return <BroadcastLoading message="Loading bracket..." />;
  }

  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const sceneSettings = settings.sceneSettings.bracketOverlay;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);
  const maxRound = Math.max(...Object.keys(rounds).map(Number));

  return (
    <div className={BROADCAST_CONTAINER_CLASSES + " overflow-hidden p-8"} style={containerStyle}>
      {/* Tournament Header */}
      <div className="text-center mb-8">
        {/* Tournament Name Block */}
        <div 
          className="inline-block px-8 py-4 mb-4"
          style={{ backgroundColor: '#FF6B35' }}
        >
          <div 
            className="text-4xl font-black text-white"
            style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
          >
            {tournament.name}
          </div>
        </div>
        
        {/* Subtitle Block */}
        <div 
          className="inline-block px-6 py-2"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <div 
            className="text-2xl font-bold text-white"
            style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
          >
            TOURNAMENT BRACKET
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="flex justify-center space-x-12 overflow-x-auto">
        {Object.entries(rounds)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([roundNum, roundMatches]) => (
          <div key={roundNum} className="flex flex-col space-y-8 min-w-[300px]">
            <div className="text-center">
              {/* Round Header Block */}
              <div 
                className="inline-block px-6 py-3 mb-6"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
              >
                <div 
                  className="text-xl font-black text-white"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  {Number(roundNum) === maxRound 
                    ? 'FINAL' 
                    : Number(roundNum) === maxRound - 1 
                      ? 'SEMIFINALS'
                      : `ROUND ${roundNum}`
                  }
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {roundMatches.map((match) => (
                <div 
                  key={match.id}
                  className="bg-black overflow-hidden"
                  style={{ minWidth: '280px' }}
                >
                  {/* Team 1 */}
                  <div 
                    className={`p-4 ${
                      match.winner?.name === match.team1?.name 
                        ? 'border-l-8' 
                        : match.status === 'completed' 
                          ? 'border-l-8 border-l-red-500' 
                          : ''
                    }`}
                    style={{ 
                      backgroundColor: match.winner?.name === match.team1?.name 
                        ? '#22c55e' 
                        : match.status === 'completed' 
                          ? 'rgba(239, 68, 68, 0.3)' 
                          : 'rgba(0, 0, 0, 0.8)',
                      borderLeftColor: match.winner?.name === match.team1?.name ? '#16a34a' : '#ef4444'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-black text-white"
                        style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                      >
                        {match.team1?.name || 'TBD'}
                      </span>
                      {match.score_team1 !== undefined && (
                        <div 
                          className="px-3 py-1 font-black text-lg"
                          style={{ 
                            backgroundColor: '#FF6B35',
                            color: '#000000',
                            fontFamily: BROADCAST_DEFAULTS.fontFamily
                          }}
                        >
                          {match.score_team1}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Team 2 */}
                  <div 
                    className={`p-4 ${
                      match.winner?.name === match.team2?.name 
                        ? 'border-l-8' 
                        : match.status === 'completed' 
                          ? 'border-l-8 border-l-red-500' 
                          : ''
                    }`}
                    style={{ 
                      backgroundColor: match.winner?.name === match.team2?.name 
                        ? '#22c55e' 
                        : match.status === 'completed' 
                          ? 'rgba(239, 68, 68, 0.3)' 
                          : 'rgba(0, 0, 0, 0.8)',
                      borderLeftColor: match.winner?.name === match.team2?.name ? '#16a34a' : '#ef4444'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="font-black text-white"
                        style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                      >
                        {match.team2?.name || 'TBD'}
                      </span>
                      {match.score_team2 !== undefined && (
                        <div 
                          className="px-3 py-1 font-black text-lg"
                          style={{ 
                            backgroundColor: '#FF6B35',
                            color: '#000000',
                            fontFamily: BROADCAST_DEFAULTS.fontFamily
                          }}
                        >
                          {match.score_team2}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Match Status */}
                  <div 
                    className="px-4 py-3 text-center"
                    style={{ 
                      backgroundColor: match.status === 'completed' 
                        ? '#16a34a' 
                        : match.status === 'live' 
                          ? '#ef4444' 
                          : '#6b7280'
                    }}
                  >
                    <span 
                      className="font-black text-sm"
                      style={{ 
                        color: '#000000',
                        fontFamily: BROADCAST_DEFAULTS.fontFamily
                      }}
                    >
                      {match.status === 'completed' 
                        ? 'COMPLETED' 
                        : match.status === 'live' 
                          ? 'LIVE' 
                          : 'UPCOMING'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tournament Status Footer */}
      <div className="text-center mt-8 pt-4">
        <div 
          className="inline-flex items-center px-8 py-4 font-black text-2xl"
          style={{
            backgroundColor: tournament.status === 'live' 
              ? BROADCAST_DEFAULTS.errorColor
              : tournament.status === 'completed' 
                ? BROADCAST_DEFAULTS.successColor
                : BROADCAST_DEFAULTS.accentColor,
            color: '#000000',
            fontFamily: BROADCAST_DEFAULTS.fontFamily
          }}
        >
          {tournament.status === 'live' && '🔴 LIVE TOURNAMENT'}
          {tournament.status === 'completed' && '✅ TOURNAMENT COMPLETE'}
          {tournament.status === 'open' && '📝 REGISTRATION OPEN'}
          {tournament.status === 'balancing' && '⚖️ TEAM BALANCING'}
          {tournament.status === 'draft' && '📋 DRAFT MODE'}
        </div>
      </div>
    </div>
  );
}