
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Trophy, Map, Calendar, Settings } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import TournamentManagement from '@/components/TournamentManagement';

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeTournaments: 0,
    registeredPlayers: 0,
    availableMaps: 0,
    liveMatches: 0
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get active tournaments count
        const { count: tournamentsCount } = await supabase
          .from('tournaments')
          .select('*', { count: 'exact' })
          .in('status', ['open', 'balancing', 'live']);

        // Get total registered players count
        const { count: playersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact' });

        // Get available maps count
        const { count: mapsCount } = await supabase
          .from('maps')
          .select('*', { count: 'exact' })
          .eq('is_active', true);

        // Get live matches count
        const { count: matchesCount } = await supabase
          .from('matches')
          .select('*', { count: 'exact' })
          .eq('status', 'live');

        setStats({
          activeTournaments: tournamentsCount || 0,
          registeredPlayers: playersCount || 0,
          availableMaps: mapsCount || 0,
          liveMatches: matchesCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (user && isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <Header />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <Badge variant="secondary" className="bg-purple-900 text-purple-200">
            Administrator
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.activeTournaments}</div>
              <div className="text-sm text-slate-300">Active Tournaments</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.registeredPlayers}</div>
              <div className="text-sm text-slate-300">Registered Players</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.availableMaps}</div>
              <div className="text-sm text-slate-300">Available Maps</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.liveMatches}</div>
              <div className="text-sm text-slate-300">Live Matches</div>
            </CardContent>
          </Card>
        </div>

        {/* Tournament Management */}
        <TournamentManagement />

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* User Management */}
          <Card className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-blue-500" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">View player profiles, manage bans, and handle user moderation.</p>
            </CardContent>
          </Card>

          {/* Map Management */}
          <Card className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Map className="w-5 h-5 text-green-500" />
                Maps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">Add, remove, and manage the map pool for tournaments and vetoes.</p>
            </CardContent>
          </Card>

          {/* Match Management */}
          <Card className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-red-500" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">Schedule matches, update scores, and manage bracket progression.</p>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-gray-500" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">Configure system settings, announcements, and platform preferences.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
