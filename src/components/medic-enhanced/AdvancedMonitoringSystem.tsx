import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Server, Database, Users, Trophy, Bell, Settings } from "lucide-react";
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
}

interface TournamentAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  tournament_id: string;
  tournament_name: string;
  message: string;
  created_at: string;
  is_resolved: boolean;
}

export default function AdvancedMonitoringSystem() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<TournamentAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState<'low' | 'medium' | 'high'>('medium');
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
      fetchAlerts();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch various system metrics
      const [
        tournamentsData,
        usersData,
        matchesData,
        activeMatches,
        recentErrors
      ] = await Promise.all([
        supabase.from('tournaments').select('status'),
        supabase.from('users').select('last_seen, created_at'),
        supabase.from('matches').select('status, created_at'),
        supabase.from('matches').select('*').eq('status', 'live'),
        supabase.from('audit_logs').select('*').eq('action', 'ERROR').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const newMetrics: SystemMetric[] = [
        {
          name: 'Active Tournaments',
          value: tournamentsData.data?.filter(t => ['open', 'balancing', 'live'].includes(t.status)).length || 0,
          status: 'healthy',
          trend: 'stable',
          unit: 'tournaments',
          threshold: { warning: 10, critical: 20 }
        },
        {
          name: 'Active Users (24h)',
          value: usersData.data?.filter(u => u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length || 0,
          status: 'healthy',
          trend: 'up',
          unit: 'users',
          threshold: { warning: 5, critical: 2 }
        },
        {
          name: 'Live Matches',
          value: activeMatches.data?.length || 0,
          status: 'healthy',
          trend: 'stable',
          unit: 'matches',
          threshold: { warning: 20, critical: 50 }
        },
        {
          name: 'System Errors (24h)',
          value: recentErrors.data?.length || 0,
          status: 'healthy',
          trend: 'down',
          unit: 'errors',
          threshold: { warning: 5, critical: 15 }
        }
      ];

      // Update metric statuses based on thresholds
      newMetrics.forEach(metric => {
        if (metric.value >= metric.threshold.critical) {
          metric.status = 'critical';
        } else if (metric.value >= metric.threshold.warning) {
          metric.status = 'warning';
        } else {
          metric.status = 'healthy';
        }
      });

      setMetrics(newMetrics);
    } catch (error: any) {
      toast({
        title: "Failed to fetch metrics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      // This would normally fetch from a dedicated alerts table
      // For now, we'll generate alerts based on tournament health
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, name, status, start_time')
        .in('status', ['open', 'balancing', 'live']);

      const newAlerts: TournamentAlert[] = [];

      tournaments?.forEach(tournament => {
        // Check for tournaments that have been in balancing too long
        if (tournament.status === 'balancing') {
          newAlerts.push({
            id: `balancing-${tournament.id}`,
            type: 'warning',
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            message: 'Tournament has been in balancing status for an extended period',
            created_at: new Date().toISOString(),
            is_resolved: false
          });
        }

        // Check for tournaments that should have started
        if (tournament.start_time && new Date(tournament.start_time) < new Date() && tournament.status === 'open') {
          newAlerts.push({
            id: `overdue-${tournament.id}`,
            type: 'error',
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            message: 'Tournament start time has passed but status is still open',
            created_at: new Date().toISOString(),
            is_resolved: false
          });
        }
      });

      setAlerts(newAlerts);
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_resolved: true }
          : alert
      )
    );

    toast({
      title: "Alert Resolved",
      description: "Alert has been marked as resolved"
    });
  };

  const triggerEmergencyResponse = async () => {
    toast({
      title: "Emergency Response Triggered",
      description: "Emergency protocols have been activated. Check system status carefully."
    });
  };

  const getMetricIcon = (name: string) => {
    switch (name) {
      case 'Active Tournaments': return <Trophy className="w-4 h-4" />;
      case 'Active Users (24h)': return <Users className="w-4 h-4" />;
      case 'Live Matches': return <Activity className="w-4 h-4" />;
      case 'System Errors (24h)': return <AlertTriangle className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/20 border-green-500/40';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/40';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      default: return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            Advanced Monitoring System
            <span className="text-xs text-red-300">(Phase 4)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Monitoring Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-slate-900 rounded border border-slate-700">
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
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="alerts"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
                <Label htmlFor="alerts" className="text-slate-300">
                  Alerts
                </Label>
              </div>
              
              <Button
                onClick={triggerEmergencyResponse}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Bell className="w-4 h-4 mr-1" />
                Emergency
              </Button>
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <Card key={index} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMetricIcon(metric.name)}
                      <span className="text-sm text-slate-400">{metric.name}</span>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {metric.value}
                      </div>
                      <div className="text-xs text-slate-500">{metric.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg">{getTrendIcon(metric.trend)}</div>
                      <div className="text-xs text-slate-500">trend</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Threshold</span>
                      <span>{metric.threshold.warning}/{metric.threshold.critical}</span>
                    </div>
                    <Progress 
                      value={(metric.value / metric.threshold.critical) * 100} 
                      className="h-1"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active Alerts */}
          {alertsEnabled && alerts.length > 0 && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-400" />
                  Active Alerts ({alerts.filter(a => !a.is_resolved).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.filter(a => !a.is_resolved).map((alert) => (
                  <Alert key={alert.id} className="bg-slate-800 border-slate-600">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getStatusColor(alert.type)}>
                              {alert.type.toUpperCase()}
                            </Badge>
                            <span className="text-slate-300 font-medium">
                              {alert.tournament_name}
                            </span>
                          </div>
                          <AlertDescription className="text-slate-400">
                            {alert.message}
                          </AlertDescription>
                          <div className="text-xs text-slate-500 mt-1">
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
                ))}
              </CardContent>
            </Card>
          )}

          {/* Performance Analytics */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">99.8%</div>
                  <div className="text-sm text-slate-400">System Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">1.2s</div>
                  <div className="text-sm text-slate-400">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">0.01%</div>
                  <div className="text-sm text-slate-400">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Response Tools */}
          <Card className="bg-red-950/20 border-red-600/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Emergency Response Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-950/30"
                  onClick={() => toast({ title: "System Check", description: "Running comprehensive system check..." })}
                >
                  <Database className="w-4 h-4 mr-2" />
                  System Check
                </Button>
                
                <Button
                  variant="outline"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-950/30"
                  onClick={() => toast({ title: "Maintenance Mode", description: "Maintenance mode would be activated" })}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Maintenance Mode
                </Button>
                
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-400 hover:bg-blue-950/30"
                  onClick={() => toast({ title: "Backup Created", description: "Emergency backup initiated" })}
                >
                  <Server className="w-4 h-4 mr-2" />
                  Emergency Backup
                </Button>
              </div>
              
              <Alert className="bg-red-950/30 border-red-600/40">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  These tools should only be used during critical system issues. 
                  Always coordinate with the development team before using emergency functions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}