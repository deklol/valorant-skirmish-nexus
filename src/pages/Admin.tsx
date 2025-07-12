
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Trophy, MessageSquare, Map, ShieldAlert, Wrench, BookOpen, FileText, Stethoscope, Play, TestTube, Award } from "lucide-react";
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
import AuditLogManager from "@/components/admin/AuditLogManager";
import StatisticsManager from "@/components/admin/StatisticsManager";
import AchievementMedicManager from "@/components/AchievementMedicManager";
import { VetoDialog } from "@/components/veto/VetoDialog";

const Admin = () => {
  const { isAdmin } = useAuth();
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [vetoTestOpen, setVetoTestOpen] = useState(false);

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
          {/* Single Create Tournament Button */}
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setCreateTournamentOpen(true)}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 grid grid-cols-3 lg:grid-cols-10 w-full max-w-7xl mx-auto overflow-x-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {/* Core Management */}
            <TabsTrigger value="tournaments" className="text-white data-[state=active]:bg-red-600">
              <Trophy className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tournaments</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-red-600">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="maps" className="text-white data-[state=active]:bg-red-600">
              <Map className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Maps</span>
            </TabsTrigger>

            {/* Medical Tools - Individual Tabs */}
            <TabsTrigger value="tournament-medic" className="text-white data-[state=active]:bg-yellow-600">
              <Trophy className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tournament Medic</span>
            </TabsTrigger>
            <TabsTrigger value="veto-medic" className="text-white data-[state=active]:bg-orange-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Veto Medic</span>
            </TabsTrigger>
            <TabsTrigger value="bracket-medic" className="text-white data-[state=active]:bg-cyan-600">
              <Wrench className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bracket Medic</span>
            </TabsTrigger>
            <TabsTrigger value="match-medic" className="text-white data-[state=active]:bg-amber-600">
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Match Medic</span>
            </TabsTrigger>
            <TabsTrigger value="achievement-medic" className="text-white data-[state=active]:bg-yellow-600">
              <Award className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Achievement Medic</span>
            </TabsTrigger>

            {/* System & Logs */}
            <TabsTrigger value="audit-log" className="text-white data-[state=active]:bg-purple-600">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Audit Logs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-slate-600">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="text-white data-[state=active]:bg-blue-600">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Help</span>
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

          <TabsContent value="tournament-medic">
            <TournamentMedicManager />
          </TabsContent>

          <TabsContent value="veto-medic">
            <VetoMedicManager />
          </TabsContent>

          <TabsContent value="bracket-medic">
            <BracketMedicManager />
          </TabsContent>

          <TabsContent value="match-medic">
            <MatchMedicManager />
          </TabsContent>

          <TabsContent value="achievement-medic">
            <AchievementMedicManager />
          </TabsContent>

          <TabsContent value="audit-log">
            <AuditLogManager />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Settings */}
              <div className="space-y-6">
                <AppSettingsManager />
                <DiscordWebhookManager />
              </div>
              
              {/* System Tools */}
              <div className="space-y-6">
                <AdminLogoutAll />
                <SendNotificationTestButton />
                <SchemaExportButton />
                <StatisticsManager />
                
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Onboarding Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-slate-400 text-sm mb-4">Preview the user onboarding systems as an admin</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          // Trigger tutorial preview event
                          const event = new CustomEvent('preview-tutorial');
                          window.dispatchEvent(event);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Preview Tutorial
                      </Button>
                      <Button
                        onClick={() => {
                          // Trigger checklist preview event
                          const event = new CustomEvent('preview-checklist');
                          window.dispatchEvent(event);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Preview Checklist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">System Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-slate-400 text-sm mb-4">Test core system functionality</p>
                    <Button
                      onClick={() => setVetoTestOpen(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Preview Veto System
                    </Button>
                  </CardContent>
                </Card>
              </div>
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
      
      <VetoDialog
        matchId="1addf0a5-0f82-4e8f-b7aa-96f9778b491f"
        open={vetoTestOpen}
        onOpenChange={setVetoTestOpen}
        team1Name="Team adum__"
        team2Name="Team _dek"
      />
    </div>
  );
};

export default Admin;
