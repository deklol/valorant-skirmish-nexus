
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import NotificationItem from './NotificationItem';

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

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  unreadCount: number;
  defaultExpanded?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: (ids: string[]) => void;
}

const NotificationGroup = ({ 
  title, 
  notifications, 
  unreadCount, 
  defaultExpanded = true,
  onMarkRead,
  onMarkAllRead 
}: NotificationGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (notifications.length === 0) return null;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      onMarkAllRead(unreadIds);
    }
  };

  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <div className="p-3 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-0 text-left hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-medium text-white">{title}</span>
              <span className="text-xs text-slate-400">({notifications.length})</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </Button>
          
          {unreadCount > 0 && isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-300"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="divide-y divide-slate-700">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationGroup;
