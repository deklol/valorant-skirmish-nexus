import { useState, useEffect } from "react";
import { Bell, CheckCircle, Trash2, Trophy, Swords, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BetaBadge } from "./ui-beta";
import { format, formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  tournament_id?: string;
  match_id?: string;
  team_id?: string;
}

export const BetaNotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('beta-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "All notifications marked as read" });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      setNotifications([]);
      setUnreadCount(0);
      toast({ title: "All notifications cleared" });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('tournament')) return <Trophy className="w-4 h-4 text-[hsl(var(--beta-accent))]" />;
    if (type.includes('match')) return <Swords className="w-4 h-4 text-[hsl(var(--beta-warning))]" />;
    if (type.includes('team')) return <Users className="w-4 h-4 text-[hsl(var(--beta-secondary))]" />;
    return <Bell className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />;
  };

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.tournament_id) return `/beta/tournament/${notification.tournament_id}`;
    if (notification.match_id) return `/beta/match/${notification.match_id}`;
    return null;
  };

  if (!user) return null;

  return (
    <div className="relative notification-container">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-[var(--beta-radius-md)] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[hsl(var(--beta-error))] text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-border))] rounded-[var(--beta-radius-lg)] shadow-2xl z-50 overflow-hidden beta-animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-3))]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex gap-2 p-2 border-b border-[hsl(var(--beta-border))]">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]"
                >
                  <CheckCircle className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-error))] hover:text-[hsl(var(--beta-error))]"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[hsl(var(--beta-text-muted))] mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">No notifications yet</p>
                <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">
                  You'll see updates about tournaments and matches here
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={`p-3 border-b border-[hsl(var(--beta-border))] hover:bg-[hsl(var(--beta-surface-3))] transition-colors cursor-pointer ${
                      !notification.read ? 'bg-[hsl(var(--beta-accent)/0.05)]' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.read ? 'font-medium text-[hsl(var(--beta-text-primary))]' : 'text-[hsl(var(--beta-text-secondary))]'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[hsl(var(--beta-accent))]" />
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1 opacity-70">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link key={notification.id} to={link} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
