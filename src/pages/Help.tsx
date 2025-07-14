import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Calendar, 
  Users, 
  Trophy, 
  Settings, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle
} from "lucide-react";

const Help = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Help & Guide</h1>
            <p className="text-slate-400">Everything you need to know about using the tournament platform</p>
          </div>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/90 border border-slate-700">
            <TabsTrigger value="getting-started" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Getting Started</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Tournaments</TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Teams</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Creating Your Account
                </CardTitle>
                <CardDescription>Get started with your tournament journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Step 1: Sign Up</h4>
                  <p className="text-slate-400">Click the "Sign In" button and authenticate using Discord to create your account automatically.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Step 2: Complete Your Profile</h4>
                  <p className="text-slate-400">Add your Riot ID in your profile settings for rank verification and team balancing.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Step 3: Start Participating</h4>
                  <p className="text-slate-400">Browse available tournaments and sign up for events that interest you.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Key Features Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline">Tournaments</Badge>
                    <p className="text-sm text-slate-400">Join competitive events with automated bracket generation</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Team Management</Badge>
                    <p className="text-sm text-slate-400">Create or join persistent teams for team tournaments</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Match System</Badge>
                    <p className="text-sm text-slate-400">Report results with map veto and score tracking</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Statistics</Badge>
                    <p className="text-sm text-slate-400">Track your performance and earn achievements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Tournament Participation
                </CardTitle>
                <CardDescription>How to join and participate in tournaments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Finding Tournaments</h4>
                  <p className="text-slate-400">Navigate to the "Tournaments" page to see all available events. Tournaments show their status, participant count, and format.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Registration Types</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>Solo:</strong> Register individually, teams are automatically balanced</li>
                    <li><strong>Team:</strong> Register with your existing team</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Check-in Process</h4>
                  <p className="text-slate-400">Most tournaments require check-in before they start. You'll receive notifications when check-in opens.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  During Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Map Veto Process</h4>
                  <p className="text-slate-400">For enabled matches, teams take turns banning maps until the final map(s) are selected. Team captains control the veto process.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Reporting Results</h4>
                  <p className="text-slate-400">After your match, team captains can submit results. Both teams need to confirm the score before it's finalized.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Match Formats</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>BO1:</strong> Best of 1 - Single map</li>
                    <li><strong>BO3:</strong> Best of 3 - First to win 2 maps</li>
                    <li><strong>BO5:</strong> Best of 5 - First to win 3 maps</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-400">Tournament Status Meanings</h4>
                  <ul className="text-slate-400 text-sm mt-2 space-y-1">
                    <li><strong>Draft:</strong> Tournament being set up by admins</li>
                    <li><strong>Registration Open:</strong> Players can sign up</li>
                    <li><strong>Check-in:</strong> Registered players must check in</li>
                    <li><strong>Live:</strong> Tournament is in progress</li>
                    <li><strong>Completed:</strong> Tournament has finished</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <CardDescription>Creating and managing your teams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Creating a Team</h4>
                  <p className="text-slate-400">Go to the "Teams" page and click "Create Team". You'll automatically become the team captain with full management privileges.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Inviting Members</h4>
                  <p className="text-slate-400">As captain, you can generate invite codes or send direct invitations to other players to join your team.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Team Roles</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>Captain:</strong> Full team management, can register for tournaments</li>
                    <li><strong>Member:</strong> Participates in team tournaments</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Team Communication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Discord Integration</h4>
                  <p className="text-slate-400">Most team coordination happens through Discord. Make sure to join your team's Discord channel for all matches.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Match Preparation</h4>
                  <p className="text-slate-400">Captains should coordinate with team members before matches to ensure everyone is available and ready to particpate.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Customizing your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Riot ID Setup</h4>
                  <p className="text-slate-400">Add your Riot ID (Gamename#Tag) in your profile for rank verification. This helps with team balancing in tournaments.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Notification Preferences</h4>
                  <p className="text-slate-400">Customize which notifications you receive for tournament updates, match assignments, and team activities.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Privacy Settings</h4>
                  <p className="text-slate-400">Control who can see your profile information, match history, and statistics.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Troubleshooting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Common Issues</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>Can't sign up for tournament:</strong> Check if registration is open and you meet requirements</li>
                    <li><strong>Missing from team:</strong> Contact your team captain to verify membership</li>
                    <li><strong>Rank not updating:</strong> Ensure your Riot ID is correctly formatted</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Getting Support</h4>
                  <p className="text-slate-400">Join the Discord server for live support and community help. Admins are available to resolve technical issues.</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-400">Pro Tips</h4>
                  <ul className="text-slate-400 text-sm mt-2 space-y-1">
                    <li>Enable notifications to stay updated on tournament activities</li>
                    <li>Complete your profile for better team balancing</li>
                    <li>Join the Discord community for the best experience</li>
                    <li>Practice with your team before important matches</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Help;