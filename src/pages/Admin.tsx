
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Trophy, MessageSquare, Map } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import DiscordWebhookManager from "@/components/DiscordWebhookManager";
import CreateTournamentDialog from "@/components/CreateTournamentDialog";
import TournamentManagement from "@/components/TournamentManagement";
import AdminLogoutAll from "@/components/AdminLogoutAll";
import MapManager from "@/components/MapManager";
import UserManagement from "@/components/UserManagement";

const Admin = () => {
  const { isAdmin } = useAuth();
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <p className="text-slate-400 text-lg">Access Denied</p>
              <p className="text-slate-500 mt-2">You need administrator privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Manage tournaments, users, maps, and system settings</p>
          </div>
          
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setCreateTournamentOpen(true)}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="tournaments" className="text-white data-[state=active]:bg-red-600">
              <Trophy className="w-4 h-4 mr-2" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="maps" className="text-white data-[state=active]:bg-red-600">
              <Map className="w-4 h-4 mr-2" />
              Maps
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-white data-[state=active]:bg-red-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-red-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <TournamentManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="maps">
            <MapManager />
          </TabsContent>

          <TabsContent value="announcements">
            <DiscordWebhookManager />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <AdminLogoutAll />
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">Additional system settings panel coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateTournamentDialog
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
      />
    </div>
  );
};

export default Admin;
