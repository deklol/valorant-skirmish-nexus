
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Trophy, Map, Calendar, Settings } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tournament Management */}
          <Card className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">Create and manage tournaments, set brackets, and control tournament flow.</p>
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Manage Tournaments
              </Button>
            </CardContent>
          </Card>

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
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Manage Users
              </Button>
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
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Manage Maps
              </Button>
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
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Manage Matches
              </Button>
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
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                System Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">0</div>
              <div className="text-sm text-slate-300">Active Tournaments</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">0</div>
              <div className="text-sm text-slate-300">Registered Players</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">10</div>
              <div className="text-sm text-slate-300">Available Maps</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">0</div>
              <div className="text-sm text-slate-300">Live Matches</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
