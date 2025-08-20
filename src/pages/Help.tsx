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
  Shield,
  Star,
  ShoppingBag,
  Heart,
  Video
} from "lucide-react";

const Help = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Help & Guide
                </h1>
                <p className="text-muted-foreground mt-1">
                  Everything you need to know about TLR Hub
                </p>
              </div>
            </div>
          </div>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur border border-border/50">
            <TabsTrigger value="getting-started" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Getting Started</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tournaments</TabsTrigger>
            <TabsTrigger value="balancing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Team Balancing</TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Teams</TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Features</TabsTrigger>
            <TabsTrigger value="discord" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Discord</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Creating Your Account
                </CardTitle>
                <CardDescription>Get started with your competitive journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 1: Discord Authentication</h4>
                  <p className="text-muted-foreground">Click "Sign In" and authenticate using Discord to create your account automatically. Your Discord profile becomes your TLR Hub identity.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 2: Complete Your Profile</h4>
                  <p className="text-muted-foreground">Add your Riot ID for rank verification, set your Valorant role (Controller, Duelist, etc.), and configure your profile visibility and team-finding status.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 3: Join the Community</h4>
                  <p className="text-muted-foreground">Browse tournaments, explore the leaderboard, follow other players, and start participating in competitive events.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Platform Features Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">🏆 Tournaments</Badge>
                    <p className="text-sm text-muted-foreground">Join competitive events with automated brackets, team balancing, and live match tracking</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">👥 Team Management</Badge>
                    <p className="text-sm text-muted-foreground">Create persistent teams, manage rosters, and register for team tournaments with invite codes</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">🗺️ Map Veto System</Badge>
                    <p className="text-sm text-muted-foreground">Strategic map selection with dice rolls, side choices, and competitive veto sequences</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">📹 VOD Library</Badge>
                    <p className="text-sm text-muted-foreground">Watch tournament highlights and match recordings with player statistics</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">🏅 Achievements & Shop</Badge>
                    <p className="text-sm text-muted-foreground">Earn spendable points, unlock achievements, and purchase cosmetic profile effects</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">📊 Analytics</Badge>
                    <p className="text-sm text-muted-foreground">Track performance, rank history, match statistics, and tournament progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Tournament Participation
                </CardTitle>
                <CardDescription>How to join and compete in tournaments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Finding Tournaments</h4>
                  <p className="text-muted-foreground">Browse the "Tournaments" page to see all events. Each tournament shows status, participant count, format (BO1/BO3/BO5), and registration type.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Registration Types</h4>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>Solo:</strong> Register individually - teams auto-balanced using ATLAS algorithm</li>
                    <li><strong>Team:</strong> Register with your persistent team (captain required)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">ATLAS Balancing System</h4>
                  <p className="text-muted-foreground">Our advanced system uses current rank, peak rank, time decay, tournament wins penalty, and role preferences to create balanced teams automatically.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Check-in Process</h4>
                  <p className="text-muted-foreground">Most tournaments require check-in 30-60 minutes before start time. You'll receive Discord notifications when check-in opens.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Match Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Map Veto Process</h4>
                  <p className="text-muted-foreground">Teams perform dice rolls to determine pick order, then alternate between bans and picks. The home team chooses map sides for the final selection.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Score Reporting & Confirmation</h4>
                  <p className="text-muted-foreground">Team captains submit match results. Both teams must confirm scores before they're finalized. Disputes are handled by tournament medics.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Match Formats</h4>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>BO1:</strong> Single elimination with 6-ban, 1-pick veto</li>
                    <li><strong>BO3:</strong> First to 2 maps with pick-ban-pick-ban-ban-ban-pick veto</li>
                    <li><strong>BO5:</strong> First to 3 maps for championship matches</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary">Tournament Status Guide</h4>
                  <ul className="text-muted-foreground text-sm mt-2 space-y-1">
                    <li><strong>Draft:</strong> Being set up by admins - not yet public</li>
                    <li><strong>Registration Open:</strong> Players can sign up</li>
                    <li><strong>Check-in:</strong> Registered players must confirm attendance</li>
                    <li><strong>Live:</strong> Tournament in progress with active matches</li>
                    <li><strong>Completed:</strong> Tournament finished, winners determined</li>
                    <li><strong>Archived:</strong> Historical tournament data preserved</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="balancing" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  ATLAS Team Balancing System
                </CardTitle>
                <CardDescription>Advanced AI-powered team balancing for competitive fairness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">How ATLAS Works</h4>
                  <p className="text-muted-foreground">Our adaptive weight system calculates each player's effective skill using multiple factors: current rank, peak performance, time decay, tournament history, and winner penalties.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Weight Priority System</h4>
                  <ol className="text-muted-foreground list-decimal list-inside space-y-1">
                    <li><strong>Manual Override:</strong> Admin-set weights (highest priority)</li>
                    <li><strong>Adaptive Weight:</strong> Peak + current rank blend with decay</li>
                    <li><strong>Current Rank:</strong> Active competitive rank</li>
                    <li><strong>Peak Fallback:</strong> Historical peak with time penalty</li>
                    <li><strong>Default:</strong> 150 points (Diamond 1) for new players</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Tournament Winner Penalties</h4>
                  <p className="text-muted-foreground">Winners receive progressive weight reductions to prevent repeat dominance and ensure competitive balance for all players.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Rank Decay & Time Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Skill Degradation Over Time</h4>
                  <p className="text-muted-foreground">Peak ranks lose value over time. After 60 days, exponential decay applies with maximum 25% penalty for very old achievements.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Rank Drop Penalties</h4>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>Minor (50 pts):</strong> 20% decay</li>
                    <li><strong>Major (100 pts):</strong> 40% decay</li>
                    <li><strong>Severe (200 pts):</strong> 60% decay</li>
                    <li><strong>Extreme (300+ pts):</strong> Up to 80% decay</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Unranked Player Handling</h4>
                  <p className="text-muted-foreground">Higher peak ranks receive larger penalties when unranked, ranging from 15% (Gold) to 25% (Immortal+) to ensure fair competition.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Persistent Team System
                </CardTitle>
                <CardDescription>Create and manage teams for competitive play</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Creating Teams</h4>
                  <p className="text-muted-foreground">Any player can create a persistent team. As team captain, you control roster, registration for team tournaments, and team settings.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Team Invitations</h4>
                  <p className="text-muted-foreground">Generate unique invite codes that expire after 7 days. Share codes with players you want to recruit to your team.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Team Tournaments</h4>
                  <p className="text-muted-foreground">Register your team for team-based tournaments. All team members must be checked in before tournament start.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Team Statistics</h4>
                  <p className="text-muted-foreground">Track team performance, wins/losses, tournaments played, and member statistics in the team directory.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Finding Teams (LFT System)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Looking for Team Status</h4>
                  <p className="text-muted-foreground">Enable "Looking for Team" in your profile to show green LFT badges across the platform, making you discoverable to team captains.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Player Discovery</h4>
                  <p className="text-muted-foreground">Browse the Players page to find teammates by rank, role, win rate, and availability. Click usernames to view full profiles.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Profile Visibility</h4>
                  <p className="text-muted-foreground">Set your profile to public to allow other players to view your statistics, or keep it private for only yourself and admins.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Achievements & Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Achievement Categories</h4>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>Tournament Wins:</strong> First victory, multiple wins, tournament domination</li>
                    <li><strong>Match Performance:</strong> Win streaks, high win rates, total victories</li>
                    <li><strong>Participation:</strong> Tournament attendance, community engagement</li>
                    <li><strong>Special Events:</strong> Seasonal tournaments, milestone celebrations</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Spendable Points System</h4>
                  <p className="text-muted-foreground">Earn points by unlocking achievements. Use points in the shop to purchase profile effects, name decorations, and exclusive cosmetics.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Shop & Cosmetics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Available Items</h4>
                  <ul className="text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong>Name Effects:</strong> Visual enhancements for your username display</li>
                    <li><strong>Profile Badges:</strong> Special indicators and titles</li>
                    <li><strong>Exclusive Items:</strong> Limited-time cosmetics and collectibles</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Purchase History</h4>
                  <p className="text-muted-foreground">Track all purchases, active effects, and points spent in your shop profile. Manage active cosmetics and effects.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  VOD Library & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Match Recordings</h4>
                  <p className="text-muted-foreground">Watch tournament highlights, featured matches, and community-submitted VODs with integrated player statistics and match context.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Performance Analytics</h4>
                  <p className="text-muted-foreground">Track detailed statistics including rank history, match performance, tournament progression, and skill development over time.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Following System</h4>
                  <p className="text-muted-foreground">Follow other players to track their progress, see their match history, and stay updated on their competitive journey.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discord" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Discord Integration
                </CardTitle>
                <CardDescription>Seamless connection between TLR Hub and Discord</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Automatic Notifications</h4>
                  <p className="text-muted-foreground">Receive Discord DMs for tournament registration, check-in reminders, match assignments, and important updates automatically.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Profile Synchronization</h4>
                  <p className="text-muted-foreground">Your Discord username and avatar are automatically synced with your TLR Hub profile. Changes on Discord reflect immediately on the platform.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Community Features</h4>
                  <p className="text-muted-foreground">Join the TLR Discord server for real-time tournament chat, team coordination, community events, and direct support from admins.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Notification Preferences</h4>
                  <p className="text-muted-foreground">Customize which events trigger Discord notifications in your notification settings. Control frequency and types of messages you receive.</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary">Need Help?</h4>
                  <p className="text-muted-foreground text-sm mt-2">
                    Join our Discord server for live support, community discussions, and real-time tournament updates. 
                    Our team and experienced players are always ready to help newcomers get started.
                  </p>
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