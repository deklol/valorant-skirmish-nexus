import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Trophy, MessageSquare, Map, ShieldAlert, Wrench, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DiscordWebhookManager from "@/components/DiscordWebhookManager";
import CreateTournamentDialog from "@/components/CreateTournamentDialog";
import TournamentManagement from "@/components/TournamentManagement";
import AdminLogoutAll from "@/components/AdminLogoutAll";
import MapManager from "@/components/MapManager";
import UserManagement from "@/components/UserManagement";
import VetoMedicManager from "@/components/VetoMedicManager";
import MatchMedicManager from "@/components/MatchMedicManager";
import TournamentMedicManager from "@/components/TournamentMedicManager";
import SendNotificationTestButton from "@/components/SendNotificationTestButton";
import AdminHelpTab from "@/components/admin/AdminHelpTab";
import AppSettingsManager from "@/components/admin/AppSettingsManager";
import SchemaExportButton from "@/components/admin/SchemaExportButton";
import BracketMedicManager from "@/components/BracketMedicManager";

const Admin = () => {
  const { isAdmin } = useAuth();
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);

  const handleTournamentCreated = () => {
    setCreateTournamentOpen(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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

            {/* --- MEDIC TABS GROUP --- */}
            <TabsTrigger value="veto-medic" className="text-white data-[state=active]:bg-yellow-600">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Veto Medic
            </TabsTrigger>
            <TabsTrigger value="match-medic" className="text-white data-[state=active]:bg-amber-600">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Match Medic
            </TabsTrigger>
            <TabsTrigger value="tournament-medic" className="text-white data-[state=active]:bg-yellow-700">
              <Wrench className="w-4 h-4 mr-2" />
              Tournament Medic
            </TabsTrigger>
            {/* Bracket Medic closely follows other medics */}
            <TabsTrigger value="bracket-medic" className="text-white data-[state=active]:bg-cyan-600">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Bracket Medic
            </TabsTrigger>
            {/* --- END MEDIC GROUP --- */}

            <TabsTrigger value="announcements" className="text-white data-[state=active]:bg-red-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-red-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="help" className="text-white data-[state=active]:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Help
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

          <TabsContent value="veto-medic">
            <VetoMedicManager />
          </TabsContent>

          <TabsContent value="match-medic">
            <MatchMedicManager />
          </TabsContent>

          <TabsContent value="tournament-medic">
            <TournamentMedicManager />
          </TabsContent>

          {/* ADD BRACKET MEDIC TAB CONTENT */}
          <TabsContent value="bracket-medic">
            <BracketMedicManager />
          </TabsContent>
          {/* END BRACKET MEDIC */}

          <TabsContent value="announcements">
            <DiscordWebhookManager />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <AdminLogoutAll />
              <SendNotificationTestButton />
              {/* God Hub: Editable Settings Card */}
              <AppSettingsManager />
              <SchemaExportButton />
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
          <TabsContent value="help">
            {/* Admin Help Documentation System */}
            <AdminHelpTab />
          </TabsContent>
        </Tabs>
      </div>

      <CreateTournamentDialog
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
        onTournamentCreated={handleTournamentCreated}
      />
    </div>
  );
};

export default Admin;
