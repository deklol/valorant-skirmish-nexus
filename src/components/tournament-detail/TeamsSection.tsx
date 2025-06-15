
import { Crown, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ClickableUsername from "@/components/ClickableUsername";
import type { Team } from "@/types/tournamentDetail";

export default function TeamsSection({ teams }: { teams: Team[] }) {
  // Sorted alphabetically
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-6 mb-6">
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl">
        <div className="p-6">
          <div className="text-xl font-bold text-white flex gap-2 items-center mb-4">
            <Users className="w-5 h-5" />
            Teams &amp; Participants
          </div>
          {sortedTeams.length === 0 ? (
            <div className="text-slate-400">No teams have been formed yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow flex flex-col"
                >
                  {/* --- Team heading row --- */}
                  <div className="flex flex-row items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-white">Team {team.name}</span>
                      {team.team_members?.some(m => m.is_captain) && (
                        <span title="Captain">
                          <Crown className="w-5 h-5 text-yellow-400" />
                        </span>
                      )}
                    </div>
                    <Badge className="bg-purple-700/30 border border-purple-500 text-purple-200 font-semibold text-xs px-4 py-1 rounded-full">
                      Team Weight: {team.total_rank_points ?? 0}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {team.team_members && team.team_members.length > 0 ? (
                      team.team_members.map(member => (
                        <div
                          key={member.user_id}
                          className={`flex items-center gap-2 px-3 py-2 rounded ${
                            member.is_captain
                              ? "bg-slate-800 text-white font-semibold"
                              : "bg-slate-800/80 text-blue-200"
                          }`}
                        >
                          <Users className="w-4 h-4 text-blue-300" />
                          <ClickableUsername
                            userId={member.user_id}
                            username={member.users?.discord_username || ""}
                            className={`${
                              member.is_captain ? "text-white" : "text-blue-300"
                            }`}
                          />
                          {member.is_captain && (
                            <span title="Captain">
                              <Crown className="w-4 h-4 text-yellow-400 ml-1" />
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">
                            {member.users?.current_rank || "Unranked"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">No participants</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
