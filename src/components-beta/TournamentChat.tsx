import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GlassCard, BetaButton, BetaBadge } from "./ui-beta";
import { Username } from "@/components/Username";
import { 
  MessageSquare, Send, MoreVertical, Trash2, Edit2, 
  AlertTriangle, Megaphone, X, Check, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  tournament_id: string;
  user_id: string;
  content: string;
  message_type: 'message' | 'announcement' | 'system';
  is_deleted: boolean;
  deleted_by: string | null;
  edited_at: string | null;
  created_at: string;
  user?: {
    id: string;
    discord_username: string;
    discord_avatar_url: string | null;
    role: string;
  };
}

interface TournamentChatProps {
  tournamentId: string;
  className?: string;
}

export const TournamentChat = ({ tournamentId, className = "" }: TournamentChatProps) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [warningUserId, setWarningUserId] = useState<string | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only scroll to bottom within the chat container, not the page
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current) {
      // Only auto-scroll on new messages (force=true), not initial load
      if (force) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    // First get messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('tournament_chat_messages')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return;
    }

    // Then get users for those messages
    const userIds = [...new Set((messagesData || []).map(m => m.user_id))];
    
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, discord_username, discord_avatar_url, role')
        .in('id', userIds);
      
      usersMap = (usersData || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {} as Record<string, any>);
    }

    // Combine messages with user data
    const messagesWithUsers = (messagesData || []).map(m => ({
      ...m,
      user: usersMap[m.user_id] || null
    })) as ChatMessage[];

    setMessages(messagesWithUsers);
    setLoading(false);
    // Don't auto-scroll on initial load to prevent page jumping
  }, [tournamentId]);

  // Setup realtime subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`tournament-chat:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_chat_messages',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchMessages();
          // Scroll on new messages
          setTimeout(() => scrollToBottom(true), 150);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchMessages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('tournament_chat_messages')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'message'
        });

      if (error) throw error;

      setNewMessage("");
      inputRef.current?.focus();
      // Scroll to latest message after sending
      setTimeout(() => scrollToBottom(true), 150);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Send announcement (admin only)
  const handleSendAnnouncement = async () => {
    if (!user || !isAdmin || !announcementText.trim()) return;

    try {
      const { error } = await supabase
        .from('tournament_chat_messages')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          content: announcementText.trim(),
          message_type: 'announcement'
        });

      if (error) throw error;

      setAnnouncementText("");
      setShowAnnouncementForm(false);
      toast({ title: "Announcement sent" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('tournament_chat_messages')
        .update({ 
          content: editContent.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setEditingId(null);
      setEditContent("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tournament_chat_messages')
        .update({ 
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setOpenMenuId(null);
      toast({ title: "Message deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Warn user
  const handleWarnUser = async () => {
    if (!warningUserId || !warningReason.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('user_chat_warnings')
        .insert({
          user_id: warningUserId,
          tournament_id: tournamentId,
          warned_by: user.id,
          reason: warningReason.trim()
        });

      if (error) throw error;

      // Also post a system message
      await supabase
        .from('tournament_chat_messages')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          content: `A user has been warned for: ${warningReason.trim()}`,
          message_type: 'system'
        });

      setWarningUserId(null);
      setWarningReason("");
      toast({ title: "Warning issued" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditContent(message.content);
    setOpenMenuId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // Always render the chat component - the login prompt is inside
  return (
    <GlassCard className={`flex flex-col ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-[hsl(var(--beta-border))] cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Tournament Chat</h3>
          <BetaBadge variant="default" size="sm">{messages.filter(m => !m.is_deleted).length}</BetaBadge>
        </div>
        <button className="p-1 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]">
          {isCollapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Admin Actions */}
          {isAdmin && (
            <div className="p-2 border-b border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-2))]">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]"
                >
                  <Megaphone className="w-3 h-3" />
                  Announcement
                </button>
              </div>
              
              {showAnnouncementForm && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type announcement..."
                    className="flex-1 px-3 py-1 text-sm rounded bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))]"
                  />
                  <button
                    onClick={handleSendAnnouncement}
                    disabled={!announcementText.trim()}
                    className="px-3 py-1 text-sm rounded bg-[hsl(var(--beta-success))] text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Warning Modal */}
          {warningUserId && (
            <div className="p-3 border-b border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-warning)/0.1)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--beta-warning))]" />
                <span className="text-sm font-medium text-[hsl(var(--beta-warning))]">Issue Warning</span>
                <button onClick={() => setWarningUserId(null)} className="ml-auto">
                  <X className="w-4 h-4 text-[hsl(var(--beta-text-muted))]" />
                </button>
              </div>
              <input
                type="text"
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="Reason for warning..."
                className="w-full px-3 py-2 text-sm rounded bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))]"
              />
              <button
                onClick={handleWarnUser}
                disabled={!warningReason.trim()}
                className="mt-2 px-3 py-1 text-sm rounded bg-[hsl(var(--beta-warning))] text-white disabled:opacity-50"
              >
                Send Warning
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] min-h-[200px]">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-[hsl(var(--beta-text-muted))]">Loading chat...</p>
              </div>
            ) : messages.filter(m => !m.is_deleted || isAdmin).length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
                <p className="text-[hsl(var(--beta-text-muted))]">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.filter(m => !m.is_deleted || isAdmin).map((message) => (
                <div
                  key={message.id}
                  className={`group relative ${
                    message.message_type === 'announcement' 
                      ? 'p-3 rounded-lg bg-[hsl(var(--beta-accent)/0.1)] border border-[hsl(var(--beta-accent)/0.3)]'
                      : message.message_type === 'system'
                      ? 'p-2 rounded-lg bg-[hsl(var(--beta-surface-3))] text-center'
                      : message.is_deleted
                      ? 'opacity-50'
                      : ''
                  }`}
                >
                  {message.message_type === 'announcement' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                      <span className="text-xs font-medium text-[hsl(var(--beta-accent))]">ANNOUNCEMENT</span>
                    </div>
                  )}
                  
                  {message.message_type === 'system' ? (
                    <p className="text-xs text-[hsl(var(--beta-text-muted))] italic">{message.content}</p>
                  ) : (
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {message.user?.discord_avatar_url ? (
                          <img src={message.user.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                            {message.user?.discord_username?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <Username 
                            userId={message.user?.id || ''} 
                            username={message.user?.discord_username || 'Unknown'} 
                          />
                          {message.user?.role === 'admin' && (
                            <BetaBadge variant="accent" size="sm">Admin</BetaBadge>
                          )}
                          <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {message.edited_at && (
                            <span className="text-xs text-[hsl(var(--beta-text-muted))] italic">(edited)</span>
                          )}
                          {message.is_deleted && isAdmin && (
                            <BetaBadge variant="error" size="sm">Deleted</BetaBadge>
                          )}
                        </div>

                        {/* Content */}
                        {editingId === message.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm rounded bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))]"
                              autoFocus
                            />
                            <button onClick={() => handleEditMessage(message.id)} className="text-[hsl(var(--beta-success))]">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="text-[hsl(var(--beta-text-muted))]">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[hsl(var(--beta-text-primary))] break-words">{message.content}</p>
                        )}
                      </div>

                      {/* Actions Menu */}
                      {!editingId && (user?.id === message.user_id || isAdmin) && !message.is_deleted && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === message.id ? null : message.id)}
                            className="p-1 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {openMenuId === message.id && (
                            <div className="absolute right-0 top-6 z-10 bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg shadow-lg py-1 min-w-[140px]">
                              {user?.id === message.user_id && (
                                <button
                                  onClick={() => startEdit(message)}
                                  className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-text-primary))]"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-error))]"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                              {isAdmin && user?.id !== message.user_id && (
                                <button
                                  onClick={() => { setWarningUserId(message.user_id); setOpenMenuId(null); }}
                                  className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-warning))]"
                                >
                                  <AlertTriangle className="w-3 h-3" /> Warn User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {user ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[hsl(var(--beta-border))]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-xl bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
                  disabled={sending}
                />
                <BetaButton type="submit" disabled={!newMessage.trim() || sending}>
                  <Send className="w-4 h-4" />
                </BetaButton>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t border-[hsl(var(--beta-border))] text-center">
              <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                <a href="/login" className="text-[hsl(var(--beta-accent))] hover:underline">Login</a> to join the chat
              </p>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
};

export default TournamentChat;
