import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Circle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { StyledUsername } from "./StyledUsername";
import { formatDistanceToNow } from "date-fns";

interface RecentUser {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  last_seen: string;
}

const RecentlyOnline = () => {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, discord_username, discord_avatar_url, last_seen")
          .not("last_seen", "is", null)
          .eq("is_phantom", false)
          .order("last_seen", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching recently online users:", error);
        } else {
          setUsers(data || []);
        }
      } catch (error) {
        console.error("Error fetching recently online:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentUsers();
  }, []);

  const isOnlineNow = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Clock className="w-4 h-4 text-emerald-400" />
            Recently Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 text-sm text-center py-2">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Clock className="w-4 h-4 text-emerald-400" />
            Recently Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 text-sm text-center py-2">No recent activity</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Clock className="w-4 h-4 text-emerald-400" />
          Recently Online
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {users.map((user) => {
            const online = isOnlineNow(user.last_seen);
            return (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="relative">
                  {user.discord_avatar_url ? (
                    <img
                      src={user.discord_avatar_url}
                      alt={user.discord_username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-xs font-bold">
                      {user.discord_username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <Circle
                    className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 ${
                      online ? "text-emerald-400 fill-emerald-400" : "text-slate-500 fill-slate-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    <StyledUsername username={user.discord_username} userId={user.id} />
                  </div>
                  <div className="text-slate-400 text-xs">
                    {online
                      ? "Online now"
                      : formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentlyOnline;
