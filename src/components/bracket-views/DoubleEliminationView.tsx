/**
 * Double Elimination View Component
 * Displays winners bracket, losers bracket, and grand final
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Skull, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DoubleEliminationViewProps {
  tournamentId: string;
  tournamentName?: string;
}

interface DEMatch {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  bracket_position: string | null;
  notes: string | null;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

const DoubleEliminationView = ({ tournamentId, tournamentName }: DoubleEliminationViewProps) => {
  const [winnersMatches, setWinnersMatches] = useState<DEMatch[]>([]);
  const [losersMatches, setLosersMatches] = useState<DEMatch[]>([]);
  const [grandFinalMatches, setGrandFinalMatches] = useState<DEMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'winners' | 'losers' | 'grand_final'>('winners');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoubleElimData();
    
    const channel = supabase
      .channel(`de:${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        fetchDoubleElimData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchDoubleElimData = async () => {
    try {
      setLoading(true);

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesData) {
        const processed = matchesData.map((match: any) => ({
          ...match,
          team1: match.team1 && typeof match.team1 === 'object' ? match.team1 : null,
          team2: match.team2 && typeof match.team2 === 'object' ? match.team2 : null,
        }));

        // Separate by bracket position
        // Winners: positive round numbers, not grand_final
        // Losers: negative round numbers or bracket_position = 'losers'
        // Grand Final: bracket_position = 'grand_final'
        
        setWinnersMatches(processed.filter(m => 
          m.round_number > 0 && m.bracket_position !== 'grand_final' && m.bracket_position !== 'losers'
        ));
        
        setLosersMatches(processed.filter(m => 
          m.round_number < 0 || m.bracket_position === 'losers'
        ));
        
        setGrandFinalMatches(processed.filter(m => 
          m.bracket_position === 'grand_final'
        ));
      }
    } catch (error) {
      console.error('Error fetching double elimination data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoundName = (roundNumber: number, totalRounds: number, isLosers: boolean = false) => {
    const absRound = Math.abs(roundNumber);
    
    if (isLosers) {
      return `Losers R${absRound}`;
    }
    
    if (roundNumber === totalRounds) return "Winners Final";
    if (roundNumber === totalRounds - 1) return "Winners Semi-Final";
    return `Winners R${roundNumber}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500/20 text-gray-400",
      live: "bg-red-500/20 text-red-400 animate-pulse",
      completed: "bg-green-500/20 text-green-400"
    };
    return <Badge className={variants[status] || variants.pending}>{status}</Badge>;
  };

  const renderMatchCard = (match: DEMatch) => (
    <div
      key={match.id}
      className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Match #{match.match_number}</span>
        {getStatusBadge(match.status)}
      </div>
      
      <div className="space-y-2">
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.team1_id ? 'bg-green-900/30' : ''
        }`}>
          <span className={`text-sm ${match.winner_id === match.team1_id ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
            {match.team1?.name || 'TBD'}
          </span>
          <span className="text-white font-mono">{match.score_team1}</span>
        </div>
        
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.team2_id ? 'bg-green-900/30' : ''
        }`}>
          <span className={`text-sm ${match.winner_id === match.team2_id ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
            {match.team2?.name || 'TBD'}
          </span>
          <span className="text-white font-mono">{match.score_team2}</span>
        </div>
      </div>
    </div>
  );

  const renderBracket = (matches: DEMatch[], isLosers: boolean = false) => {
    // Group by round
    const rounds = new Map<number, DEMatch[]>();
    matches.forEach(match => {
      const round = match.round_number;
      if (!rounds.has(round)) {
        rounds.set(round, []);
      }
      rounds.get(round)!.push(match);
    });

    const sortedRounds = Array.from(rounds.entries()).sort((a, b) => 
      isLosers ? b[0] - a[0] : a[0] - b[0] // Losers rounds are negative, so reverse sort
    );
    const totalRounds = sortedRounds.length;

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedRounds.map(([roundNum, roundMatches], index) => (
          <div key={roundNum} className="flex-shrink-0 w-64">
            <div className="text-center mb-3">
              <Badge variant="outline" className="border-slate-600">
                {getRoundName(roundNum, totalRounds, isLosers)}
              </Badge>
            </div>
            <div className="space-y-3">
              {roundMatches.map(match => renderMatchCard(match))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-slate-400">Loading bracket...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {tournamentName || 'Double Elimination'}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeView === 'winners' ? 'default' : 'outline'}
                onClick={() => setActiveView('winners')}
                className={activeView === 'winners' ? 'bg-green-600' : 'border-slate-600'}
              >
                <Crown className="w-4 h-4 mr-1" />
                Winners ({winnersMatches.length})
              </Button>
              <Button
                size="sm"
                variant={activeView === 'losers' ? 'default' : 'outline'}
                onClick={() => setActiveView('losers')}
                className={activeView === 'losers' ? 'bg-red-600' : 'border-slate-600'}
              >
                <Skull className="w-4 h-4 mr-1" />
                Losers ({losersMatches.length})
              </Button>
              <Button
                size="sm"
                variant={activeView === 'grand_final' ? 'default' : 'outline'}
                onClick={() => setActiveView('grand_final')}
                className={activeView === 'grand_final' ? 'bg-yellow-600' : 'border-slate-600'}
              >
                <Trophy className="w-4 h-4 mr-1" />
                Grand Final
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Winners Bracket */}
      {activeView === 'winners' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-green-400 text-lg flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Winners Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {winnersMatches.length > 0 ? (
              renderBracket(winnersMatches, false)
            ) : (
              <p className="text-slate-400 text-center py-4">No winners bracket matches yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Losers Bracket */}
      {activeView === 'losers' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-red-400 text-lg flex items-center gap-2">
              <Skull className="w-5 h-5" />
              Losers Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {losersMatches.length > 0 ? (
              renderBracket(losersMatches, true)
            ) : (
              <p className="text-slate-400 text-center py-4">No losers bracket matches yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grand Final */}
      {activeView === 'grand_final' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Grand Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grandFinalMatches.length > 0 ? (
              <div className="max-w-md mx-auto space-y-4">
                {grandFinalMatches.map(match => (
                  <div key={match.id}>
                    <div className="text-center mb-2">
                      <Badge className={match.notes?.includes('Reset') ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}>
                        {match.notes || 'Grand Final'}
                      </Badge>
                    </div>
                    {renderMatchCard(match)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">Grand Final not yet determined</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-slate-400">Winner</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-500/20 text-gray-400 text-xs">pending</Badge>
              <span className="text-slate-400">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500/20 text-red-400 text-xs">live</Badge>
              <span className="text-slate-400">In Progress</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoubleEliminationView;
