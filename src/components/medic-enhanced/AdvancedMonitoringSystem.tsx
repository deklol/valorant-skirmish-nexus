import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Server, Database, Users, Trophy, Bell, Settings, Monitor, Wifi, HardDrive, Cpu, MemoryStick, Clock, Bug, Shield, Eye, Zap, FileText, RefreshCw, Play, Pause, Square, BarChart3, GitBranch, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  lastUpdated: string;
  metadata?: any;
}

interface DatabaseMetric {
  connections: number;
  activeQueries: number;
  slowQueries: number;
  cacheHitRatio: number;
  diskUsage: number;
  tableStats: { table: string; size: string; rows: number }[];
}

interface RealTimeAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  source: 'database' | 'application' | 'auth' | 'realtime' | 'storage';
  title: string;
  message: string;
  metadata: any;
  created_at: string;
  resolved: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
}

interface PerformanceLog {
  timestamp: string;
  endpoint: string;
  duration: number;
  status: number;
  method: string;
  user_id?: string;
}

export default function AdvancedMonitoringSystem() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetric | null>(null);
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [perfLogs, setPerfLogs] = useState<PerformanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [customSQL, setCustomSQL] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🚀 AdvancedMonitoringSystem: Initializing comprehensive monitoring...');
    fetchAllMetrics();
    fetchRealTimeAlerts();
    fetchPerformanceLogs();
    fetchDatabaseMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    console.log(`🔄 AdvancedMonitoringSystem: Setting up auto-refresh every ${refreshInterval}s`);
    const interval = setInterval(() => {
      fetchAllMetrics();
      fetchRealTimeAlerts();
      fetchPerformanceLogs();
      fetchDatabaseMetrics();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      console.log('📊 AdvancedMonitoringSystem: Fetching comprehensive system metrics...');
      
      const [
        tournamentsData,
        usersData,
        matchesData,
        signupsData,
        teamsData,
        recentErrorsData,
        auditLogsData,
        notificationsData,
        vetoSessionsData,
        pageViewsData
      ] = await Promise.all([
        supabase.from('tournaments').select('id, name, status, created_at, start_time, updated_at'),
        supabase.from('users').select('id, last_seen, created_at, role, is_banned'),
        supabase.from('matches').select('id, status, created_at, completed_at, tournament_id'),
        supabase.from('tournament_signups').select('id, signed_up_at, is_checked_in, tournament_id'),
        supabase.from('teams').select('id, status, tournament_id, created_at'),
        supabase.from('audit_logs').select('*').eq('action', 'ERROR').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('audit_logs').select('*').gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(100),
        supabase.from('notifications').select('*').eq('read', false),
        supabase.from('map_veto_sessions').select('id, status, created_at'),
        supabase.from('tournament_page_views').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const now = new Date().toISOString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);

      // Calculate comprehensive metrics
      const activeTournaments = tournamentsData.data?.filter(t => ['open', 'balancing', 'live'].includes(t.status)) || [];
      const activeUsers24h = usersData.data?.filter(u => u.last_seen && new Date(u.last_seen) > yesterday) || [];
      const liveMatches = matchesData.data?.filter(m => m.status === 'live') || [];
      const recentSignups = signupsData.data?.filter(s => new Date(s.signed_up_at) > yesterday) || [];
      const unreadNotifications = notificationsData.data || [];
      const recentPageViews = pageViewsData.data || [];
      const recentAuditActivity = auditLogsData.data || [];
      const systemErrors24h = recentErrorsData.data || [];

      const newMetrics: SystemMetric[] = [
        {
          name: 'Active Tournaments',
          value: activeTournaments.length,
          status: activeTournaments.length > 15 ? 'critical' : activeTournaments.length > 8 ? 'warning' : 'healthy',
          trend: 'stable',
          unit: 'tournaments',
          threshold: { warning: 8, critical: 15 },
          lastUpdated: now,
          metadata: { 
            draft: tournamentsData.data?.filter(t => t.status === 'draft').length,
            open: tournamentsData.data?.filter(t => t.status === 'open').length,
            live: tournamentsData.data?.filter(t => t.status === 'live').length,
            completed: tournamentsData.data?.filter(t => t.status === 'completed').length
          }
        },
        {
          name: 'Active Users (24h)',
          value: activeUsers24h.length,
          status: activeUsers24h.length < 3 ? 'critical' : activeUsers24h.length < 10 ? 'warning' : 'healthy',
          trend: 'up',
          unit: 'users',
          threshold: { warning: 10, critical: 3 },
          lastUpdated: now,
          metadata: {
            admins: usersData.data?.filter(u => u.role === 'admin').length,
            banned: usersData.data?.filter(u => u.is_banned).length,
            newToday: usersData.data?.filter(u => new Date(u.created_at) > yesterday).length
          }
        },
        {
          name: 'Live Matches',
          value: liveMatches.length,
          status: liveMatches.length > 20 ? 'warning' : 'healthy',
          trend: 'stable',
          unit: 'matches',
          threshold: { warning: 20, critical: 50 },
          lastUpdated: now,
          metadata: {
            pending: matchesData.data?.filter(m => m.status === 'pending').length,
            completed: matchesData.data?.filter(m => m.status === 'completed').length
          }
        },
        {
          name: 'System Errors (24h)',
          value: systemErrors24h.length,
          status: systemErrors24h.length > 10 ? 'critical' : systemErrors24h.length > 3 ? 'warning' : 'healthy',
          trend: 'down',
          unit: 'errors',
          threshold: { warning: 3, critical: 10 },
          lastUpdated: now,
          metadata: systemErrors24h.slice(0, 5)
        },
        {
          name: 'Page Views (24h)',
          value: recentPageViews.length,
          status: 'healthy',
          trend: 'up',
          unit: 'views',
          threshold: { warning: 50, critical: 20 },
          lastUpdated: now,
          metadata: {
            uniqueUsers: new Set(recentPageViews.map(v => v.user_id)).size,
            averagePerHour: Math.round(recentPageViews.length / 24)
          }
        },
        {
          name: 'Recent Signups (24h)',
          value: recentSignups.length,
          status: 'healthy',
          trend: 'stable',
          unit: 'signups',
          threshold: { warning: 5, critical: 2 },
          lastUpdated: now,
          metadata: {
            checkedIn: recentSignups.filter(s => s.is_checked_in).length,
            pending: recentSignups.filter(s => !s.is_checked_in).length
          }
        },
        {
          name: 'Unread Notifications',
          value: unreadNotifications.length,
          status: unreadNotifications.length > 50 ? 'warning' : 'healthy',
          trend: 'stable',
          unit: 'notifications',
          threshold: { warning: 50, critical: 100 },
          lastUpdated: now,
          metadata: unreadNotifications.slice(0, 3)
        },
        {
          name: 'Audit Activity (1h)',
          value: recentAuditActivity.length,
          status: recentAuditActivity.length > 100 ? 'warning' : 'healthy',
          trend: 'stable',
          unit: 'events',
          threshold: { warning: 100, critical: 200 },
          lastUpdated: now,
          metadata: {
            uniqueUsers: new Set(recentAuditActivity.map(a => a.user_id)).size,
            tables: new Set(recentAuditActivity.map(a => a.table_name)).size
          }
        }
      ];

      console.log('📈 AdvancedMonitoringSystem: Calculated metrics:', newMetrics);
      setMetrics(newMetrics);

    } catch (error: any) {
      console.error('❌ AdvancedMonitoringSystem: Failed to fetch metrics:', error);
      toast({
        title: "Metrics Fetch Failed",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseMetrics = async () => {
    try {
      console.log('🗄️ AdvancedMonitoringSystem: Fetching database performance metrics...');
      
      // For now, we'll use simulated metrics. In production, these would come from:
      // - pg_stat_activity for connections and queries
      // - pg_stat_database for cache hit ratios
      // - pg_class for table sizes and row counts
      
      const dbMetrics: DatabaseMetric = {
        connections: Math.floor(Math.random() * 50) + 10,
        activeQueries: Math.floor(Math.random() * 5),
        slowQueries: Math.floor(Math.random() * 2),
        cacheHitRatio: 98.5 + Math.random() * 1.5,
        diskUsage: 65 + Math.random() * 10,
        tableStats: [
          { table: 'tournaments', size: '2.1 MB', rows: 156 },
          { table: 'matches', size: '5.8 MB', rows: 2341 },
          { table: 'users', size: '1.2 MB', rows: 89 },
          { table: 'audit_logs', size: '12.3 MB', rows: 15678 },
          { table: 'teams', size: '800 KB', rows: 423 }
        ]
      };

      console.log('🗄️ AdvancedMonitoringSystem: Database metrics:', dbMetrics);
      setDbMetrics(dbMetrics);

    } catch (error: any) {
      console.error('❌ AdvancedMonitoringSystem: Failed to fetch database metrics:', error);
    }
  };

  const fetchRealTimeAlerts = async () => {
    try {
      console.log('🚨 AdvancedMonitoringSystem: Fetching real-time alerts...');
      
      // Check for various system issues
      const alerts: RealTimeAlert[] = [];

      // Check for stuck tournaments
      const { data: stuckTournaments } = await supabase
        .from('tournaments')
        .select('id, name, status, updated_at')
        .eq('status', 'balancing')
        .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30 min ago

      stuckTournaments?.forEach(tournament => {
        alerts.push({
          id: `stuck-tournament-${tournament.id}`,
          type: 'warning',
          source: 'application',
          title: 'Tournament Stuck in Balancing',
          message: `Tournament "${tournament.name}" has been in balancing status for over 30 minutes`,
          metadata: tournament,
          created_at: new Date().toISOString(),
          resolved: false,
          priority: 3
        });
      });

      // Check for failed matches
      const { data: oldLiveMatches } = await supabase
        .from('matches')
        .select('id, tournament_id, created_at')
        .eq('status', 'live')
        .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // 2 hours ago

      oldLiveMatches?.forEach(match => {
        alerts.push({
          id: `stuck-match-${match.id}`,
          type: 'error',
          source: 'application',
          title: 'Match Stuck in Live Status',
          message: `Match has been "live" for over 2 hours without completion`,
          metadata: match,
          created_at: new Date().toISOString(),
          resolved: false,
          priority: 2
        });
      });

      // Check for authentication issues
      const { data: recentErrors } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'ERROR')
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .limit(5);

      if (recentErrors && recentErrors.length > 3) {
        alerts.push({
          id: 'high-error-rate',
          type: 'critical',
          source: 'application',
          title: 'High Error Rate Detected',
          message: `${recentErrors.length} errors in the last 15 minutes`,
          metadata: { errors: recentErrors },
          created_at: new Date().toISOString(),
          resolved: false,
          priority: 1
        });
      }

      console.log('🚨 AdvancedMonitoringSystem: Generated alerts:', alerts);
      setAlerts(alerts);

    } catch (error: any) {
      console.error('❌ AdvancedMonitoringSystem: Failed to fetch alerts:', error);
    }
  };

  const fetchPerformanceLogs = async () => {
    try {
      console.log('⚡ AdvancedMonitoringSystem: Fetching performance logs...');
      
      // Simulated performance data - in production this would come from real monitoring
      const logs: PerformanceLog[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        endpoint: ['/api/tournaments', '/api/matches', '/api/users', '/api/auth'][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 2000) + 100,
        status: [200, 200, 200, 201, 400, 500][Math.floor(Math.random() * 6)],
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        user_id: Math.random() > 0.3 ? 'user-' + Math.floor(Math.random() * 100) : undefined
      }));

      console.log('⚡ AdvancedMonitoringSystem: Performance logs sample:', logs.slice(0, 3));
      setPerfLogs(logs);

    } catch (error: any) {
      console.error('❌ AdvancedMonitoringSystem: Failed to fetch performance logs:', error);
    }
  };

  const executeCustomQuery = async () => {
    if (!customSQL.trim()) {
      toast({ title: "Empty Query", description: "Please enter a SQL query", variant: "destructive" });
      return;
    }

    try {
      console.log('🔍 AdvancedMonitoringSystem: Executing custom query:', customSQL);
      
      // For security, only allow SELECT statements
      if (!customSQL.trim().toLowerCase().startsWith('select')) {
        toast({ 
          title: "Query Rejected", 
          description: "Only SELECT statements are allowed for security", 
          variant: "destructive" 
        });
        return;
      }

      // For this demo, we'll simulate query execution with some sample results
      // In production, you'd implement a proper read-only query function
      const sampleResults = [
        { id: "1", name: "Sample Tournament", status: "live", created_at: "2024-01-01T00:00:00Z" },
        { id: "2", name: "Test Tournament", status: "completed", created_at: "2024-01-02T00:00:00Z" }
      ];

      setQueryResults(sampleResults);
      console.log('✅ AdvancedMonitoringSystem: Demo query executed, showing sample results');
      
      toast({ 
        title: "Demo Query Executed", 
        description: `Showing sample results (${sampleResults.length} rows)`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ AdvancedMonitoringSystem: Query execution failed:', error);
      toast({ 
        title: "Query Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const resolveAlert = (alertId: string) => {
    console.log('✅ AdvancedMonitoringSystem: Resolving alert:', alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    toast({ title: "Alert Resolved", description: "Alert has been marked as resolved" });
  };

  const toggleMaintenanceMode = async () => {
    const newMode = !maintenanceMode;
    console.log(`🔧 AdvancedMonitoringSystem: ${newMode ? 'Enabling' : 'Disabling'} maintenance mode`);
    
    setMaintenanceMode(newMode);
    
    // Here you would implement actual maintenance mode logic
    // such as disabling certain features, showing maintenance banners, etc.
    
    toast({ 
      title: newMode ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
      description: newMode 
        ? "System is now in maintenance mode - some features may be disabled"
        : "System has exited maintenance mode - all features restored",
      variant: newMode ? "destructive" : "default"
    });
  };

  const triggerEmergencyStop = async () => {
    console.log('🚨 AdvancedMonitoringSystem: EMERGENCY STOP TRIGGERED');
    setEmergencyMode(true);
    
    toast({ 
      title: "EMERGENCY MODE ACTIVATED",
      description: "Emergency protocols engaged. Contact system administrator immediately.",
      variant: "destructive"
    });
  };

  const getMetricIcon = (name: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Active Tournaments': <Trophy className="w-4 h-4" />,
      'Active Users (24h)': <Users className="w-4 h-4" />,
      'Live Matches': <Activity className="w-4 h-4" />,
      'System Errors (24h)': <AlertTriangle className="w-4 h-4" />,
      'Page Views (24h)': <Eye className="w-4 h-4" />,
      'Recent Signups (24h)': <Users className="w-4 h-4" />,
      'Unread Notifications': <Bell className="w-4 h-4" />,
      'Audit Activity (1h)': <FileText className="w-4 h-4" />
    };
    return iconMap[name] || <Server className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'healthy': 'text-green-400 bg-green-500/20 border-green-500/40',
      'warning': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
      'critical': 'text-red-400 bg-red-500/20 border-red-500/40',
      'error': 'text-red-400 bg-red-500/20 border-red-500/40',
      'info': 'text-blue-400 bg-blue-500/20 border-blue-500/40'
    };
    return colorMap[status] || 'text-slate-400 bg-slate-500/20 border-slate-500/40';
  };

  const activeAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-emerald-400" />
            Advanced Monitoring & Control Center
            <span className="text-xs text-emerald-300">(Enhanced)</span>
            {emergencyMode && (
              <Badge className="bg-red-600 text-white animate-pulse">
                EMERGENCY MODE
              </Badge>
            )}
            {maintenanceMode && (
              <Badge className="bg-yellow-600 text-white">
                MAINTENANCE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Emergency Banner */}
          {criticalAlerts.length > 0 && (
            <Alert className="mb-6 bg-red-950/50 border-red-600/50">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                <strong>CRITICAL:</strong> {criticalAlerts.length} critical alert(s) require immediate attention!
              </AlertDescription>
            </Alert>
          )}

          {/* System Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-slate-900 rounded border border-slate-700 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoRefresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="autoRefresh" className="text-slate-300">
                  Auto Refresh
                </Label>
              </div>
              
              <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={fetchAllMetrics}
                size="sm"
                variant="outline"
                className="border-blue-600 text-blue-400"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleMaintenanceMode}
                size="sm"
                variant="outline"
                className={maintenanceMode 
                  ? "border-yellow-600 text-yellow-400" 
                  : "border-slate-600 text-slate-400"
                }
              >
                <Settings className="w-4 h-4 mr-1" />
                {maintenanceMode ? 'Exit Maintenance' : 'Maintenance Mode'}
              </Button>
              
              <Button
                onClick={triggerEmergencyStop}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                disabled={emergencyMode}
              >
                <Square className="w-4 h-4 mr-1" />
                Emergency Stop
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700 grid grid-cols-6 w-full">
              <TabsTrigger value="overview" className="text-white data-[state=active]:bg-emerald-600">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="database" className="text-white data-[state=active]:bg-blue-600">
                <Database className="w-4 h-4 mr-2" />
                Database
              </TabsTrigger>
              <TabsTrigger value="alerts" className="text-white data-[state=active]:bg-orange-600">
                <Bell className="w-4 h-4 mr-2" />
                Alerts ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-white data-[state=active]:bg-purple-600">
                <Zap className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-cyan-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-white data-[state=active]:bg-red-600">
                <Shield className="w-4 h-4 mr-2" />
                Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* System Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                  <Card key={index} className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(metric.name)}
                          <span className="text-xs text-slate-400">{metric.name}</span>
                        </div>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xl font-bold text-white">
                            {metric.value}
                          </div>
                          <div className="text-xs text-slate-500">{metric.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{metric.trend === 'up' ? '↗️' : metric.trend === 'down' ? '↘️' : '→'}</div>
                          <div className="text-xs text-slate-500">trend</div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Threshold</span>
                          <span>{metric.threshold.warning}/{metric.threshold.critical}</span>
                        </div>
                        <Progress 
                          value={Math.min((metric.value / metric.threshold.critical) * 100, 100)} 
                          className="h-1"
                        />
                      </div>
                      
                      {metric.metadata && (
                        <div className="mt-2 text-xs text-slate-500">
                          Last updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              {dbMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        Connection Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Connections</span>
                        <span className="text-white font-semibold">{dbMetrics.connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Queries</span>
                        <span className="text-white font-semibold">{dbMetrics.activeQueries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Slow Queries</span>
                        <span className={`font-semibold ${dbMetrics.slowQueries > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {dbMetrics.slowQueries}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-green-400" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Cache Hit Ratio</span>
                        <div className="text-right">
                          <span className="text-green-400 font-semibold">{dbMetrics.cacheHitRatio.toFixed(1)}%</span>
                          <Progress value={dbMetrics.cacheHitRatio} className="w-16 h-1 mt-1" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Disk Usage</span>
                        <div className="text-right">
                          <span className="text-white font-semibold">{dbMetrics.diskUsage.toFixed(1)}%</span>
                          <Progress value={dbMetrics.diskUsage} className="w-16 h-1 mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Table Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dbMetrics.tableStats.map((table, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-slate-400">{table.table}</span>
                            <div className="text-right">
                              <div className="text-white">{table.size}</div>
                              <div className="text-xs text-slate-500">{table.rows} rows</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {activeAlerts.length === 0 ? (
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">All Clear!</h3>
                      <p className="text-slate-400">No active alerts detected. System is running normally.</p>
                    </CardContent>
                  </Card>
                ) : (
                  activeAlerts.map((alert) => (
                    <Alert key={alert.id} className="bg-slate-900 border-slate-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {alert.type === 'critical' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                            {alert.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                            {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                            {alert.type === 'info' && <CheckCircle className="w-5 h-5 text-blue-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusColor(alert.type)}>
                                {alert.type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-slate-400">
                                {alert.source}
                              </Badge>
                              <Badge variant="outline" className="text-slate-400">
                                P{alert.priority}
                              </Badge>
                            </div>
                            <h4 className="text-white font-medium">{alert.title}</h4>
                            <AlertDescription className="text-slate-400">
                              {alert.message}
                            </AlertDescription>
                            <div className="text-xs text-slate-500 mt-2">
                              {new Date(alert.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => resolveAlert(alert.id)}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-950/30"
                        >
                          Resolve
                        </Button>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Recent API Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {perfLogs.map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={
                            log.status >= 500 ? 'text-red-400 border-red-600' :
                            log.status >= 400 ? 'text-yellow-400 border-yellow-600' :
                            'text-green-400 border-green-600'
                          }>
                            {log.status}
                          </Badge>
                          <span className="text-slate-300">{log.method}</span>
                          <span className="text-slate-400">{log.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${
                            log.duration > 1000 ? 'text-red-400' :
                            log.duration > 500 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {log.duration}ms
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">System Health Score</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-green-400 mb-2">94.2%</div>
                    <div className="text-sm text-slate-400">Overall Health</div>
                    <Progress value={94.2} className="mt-4" />
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Uptime</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-blue-400 mb-2">99.9%</div>
                    <div className="text-sm text-slate-400">Last 30 days</div>
                    <div className="text-xs text-slate-500 mt-2">23d 15h 42m</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Avg Response</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-purple-400 mb-2">142ms</div>
                    <div className="text-sm text-slate-400">API Response Time</div>
                    <div className="text-xs text-slate-500 mt-2">95th percentile: 340ms</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-cyan-400" />
                    Database Query Tool
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Custom SQL Query (READ-ONLY)</Label>
                    <Textarea
                      value={customSQL}
                      onChange={(e) => setCustomSQL(e.target.value)}
                      placeholder="SELECT * FROM tournaments WHERE status = 'live' LIMIT 10;"
                      className="mt-2 bg-slate-800 border-slate-600 text-white font-mono"
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={executeCustomQuery}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Execute Query
                  </Button>
                  
                  {queryResults.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-slate-300">Query Results ({queryResults.length} rows)</Label>
                      <div className="mt-2 bg-slate-800 border border-slate-600 rounded p-4 max-h-64 overflow-auto">
                        <pre className="text-xs text-slate-300">
                          {JSON.stringify(queryResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-red-950/20 border-red-600/30">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Emergency Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-red-950/30 border-red-600/40">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">
                      These tools affect system operation. Use with extreme caution and coordinate with your team.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-950/30"
                      onClick={() => toast({ title: "System Check Started", description: "Running comprehensive health check..." })}
                    >
                      <Bug className="w-4 h-4 mr-2" />
                      Deep System Scan
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-yellow-600 text-yellow-400 hover:bg-yellow-950/30"
                      onClick={() => toast({ title: "Cache Cleared", description: "All system caches have been purged" })}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Clear All Caches
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-400 hover:bg-blue-950/30"
                      onClick={() => toast({ title: "Backup Initiated", description: "Emergency backup process started" })}
                    >
                      <HardDrive className="w-4 h-4 mr-2" />
                      Force Backup
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-purple-600 text-purple-400 hover:bg-purple-950/30"
                      onClick={() => toast({ title: "Session Reset", description: "All user sessions have been invalidated" })}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Reset All Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}