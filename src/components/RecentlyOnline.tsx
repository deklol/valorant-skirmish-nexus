import { useState, useEffect } from "react";
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
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--beta-text-secondary))]">
        <Clock className="w-3.5 h-3.5 text-[hsl(var(--beta-accent))]" />
        <span>Recently Online</span>
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--beta-text-secondary))]">
        <Clock className="w-3.5 h-3.5 text-[hsl(var(--beta-accent))]" />
        <span className="font-medium">Online</span>
      </div>
      <div className="flex items-center gap-1">
        {users.map((user) => {
          const online = isOnlineNow(user.last_seen);
          return (
            <Link
              key={user.id}
              to={`/profile/${user.id}`}
              className="relative group"
              title={`${user.discord_username} — ${online ? "Online now" : formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`}
            >
              <div className="relative">
                {user.discord_avatar_url ? (
                  <img
                    src={user.discord_avatar_url}
                    alt={user.discord_username}
                    className="w-8 h-8 rounded-full border-2 border-[hsl(var(--beta-glass-border))] group-hover:border-[hsl(var(--beta-accent))] transition-colors"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-2))] border-2 border-[hsl(var(--beta-glass-border))] group-hover:border-[hsl(var(--beta-accent))] flex items-center justify-center text-[hsl(var(--beta-text-secondary))] text-xs font-bold transition-colors">
                    {user.discord_username.charAt(0).toUpperCase()}
                  </div>
                )}
                <Circle
                  className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                    online ? "text-emerald-400 fill-emerald-400" : "text-[hsl(var(--beta-text-muted))] fill-[hsl(var(--beta-text-muted))]"
                  }`}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyOnline;
