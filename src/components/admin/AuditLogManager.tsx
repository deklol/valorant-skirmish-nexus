
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, RefreshCw, ExternalLink, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface AuditLogEntry {
  id: string;
  table_name: string;
  action: string;
  record_id: string;
  user_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
  map_display_name?: string;
}

const AuditLogManager = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 50;

  const fetchAuditLogs = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE - 1);

      // Apply filters
      if (tableFilter !== "all") {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }
      if (searchQuery) {
        query = query.or(`record_id.ilike.%${searchQuery}%,new_values->>description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch audit logs",
          variant: "destructive"
        });
        return;
      }

      if (reset || pageNum === 1) {
        setLogs(data || []);
      } else {
        setLogs(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error in fetchAuditLogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1, true);
    setPage(1);
  }, [searchQuery, tableFilter, actionFilter]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('New audit log entry:', payload.new);
          setLogs(prev => [payload.new as AuditLogEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAuditLogs(nextPage, false);
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'signup':
      case 'checkin':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'update':
        return <Info className="w-4 h-4 text-blue-400" />;
      case 'delete':
      case 'withdraw':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'signup':
      case 'checkin':
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case 'update':
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case 'delete':
      case 'withdraw':
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case 'error':
        return "bg-red-600/20 text-red-500 border-red-600/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getSmartLink = (log: AuditLogEntry) => {
    const { table_name, record_id, action } = log;
    
    switch (table_name) {
      case 'tournaments':
        return `/tournament/${record_id}`;
      case 'matches':
        return `/match/${record_id}`;
      case 'users':
        return `/profile/${record_id}`;
      case 'teams':
        // Teams don't have dedicated pages, link to tournament if available
        const tournamentId = log.new_values?.tournament_id || log.old_values?.tournament_id;
        return tournamentId ? `/tournament/${tournamentId}?tab=teams` : null;
      case 'tournament_signups':
        const signupTournamentId = log.new_values?.tournament_id || log.old_values?.tournament_id;
        return signupTournamentId ? `/tournament/${signupTournamentId}?tab=participants` : null;
      case 'map_veto_sessions':
      case 'map_veto_actions':
        const matchId = log.new_values?.match_id || log.old_values?.match_id;
        return matchId ? `/match/${matchId}` : null;
      default:
        return null;
    }
  };

  const formatDescription = (log: AuditLogEntry) => {
    // Try to get description from new_values first
    const description = log.new_values?.description;
    if (description) return description;

    // Fallback to generic description
    const tableName = log.table_name.replace('_', ' ');
    return `${log.action} in ${tableName}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getUserInfo = (log: AuditLogEntry) => {
    const userInfo = log.new_values?.user_info;
    if (userInfo) {
      return userInfo.discord_username || userInfo.id || 'Unknown';
    }
    return log.user_id ? log.user_id.slice(0, 8) : 'System';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Audit Log - Platform Activity Monitor
          </CardTitle>
          <p className="text-slate-400">
            Real-time monitoring of all platform activities, changes, and errors
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="tournaments">Tournaments</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
                <SelectItem value="matches">Matches</SelectItem>
                <SelectItem value="tournament_signups">Signups</SelectItem>
                <SelectItem value="map_veto_sessions">Map Veto</SelectItem>
                <SelectItem value="application_errors">Errors</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="SIGNUP">Signup</SelectItem>
                <SelectItem value="CHECKIN">Check-in</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => fetchAuditLogs(1, true)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Audit Log Table */}
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Time</TableHead>
                  <TableHead className="text-slate-300">Action</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-slate-300">User</TableHead>
                  <TableHead className="text-slate-300">Table</TableHead>
                  <TableHead className="text-slate-300">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-slate-700 hover:bg-slate-750">
                    <TableCell className="text-slate-300 text-sm font-mono">
                      {formatTimestamp(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 max-w-md">
                      <div className="truncate" title={formatDescription(log)}>
                        {formatDescription(log)}
                      </div>
                      {log.map_display_name && (
                        <div className="text-xs text-slate-500 mt-1">
                          Map: {log.map_display_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {getUserInfo(log)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        {log.table_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getSmartLink(log) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(getSmartLink(log)!)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      No audit logs found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Load More */}
          {hasMore && logs.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={loadMore}
                disabled={loading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Activity Indicator */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Live activity monitoring enabled - New entries will appear automatically
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogManager;
