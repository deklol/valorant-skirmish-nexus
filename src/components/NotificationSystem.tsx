
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let channel: any = null;

    const setupRealtimeSubscription = () => {
      // Create a unique channel name to avoid conflicts
      const channelName = `notifications_${user.id}_${Date.now()}`;
      
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_signups',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification update:', payload);
            // Handle notification updates here
          }
        );

      // Only subscribe if not already subscribed
      if (channel.state !== 'subscribed' && channel.state !== 'subscribing') {
        channel.subscribe((status: string) => {
          console.log('Notification channel status:', status);
        });
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  return (
    <Button variant="ghost" className="relative text-slate-300 hover:text-white">
      <Bell className="h-5 w-5" />
      {notifications.length > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {notifications.length}
        </Badge>
      )}
    </Button>
  );
};

export default NotificationSystem;
