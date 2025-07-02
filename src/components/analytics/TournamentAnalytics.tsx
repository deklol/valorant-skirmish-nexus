import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Download, 
  Eye, 
  Users, 
  TrendingUp,
  Calendar,
  Activity
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TournamentAnalyticsProps {
  tournamentId: string;
  tournamentName: string;
}

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  signupConversion: number;
  peakConcurrentUsers: number;
  engagementTime: number;
  topReferrers: Array<{ source: string; count: number }>;
}

const TournamentAnalytics = ({ tournamentId, tournamentName }: TournamentAnalyticsProps) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [tournamentId, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      // Get page views
      const { count: pageViews } = await supabase
        .from('tournament_page_views')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournamentId);

      // Get unique visitors
      const { data: uniqueVisitorsData } = await supabase
        .from('tournament_page_views')
        .select('ip_address')
        .eq('tournament_id', tournamentId);

      const uniqueVisitors = new Set(uniqueVisitorsData?.map(v => v.ip_address)).size;

      // Get signups
      const { count: signupsCount } = await supabase
        .from('tournament_signups')
        .select('*', { count: 'exact' })
        .eq('tournament_id', tournamentId);

      // Calculate conversion rate
      const signupConversion = pageViews ? (signupsCount || 0) / pageViews * 100 : 0;

      // Get referrer data
      const { data: referrerData } = await supabase
        .from('tournament_page_views')
        .select('referrer')
        .eq('tournament_id', tournamentId);

      const referrerCounts = referrerData?.reduce((acc, { referrer }) => {
        if (referrer) {
          const domain = new URL(referrer).hostname || 'direct';
          acc[domain] = (acc[domain] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topReferrers = Object.entries(referrerCounts || {})
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        pageViews: pageViews || 0,
        uniqueVisitors,
        signupConversion,
        peakConcurrentUsers: 0, // Would need real-time tracking
        engagementTime: 0, // Would need session tracking
        topReferrers
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      // Get detailed tournament data for export
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_signups(*),
          matches(*),
          teams(*)
        `)
        .eq('id', tournamentId)
        .single();

      if (!tournamentData) {
        throw new Error('Tournament data not found');
      }

      if (format === 'csv') {
        // Create CSV content
        const csvData = [
          ['Tournament Name', tournamentName],
          ['Tournament ID', tournamentId],
          ['Status', tournamentData.status],
          ['Max Players', tournamentData.max_players],
          ['Start Time', tournamentData.start_time],
          ['Total Signups', tournamentData.tournament_signups?.length || 0],
          ['Total Matches', tournamentData.matches?.length || 0],
          ['Total Teams', tournamentData.teams?.length || 0],
          ['Page Views', analytics?.pageViews || 0],
          ['Unique Visitors', analytics?.uniqueVisitors || 0],
          ['Signup Conversion %', analytics?.signupConversion.toFixed(2) || 0]
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tournament-${tournamentName.replace(/\s+/g, '-')}-analytics.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Create JSON content
        const jsonData = {
          tournament: {
            name: tournamentName,
            id: tournamentId,
            ...tournamentData
          },
          analytics: analytics,
          exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tournament-${tournamentName.replace(/\s+/g, '-')}-data.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Complete",
        description: `Tournament data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export tournament data",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center">
          <div className="text-slate-400">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Tournament Analytics
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('csv')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('json')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Eye className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{analytics.pageViews}</div>
                <div className="text-slate-400 text-sm">Page Views</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">{analytics.uniqueVisitors}</div>
                <div className="text-slate-400 text-sm">Unique Visitors</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {analytics.signupConversion.toFixed(1)}%
                </div>
                <div className="text-slate-400 text-sm">Signup Rate</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {analytics.pageViews > 0 ? 'Active' : 'Low'}
                </div>
                <div className="text-slate-400 text-sm">Engagement</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analytics?.topReferrers && analytics.topReferrers.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Top Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topReferrers.map((referrer, index) => (
                <div key={referrer.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-slate-700">
                      #{index + 1}
                    </Badge>
                    <span className="text-slate-300">{referrer.source}</span>
                  </div>
                  <span className="text-white font-medium">{referrer.count} visits</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TournamentAnalytics;