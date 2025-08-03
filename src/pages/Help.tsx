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
  HelpCircle,
  Scale,
  Target,
  TrendingUp,
  Zap,
  Shield
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
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/90 border border-slate-700">
            <TabsTrigger value="getting-started" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Getting Started</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Tournaments</TabsTrigger>
            <TabsTrigger value="balancing" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Team Balancing</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline">Tournaments</Badge>
                    <p className="text-sm text-slate-400">Join competitive events with automated bracket generation and team balancing</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Team Management</Badge>
                    <p className="text-sm text-slate-400">Create or join persistent teams for team tournaments</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Map Veto System</Badge>
                    <p className="text-sm text-slate-400">Strategic map banning and picking for competitive matches</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">VOD Library</Badge>
                    <p className="text-sm text-slate-400">Watch recorded matches with integrated player and tournament data</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Achievements & Shop</Badge>
                    <p className="text-sm text-slate-400">Earn points and unlock cosmetic rewards for your profile</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Real-time Analytics</Badge>
                    <p className="text-sm text-slate-400">Track your performance, rank history, and tournament statistics</p>
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
                    <li><strong>Solo:</strong> Register individually, teams are automatically balanced using adaptive ranking system</li>
                    <li><strong>Team:</strong> Register with your existing persistent team</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Adaptive Team Balancing</h4>
                  <p className="text-slate-400">Our system uses your current rank, peak rank, and recent performance to create balanced teams. Peak rank decay ensures fair matchmaking over time.</p>
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
                    <li><strong>BO1:</strong> Best of 1 - Single map with competitive veto process</li>
                    <li><strong>BO3:</strong> Best of 3 - First to win 2 maps with strategic picks and bans</li>
                    <li><strong>BO5:</strong> Best of 5 - First to win 3 maps for championship matches</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Score Confirmation System</h4>
                  <p className="text-slate-400">Both team captains must confirm match results. Disputes can be reviewed by tournament administrators with full audit trails.</p>
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

          <TabsContent value="balancing" className="space-y-6">
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Adaptive Team Balancing System
                </CardTitle>
                <CardDescription>Advanced AI-powered team balancing for competitive fairness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">How It Works</h4>
                  <p className="text-slate-400">Our adaptive weight system combines multiple factors to calculate each player's effective skill level, ensuring balanced teams every time. The algorithm considers current rank, peak performance, time decay, and tournament history.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Priority System</h4>
                  <ol className="text-slate-400 list-decimal list-inside space-y-1">
                    <li><strong>Manual Override:</strong> Admin-set ranks take highest priority</li>
                    <li><strong>Adaptive Weight:</strong> Enhanced calculation using peak + current rank blend</li>
                    <li><strong>Current Rank:</strong> Your active competitive rank (if not Unranked)</li>
                    <li><strong>Peak Rank Fallback:</strong> Uses peak rank with time-based penalty for unranked players</li>
                    <li><strong>Default:</strong> 150 points (Diamond 1 equivalent) for new players</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Adaptive Weight Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Rank Decay System</h4>
                  <p className="text-slate-400">When your current rank is lower than your peak, the system applies tier-based decay calculations:</p>
                  <ul className="text-slate-400 list-disc list-inside space-y-1 ml-4">
                    <li><strong>Minor Drop (50 points):</strong> 20% decay (e.g., Gold 3 → Gold 2)</li>
                    <li><strong>Major Drop (100 points):</strong> 40% decay (e.g., Diamond → Platinum)</li>
                    <li><strong>Severe Drop (200 points):</strong> 60% decay (e.g., Immortal → Gold)</li>
                    <li><strong>Extreme Drop (300+ points):</strong> Up to 80% decay (e.g., Radiant → Silver)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Time-Based Penalties</h4>
                  <p className="text-slate-400">Skill naturally degrades over time. After 60 days since peak performance, exponential decay applies with a maximum 25% penalty for very old peak ranks.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Unranked Player Handling</h4>
                  <p className="text-slate-400">Unranked players with peak ranks receive tier-appropriate penalties:</p>
                  <ul className="text-slate-400 list-disc list-inside space-y-1 ml-4">
                    <li><strong>Immortal+:</strong> 25% penalty (must prove current skill)</li>
                    <li><strong>Ascendant:</strong> 22% penalty</li>
                    <li><strong>Diamond:</strong> 20% penalty</li>
                    <li><strong>Platinum:</strong> 18% penalty</li>
                    <li><strong>Gold and below:</strong> 15% penalty</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Tournament Winner Penalty System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Competitive Fairness</h4>
                  <p className="text-slate-400">To prevent previous tournament winners from consistently receiving overpowered teams, progressive penalties are applied based on tournament wins:</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Base Penalties</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>1 Tournament Win:</strong> 15% weight reduction</li>
                    <li><strong>2 Tournament Wins:</strong> 25% weight reduction</li>
                    <li><strong>3+ Tournament Wins:</strong> 35% weight reduction</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Additional Modifiers</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>Unranked Winners:</strong> Double penalty (2x multiplier) - Winners must prove current form</li>
                    <li><strong>Recent Wins:</strong> +50% penalty for wins within the last 90 days</li>
                    <li><strong>Maximum Penalty:</strong> Capped at 60% to prevent excessive penalization</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Team Distribution Algorithm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Enhanced Snake Draft</h4>
                  <p className="text-slate-400">Players are sorted by their calculated adaptive weight, then distributed using an optimized snake draft pattern that minimizes skill variance between teams.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Quality Metrics</h4>
                  <ul className="text-slate-400 list-disc list-inside space-y-1">
                    <li><strong>Balance Quality Score:</strong> Measures team balance from 0-100%</li>
                    <li><strong>Point Variance:</strong> Lower variance = more balanced teams</li>
                    <li><strong>Confidence Scoring:</strong> Indicates reliability of the balance calculation</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Winner Distribution</h4>
                  <p className="text-slate-400">Tournament winners are spread across different teams to prevent stacking multiple champions on the same team, ensuring competitive integrity.</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-400">Adaptive Weight Benefits</h4>
                  <ul className="text-slate-400 text-sm mt-2 space-y-1">
                    <li>Prevents rank inflation abuse - past winners face greater challenges</li>
                    <li>Accounts for skill degradation over time</li>
                    <li>Balances teams based on proven competitive ability, not just current rank</li>
                    <li>Creates fair matches where any team can win through strategy and teamwork</li>
                    <li>Transparent calculation system with detailed reasoning for each player</li>
                    <li>Encourages continuous improvement rather than resting on past achievements</li>
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
                  <p className="text-slate-400">Add your Riot ID (Gamename#Tag) in your profile for automated rank verification. This enables our adaptive team balancing system to create fair matches.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Notification Preferences</h4>
                  <p className="text-slate-400">Customize which notifications you receive: tournament updates, match assignments, team activities, and achievement unlocks. Available for both push and email notifications.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Privacy Settings</h4>
                  <p className="text-slate-400">Control profile visibility, match history access, and statistics sharing. Public profiles help with community engagement and team recruitment.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Achievement & Shop System</h4>
                  <p className="text-slate-400">Earn achievement points through tournament participation and victories. Spend points in the shop for cosmetic username effects and profile customizations.</p>
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
                    <li><strong>Can't sign up for tournament:</strong> Check if registration is open, you meet rank requirements, and haven't exceeded max signups</li>
                    <li><strong>Missing from team:</strong> Contact your team captain to verify membership, or check if you're on a substitute list</li>
                    <li><strong>Rank not updating:</strong> Ensure your Riot ID is correctly formatted (Name#TAG). Manual rank scraping may be needed for recent changes</li>
                    <li><strong>Map veto not working:</strong> Ensure you're the team captain and it's your turn in the veto sequence</li>
                    <li><strong>Notifications not working:</strong> Check browser permissions for push notifications and verify email settings</li>
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
                    <li>Enable push notifications to get real-time tournament and match updates</li>
                    <li>Keep your Riot ID updated for accurate rank-based team balancing</li>
                    <li>Join the Discord community for live coordination and faster support</li>
                    <li>Practice map veto strategies with your team before important matches</li>
                    <li>Watch featured VODs to learn from top tournament performances</li>
                    <li>Complete achievements to earn points for cosmetic shop items</li>
                    <li>Set your profile to public to help with team recruitment</li>
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