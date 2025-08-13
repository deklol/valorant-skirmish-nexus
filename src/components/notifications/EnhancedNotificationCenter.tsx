
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationGroup from './NotificationGroup';

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

const EnhancedNotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('enhanced-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time notification:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markMultipleAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const clearAllRead = async () => {
    if (!user) return;

    try {
      // First get all read notification IDs
      const { data: readNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', true);

      if (fetchError) throw fetchError;

      if (readNotifications && readNotifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('read', true);

        if (error) throw error;

        // Update local state immediately
        setNotifications(prev => prev.filter(n => !n.read));
        
        toast({
          title: "Success",
          description: `${readNotifications.length} read notifications cleared`,
        });
      } else {
        toast({
          title: "Info",
          description: "No read notifications to clear",
        });
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const clearAll = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);

      toast({ title: 'Success', description: 'All notifications cleared' });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({ title: 'Error', description: 'Failed to clear all notifications', variant: 'destructive' });
    }
  };

  const groupNotifications = () => {
    const groups = {
      tournaments: notifications.filter(n => 
        ['new_tournament_posted', 'tournament_signups_open', 'tournament_checkin_time', 'tournament_complete', 'tournament_started'].includes(n.type)
      ),
      matches: notifications.filter(n => 
        ['match_ready', 'match_assigned', 'match_complete', 'post_results', 'match_started', 'map_veto_ready'].includes(n.type)
      ),
      teams: notifications.filter(n => 
        ['team_assigned'].includes(n.type)
      ),
      other: notifications.filter(n => 
        !['new_tournament_posted', 'tournament_signups_open', 'tournament_checkin_time', 'tournament_complete', 'tournament_started',
          'match_ready', 'match_assigned', 'match_complete', 'post_results', 'match_started', 'map_veto_ready', 'team_assigned'].includes(n.type)
      )
    };

    return [
      { key: 'tournaments', title: 'Tournaments', notifications: groups.tournaments },
      { key: 'matches', title: 'Matches', notifications: groups.matches },
      { key: 'teams', title: 'Teams', notifications: groups.teams },
      { key: 'other', title: 'Other', notifications: groups.other }
    ].filter(group => group.notifications.length > 0);
  };

  if (!user) return null;

  const groupedNotifications = groupNotifications();
  const readCount = notifications.filter(n => n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative text-slate-300 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-96 p-0 bg-slate-900 border border-slate-700 shadow-xl"
        sideOffset={5}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings/notifications')}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {unreadCount > 0 ? (
                <span>{unreadCount} unread of {notifications.length}</span>
              ) : (
                <span>All caught up! ({notifications.length} total)</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-6 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-900/20"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
              
              {readCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllRead}
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="animate-pulse">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">You'll see updates about tournaments and matches here</p>
            </div>
          ) : (
            <div>
              {groupedNotifications.map((group) => (
                <NotificationGroup
                  key={group.key}
                  title={group.title}
                  notifications={group.notifications}
                  unreadCount={group.notifications.filter(n => !n.read).length}
                  onMarkRead={markAsRead}
                  onMarkAllRead={markMultipleAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnhancedNotificationCenter;
