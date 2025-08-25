
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Map, Trophy, Clock, Eye, User } from "lucide-react";
import { formatDate } from "@/hooks/useTournamentUtils";
import { useTournamentPageViews } from "@/hooks/useTournamentPageViews";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TournamentInfoCards({ tournament, parsedMapVetoRounds }: { tournament: any, parsedMapVetoRounds: number[] }) {
  const { pageViews } = useTournamentPageViews(tournament?.id);
  const [talentData, setTalentData] = useState<any>(null);
  const [talentUsers, setTalentUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTalentData = async () => {
      if (!tournament?.id) return;
      
      try {
        const { data: talent } = await supabase
          .from('tournament_talent')
          .select('*')
          .eq('tournament_id', tournament.id)
          .single();

        if (talent) {
          setTalentData(talent);
          
          // Fetch user names for IDs
          const userIds = [
            talent.lead_tournament_admin_id,
            ...(talent.tournament_admin_ids || []),
            talent.production_lead_id,
            talent.production_assistant_id,
            talent.caster_1_id,
            talent.caster_2_id,
            talent.observer_id,
            talent.replay_op_id,
          ].filter(Boolean);

          if (userIds.length > 0) {
            const { data: users } = await supabase
              .from('users')
              .select('id, discord_username')
              .in('id', userIds);

            if (users) {
              const userMap = users.reduce((acc, user) => {
                acc[user.id] = user.discord_username;
                return acc;
              }, {} as Record<string, string>);
              setTalentUsers(userMap);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching talent data:', error);
      }
    };

    fetchTalentData();
  }, [tournament?.id]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Tournament Information Card */}
      <Card className="bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Tournament Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400">Format</div>
              <div className="text-white">{tournament.bracket_type?.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Team Size</div>
              <div className="text-white">{tournament.team_size}v{tournament.team_size}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Max Teams</div>
              <div className="text-white">{tournament.max_teams}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Max Players</div>
              <div className="text-white">{tournament.max_players}</div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Page Views</div>
                <div className="text-white font-semibold">{pageViews.toLocaleString()}</div>
              </div>
            </div>
          </div>
          {tournament.enable_map_veto && (
            <div>
              <div className="text-sm text-slate-400">Map Veto</div>
              <div className="text-white">Enabled</div>
              {parsedMapVetoRounds.length > 0 && (
                <div className="text-sm text-slate-500">
                  Required rounds: {parsedMapVetoRounds.join(', ')}
                </div>
              )}
            </div>
          )}
          {talentData && (
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-slate-400" />
                <div className="text-sm text-slate-400">Tournament Staff</div>
              </div>
              <div className="space-y-2 text-sm">
                {talentData.lead_tournament_admin_id && (
                  <div className="text-white">
                    <span className="text-slate-400">Lead Admin:</span> {talentUsers[talentData.lead_tournament_admin_id]}
                  </div>
                )}
                {talentData.tournament_admin_ids?.length > 0 && (
                  <div className="text-white">
                    <span className="text-slate-400">Admins:</span> {talentData.tournament_admin_ids.map(id => talentUsers[id]).filter(Boolean).join(', ')}
                  </div>
                )}
                {(talentData.production_lead_id || talentData.production_lead_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Production Lead:</span> {talentUsers[talentData.production_lead_id] || talentData.production_lead_manual_name}
                  </div>
                )}
                {(talentData.production_assistant_id || talentData.production_assistant_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Production Assistant:</span> {talentUsers[talentData.production_assistant_id] || talentData.production_assistant_manual_name}
                  </div>
                )}
                {(talentData.caster_1_id || talentData.caster_1_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Caster 1:</span> {talentUsers[talentData.caster_1_id] || talentData.caster_1_manual_name}
                  </div>
                )}
                {(talentData.caster_2_id || talentData.caster_2_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Caster 2:</span> {talentUsers[talentData.caster_2_id] || talentData.caster_2_manual_name}
                  </div>
                )}
                {(talentData.observer_id || talentData.observer_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Observer:</span> {talentUsers[talentData.observer_id] || talentData.observer_manual_name}
                  </div>
                )}
                {(talentData.replay_op_id || talentData.replay_op_manual_name) && (
                  <div className="text-white">
                    <span className="text-slate-400">Replay Op:</span> {talentUsers[talentData.replay_op_id] || talentData.replay_op_manual_name}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Timeline Card */}
      <Card className="bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Registration Opens</div>
                <div className="text-white text-sm">{formatDate(tournament.registration_opens_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Registration Closes</div>
                <div className="text-white text-sm">{formatDate(tournament.registration_closes_at)}</div>
              </div>
            </div>
            {tournament.check_in_required && (
              <>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Check-in Starts</div>
                    <div className="text-white text-sm">{formatDate(tournament.check_in_starts_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Check-in Ends</div>
                    <div className="text-white text-sm">{formatDate(tournament.check_in_ends_at)}</div>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm text-slate-400">Tournament Starts</div>
                <div className="text-white text-sm">{formatDate(tournament.start_time)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
