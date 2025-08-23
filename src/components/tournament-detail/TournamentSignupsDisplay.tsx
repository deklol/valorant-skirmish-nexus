import { Users, UserCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ClickableUsername from "@/components/ClickableUsername";
import { getRankIcon, getRankColor } from "@/utils/rankUtils";

interface Signup {
  id: string;
  user_id: string;
  is_substitute: boolean;
  is_checked_in: boolean;
  priority?: number;
  users: {
    id: string;
    discord_username: string;
    current_rank: string;
    rank_points?: number;
    weight_rating?: number;
    discord_avatar_url?: string;
    riot_id?: string;
  };
}

interface TournamentSignupsDisplayProps {
  signups: Signup[];
  maxPlayers: number;
}

export default function TournamentSignupsDisplay({ signups, maxPlayers }: TournamentSignupsDisplayProps) {
  const mainSignups = signups.filter(signup => !signup.is_substitute);
  const substitutes = signups.filter(signup => signup.is_substitute);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Tournament Signups</h3>
        <Badge variant="outline" className="text-white border-slate-500">
          {mainSignups.length}/{maxPlayers} registered
        </Badge>
      </div>

      {/* Main Signups */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-slate-300 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Registered Players ({mainSignups.length})
        </h4>
        {mainSignups.length === 0 ? (
          <div className="text-slate-400 italic">No players have signed up yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mainSignups.map((signup) => (
              <div
                key={signup.id}
                className="bg-slate-800/60 border border-slate-600 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <ClickableUsername
                    userId={signup.user_id}
                    username={signup.users.discord_username}
                    className="text-blue-300 font-medium"
                  />
                  {signup.is_checked_in && (
                    <Badge className="bg-green-700/30 text-green-200 text-xs">
                      Checked In
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1">
                    <span>Rank:</span>
                    {getRankIcon(signup.users.current_rank)}
                    <span className={getRankColor(signup.users.current_rank)}>
                      {signup.users.current_rank || "Unranked"}
                    </span>
                  </div>
                  <div>Weight: {signup.users.weight_rating || 150}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Substitutes */}
      {substitutes.length > 0 && (
        <div className="space-y-3">
        <h4 className="text-md font-medium text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Substitutes ({substitutes.length})
        </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {substitutes.map((signup) => (
              <div
                key={signup.id}
                className="bg-slate-700/40 border border-slate-600 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <ClickableUsername
                    userId={signup.user_id}
                    username={signup.users.discord_username}
                    className="text-amber-300 font-medium"
                  />
                  <Badge className="bg-amber-700/30 text-amber-200 text-xs">
                    Sub
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1">
                    <span>Rank:</span>
                    {getRankIcon(signup.users.current_rank)}
                    <span className={getRankColor(signup.users.current_rank)}>
                      {signup.users.current_rank || "Unranked"}
                    </span>
                  </div>
                  <div>Weight: {signup.users.weight_rating || 150}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}