
import { formatDistanceToNow } from 'date-fns';
import { Eye, X, Clock, Trophy, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_tournament_posted':
    case 'tournament_signups_open':
    case 'tournament_checkin_time':
    case 'tournament_complete':
      return <Trophy className="w-4 h-4 text-amber-500" />;
    case 'match_ready':
    case 'match_assigned':
    case 'match_complete':
    case 'post_results':
      return <Zap className="w-4 h-4 text-green-500" />;
    case 'team_assigned':
      return <Users className="w-4 h-4 text-blue-500" />;
    default:
      return <Clock className="w-4 h-4 text-slate-500" />;
  }
};

const getNotificationPriority = (type: string) => {
  const highPriority = ['match_ready', 'tournament_checkin_time', 'post_results'];
  const mediumPriority = ['match_assigned', 'team_assigned', 'tournament_complete'];
  
  if (highPriority.includes(type)) return 'high';
  if (mediumPriority.includes(type)) return 'medium';
  return 'low';
};

const NotificationItem = ({ notification, onMarkRead, onDismiss }: NotificationItemProps) => {
  const navigate = useNavigate();
  const priority = getNotificationPriority(notification.type);

  const handleNavigate = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }

    if (notification.match_id) {
      navigate(`/match/${notification.match_id}`);
    } else if (notification.tournament_id) {
      navigate(`/tournament/${notification.tournament_id}`);
    }
  };

  const getPriorityStyles = () => {
    switch (priority) {
      case 'high':
        return !notification.read 
          ? 'border-l-4 border-l-red-500 bg-red-950/20' 
          : 'border-l-4 border-l-red-500/50 bg-red-950/10';
      case 'medium':
        return !notification.read 
          ? 'border-l-4 border-l-amber-500 bg-amber-950/20' 
          : 'border-l-4 border-l-amber-500/50 bg-amber-950/10';
      default:
        return !notification.read 
          ? 'border-l-4 border-l-blue-500 bg-blue-950/20' 
          : 'border-l-4 border-l-blue-500/50 bg-blue-950/10';
    }
  };

  return (
    <div className={`p-3 transition-all duration-200 hover:bg-slate-700/50 ${getPriorityStyles()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate">
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          
          <p className="text-xs text-slate-300 mb-2 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              
              {priority === 'high' && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Urgent
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {(notification.match_id || notification.tournament_id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigate}
                  className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              )}
              
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead(notification.id)}
                  className="h-6 px-2 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-600/20"
                >
                  Mark Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
