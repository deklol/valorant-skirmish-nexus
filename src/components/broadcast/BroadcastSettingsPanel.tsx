import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Eye, EyeOff, RotateCcw, Save, Upload, Copy, ExternalLink } from 'lucide-react';
import { useBroadcastSettings, type BroadcastSceneSettings } from '@/hooks/useBroadcastSettings';
import { useToast } from '@/hooks/use-toast';

export default function BroadcastSettingsPanel() {
  const { 
    settings, 
    updateSettings, 
    updateSceneSettings, 
    isAuthenticated, 
    authenticate, 
    logout, 
    resetSettings 
  } = useBroadcastSettings();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const saveSettings = () => {
    // Settings are auto-saved to localStorage in the hook, but we can provide feedback
    toast({
      title: "Settings Saved",
      description: "Your broadcast settings have been saved and will persist across sessions.",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const generateBroadcastUrls = () => {
    const baseUrl = window.location.origin;
    
    return {
      teamRoster: `${baseUrl}/broadcast/team-roster/:tournamentId/:teamId`,
      matchupPreview: `${baseUrl}/broadcast/matchup-preview/:tournamentId/:team1Id/:team2Id`,
      playerSpotlight: `${baseUrl}/broadcast/player-spotlight/:tournamentId/:playerId`,
      bracketOverlay: `${baseUrl}/broadcast/bracket/:tournamentId`,
      tournamentStats: `${baseUrl}/broadcast/tournament-stats/:tournamentId`,
    };
  };

  const broadcastUrls = generateBroadcastUrls();

  if (!isAuthenticated) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔒 Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter broadcast settings password"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (!authenticate(password)) {
                      alert('Invalid password');
                      setPassword('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button 
            onClick={() => {
              if (!authenticate(password)) {
                alert('Invalid password');
                setPassword('');
              }
            }}
            className="w-full"
          >
            Unlock Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const SceneCustomization = ({ 
    scene, 
    sceneSettings 
  }: { 
    scene: keyof typeof settings.sceneSettings;
    sceneSettings: BroadcastSceneSettings; 
  }) => {
    // Common display options available to most scenes
    const CommonDisplayOptions = () => (
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Common Display Options</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showAdaptiveWeight}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showAdaptiveWeight: checked })}
            />
            <Label>ATLAS Weight</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showCurrentRank}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showCurrentRank: checked })}
            />
            <Label>Current Rank</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showPeakRank}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showPeakRank: checked })}
            />
            <Label>Peak Rank</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showTournamentWins}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentWins: checked })}
            />
            <Label>Tournament Wins</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showRiotId}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showRiotId: checked })}
            />
            <Label>Riot ID</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showTeamTotalWeight}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showTeamTotalWeight: checked })}
            />
            <Label>Team Total Weight</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.showTeamSeed}
              onCheckedChange={(checked) => updateSceneSettings(scene, { showTeamSeed: checked })}
            />
            <Label>Team Seed</Label>
          </div>
        </div>
      </div>
    );

    // Scene-specific options
    const SceneSpecificOptions = () => {
      switch (scene) {
        case 'teamRoster':
          return (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Team Roster Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showTeamName !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTeamName: checked })}
                  />
                  <Label>Team Name Display</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showAvatars !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showAvatars: checked })}
                  />
                  <Label>Player Avatars</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showCaptainBadges !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showCaptainBadges: checked })}
                  />
                  <Label>Captain Badges</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showRankEmojis !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showRankEmojis: checked })}
                  />
                  <Label>Rank Emojis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showStatsSection !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showStatsSection: checked })}
                  />
                  <Label>Team Stats Section</Label>
                </div>
                <div className="space-y-2">
                  <Label>Player Card Layout</Label>
                  <Select 
                    value={sceneSettings.playerCardLayout || 'detailed'}
                    onValueChange={(value) => updateSceneSettings(scene, { playerCardLayout: value as 'compact' | 'detailed' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Roster Preset</Label>
                  <Select 
                    value="custom"
                    onValueChange={(value) => {
                      if (value === 'minimal') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: false,
                          showAdaptiveWeight: true,
                          showRiotId: false,
                          showTeamTotalWeight: false,
                          showTeamSeed: true,
                          showCaptainBadges: true,
                          playerCardLayout: 'compact',
                          showAvatars: false,
                          showTeamName: true
                        });
                      } else if (value === 'broadcast') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: true,
                          showAdaptiveWeight: true,
                          showRiotId: false,
                          showTeamTotalWeight: true,
                          showTeamSeed: true,
                          showCaptainBadges: true,
                          playerCardLayout: 'detailed',
                          showAvatars: true,
                          showTeamName: true
                        });
                      } else if (value === 'complete') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: true,
                          showAdaptiveWeight: true,
                          showRiotId: true,
                          showTeamTotalWeight: true,
                          showTeamSeed: true,
                          showCaptainBadges: true,
                          playerCardLayout: 'detailed',
                          showAvatars: true,
                          showTeamName: true
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal Info</SelectItem>
                      <SelectItem value="broadcast">Broadcast Ready</SelectItem>
                      <SelectItem value="complete">Complete Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Player Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsBackgroundColor || '#000000'}
                        onChange={(e) => updateSceneSettings(scene, { obsBackgroundColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsAccentColor || '#ff6b35'}
                        onChange={(e) => updateSceneSettings(scene, { obsAccentColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsHeaderColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsHeaderColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsTextColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsTextColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'matchupPreview':
          return (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Matchup Preview Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showPlayerSpotlight !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showPlayerSpotlight: checked })}
                  />
                  <Label>Player Spotlight Panel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showTeamStats !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTeamStats: checked })}
                  />
                  <Label>Team Stats Section</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showVsHeader !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showVsHeader: checked })}
                  />
                  <Label>VS Header</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showCaptainBadges !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showCaptainBadges: checked })}
                  />
                  <Label>Captain Badges</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showCurrentRank !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showCurrentRank: checked })}
                  />
                  <Label>Player Ranks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showWeightDifference !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showWeightDifference: checked })}
                  />
                  <Label>Weight Difference</Label>
                </div>
                <div className="space-y-2">
                  <Label>Matchup Layout</Label>
                  <Select 
                    value={sceneSettings.matchupLayout || 'side-by-side'}
                    onValueChange={(value) => updateSceneSettings(scene, { matchupLayout: value as 'side-by-side' | 'stacked' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="side-by-side">Side by Side</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Team Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsBackgroundColor || '#000000'}
                        onChange={(e) => updateSceneSettings(scene, { obsBackgroundColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>VS Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsAccentColor || '#ff6b35'}
                        onChange={(e) => updateSceneSettings(scene, { obsAccentColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsHeaderColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsHeaderColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsTextColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsTextColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

         case 'teamsOverview':
           return (
             <div className="space-y-4">
               <h4 className="font-medium text-lg">Teams Overview Options</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showActiveEliminated ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showActiveEliminated: checked })}
                   />
                   <Label>Active/Eliminated Sections</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showTeamStatusBadges ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showTeamStatusBadges: checked })}
                   />
                   <Label>Team Status Badges</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showTournamentStatus ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentStatus: checked })}
                   />
                   <Label>Tournament Status Indicator</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showMemberCount ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showMemberCount: checked })}
                   />
                   <Label>Member Count Display</Label>
                 </div>
                 <div className="space-y-2 col-span-2">
                   <Label>Grid Columns: {sceneSettings.gridColumns || 2}</Label>
                   <Slider
                     value={[sceneSettings.gridColumns || 2]}
                     onValueChange={([value]) => updateSceneSettings(scene, { gridColumns: value as 1 | 2 | 3 })}
                     max={3}
                     min={1}
                     step={1}
                   />
                 </div>
                 
                 {/* Block Color Controls */}
                 <div className="space-y-2 col-span-2">
                   <h5 className="font-medium">Block Colors</h5>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Team Accent Color</Label>
                       <input
                         type="color"
                         value={sceneSettings.teamAccentColor || '#ff6b35'}
                         onChange={(e) => updateSceneSettings(scene, { teamAccentColor: e.target.value })}
                         className="w-full h-8 rounded border"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Player Accent Color</Label>
                       <input
                         type="color"
                         value={sceneSettings.playerAccentColor || '#ff6b35'}
                         onChange={(e) => updateSceneSettings(scene, { playerAccentColor: e.target.value })}
                         className="w-full h-8 rounded border"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Weight Block Color</Label>
                       <input
                         type="color"
                         value={sceneSettings.weightBlockColor || '#333333'}
                         onChange={(e) => updateSceneSettings(scene, { weightBlockColor: e.target.value })}
                         className="w-full h-8 rounded border"
                       />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           );

        case 'playerSpotlight':
          return (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Player Spotlight Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showPerformanceRating ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showPerformanceRating: checked })}
                  />
                  <Label>Performance Rating</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showLargeAvatar ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showLargeAvatar: checked })}
                  />
                  <Label>Large Avatar Display</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showTournamentHistory ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentHistory: checked })}
                  />
                  <Label>Tournament History Stats</Label>
                </div>
                <div className="space-y-2">
                  <Label>Display Preset</Label>
                  <Select 
                    value="custom"
                    onValueChange={(value) => {
                      if (value === 'minimal') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: true,
                          showPeakRank: false,
                          showRiotId: false,
                          showAdaptiveWeight: true,
                          showTournamentWins: false,
                          showPerformanceRating: false,
                          statsLayout: 'stacked'
                        });
                      } else if (value === 'detailed') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: true,
                          showPeakRank: true,
                          showRiotId: true,
                          showAdaptiveWeight: true,
                          showTournamentWins: true,
                          showPerformanceRating: true,
                          statsLayout: 'grid'
                        });
                      } else if (value === 'broadcast') {
                        updateSceneSettings(scene, { 
                          showCurrentRank: true,
                          showPeakRank: false,
                          showRiotId: false,
                          showAdaptiveWeight: true,
                          showTournamentWins: false,
                          showPerformanceRating: true,
                          statsLayout: 'grid'
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal Info</SelectItem>
                      <SelectItem value="broadcast">Broadcast Ready</SelectItem>
                      <SelectItem value="detailed">Full Details</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Spotlight Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsBackgroundColor || '#000000'}
                        onChange={(e) => updateSceneSettings(scene, { obsBackgroundColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stats Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsAccentColor || '#ff6b35'}
                        onChange={(e) => updateSceneSettings(scene, { obsAccentColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsHeaderColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsHeaderColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsTextColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsTextColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'tournamentStats':
          return (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Tournament Stats Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showIndividualStatCards ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showIndividualStatCards: checked })}
                  />
                  <Label>Individual Stat Cards</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showProgressBar ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showProgressBar: checked })}
                  />
                  <Label>Progress Bar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showTournamentStatusHeader ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentStatusHeader: checked })}
                  />
                  <Label>Tournament Status Header</Label>
                </div>
                <div className="space-y-2">
                  <Label>Icon Style</Label>
                  <Select 
                    value={sceneSettings.statIconStyle || 'filled'} 
                    onValueChange={(value) => updateSceneSettings(scene, { statIconStyle: value as 'filled' | 'outline' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filled">Filled</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stats Preset</Label>
                  <Select 
                    value="custom"
                    onValueChange={(value) => {
                      if (value === 'essential') {
                        updateSceneSettings(scene, { 
                          showIndividualStatCards: true,
                          showProgressBar: false,
                          showTournamentStatusHeader: true,
                          statCardLayout: 'grid'
                        });
                      } else if (value === 'minimal') {
                        updateSceneSettings(scene, { 
                          showIndividualStatCards: false,
                          showProgressBar: true,
                          showTournamentStatusHeader: true,
                          statCardLayout: 'row'
                        });
                      } else if (value === 'complete') {
                        updateSceneSettings(scene, { 
                          showIndividualStatCards: true,
                          showProgressBar: true,
                          showTournamentStatusHeader: true,
                          statCardLayout: 'grid'
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essential">Essential Stats</SelectItem>
                      <SelectItem value="minimal">Minimal View</SelectItem>
                      <SelectItem value="complete">Complete View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stats Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsBackgroundColor || '#000000'}
                        onChange={(e) => updateSceneSettings(scene, { obsBackgroundColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Progress Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsAccentColor || '#ff6b35'}
                        onChange={(e) => updateSceneSettings(scene, { obsAccentColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsHeaderColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsHeaderColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsTextColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsTextColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

         case 'bracketOverlay':
           return (
             <div className="space-y-4">
               <h4 className="font-medium text-lg">Bracket Overlay Options</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showTournamentHeader !== false}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentHeader: checked })}
                   />
                   <Label>Tournament Header</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showMatchStatusBadges !== false}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showMatchStatusBadges: checked })}
                   />
                   <Label>Match Status Badges</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showMatchCards ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showMatchCards: checked })}
                   />
                   <Label>Match Cards</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showRoundIndicators ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showRoundIndicators: checked })}
                   />
                   <Label>Round Indicators</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showWinnerHighlight ?? true}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showWinnerHighlight: checked })}
                   />
                   <Label>Winner Highlight</Label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Switch
                     checked={sceneSettings.showTournamentStatusFooter !== false}
                     onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentStatusFooter: checked })}
                   />
                   <Label>Tournament Status Footer</Label>
                 </div>
                <div className="space-y-2">
                  <Label>Bracket Structure</Label>
                  <Select 
                    value={sceneSettings.bracketStructure || 'single'} 
                    onValueChange={(value) => updateSceneSettings(scene, { bracketStructure: value as 'single' | 'double' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Elimination</SelectItem>
                      <SelectItem value="double">Double Elimination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Match Block Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsBackgroundColor || '#000000'}
                        onChange={(e) => updateSceneSettings(scene, { obsBackgroundColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bracket Line Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsAccentColor || '#ff6b35'}
                        onChange={(e) => updateSceneSettings(scene, { obsAccentColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Header Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsHeaderColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsHeaderColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <input
                        type="color"
                        value={sceneSettings.obsTextColor || '#ffffff'}
                        onChange={(e) => updateSceneSettings(scene, { obsTextColor: e.target.value })}
                        className="w-full h-8 rounded border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    // Visual Design section - common to all scenes
    const VisualDesignOptions = () => (
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Visual Design</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 col-span-2">
            <Switch
              checked={sceneSettings.transparentBackground ?? false}
              onCheckedChange={(checked) => updateSceneSettings(scene, { transparentBackground: checked })}
            />
            <Label className="font-medium text-orange-400">
              Transparent Background Mode (OBS/vMix Overlay)
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Background Color</Label>
            <Input
              type="color"
              value={sceneSettings.backgroundColor || settings.backgroundColor}
              onChange={(e) => updateSceneSettings(scene, { backgroundColor: e.target.value })}
              disabled={sceneSettings.transparentBackground}
            />
          </div>
          <div className="space-y-2">
            <Label>Text Color</Label>
            <Input
              type="color"
              value={sceneSettings.textColor || settings.textColor}
              onChange={(e) => updateSceneSettings(scene, { textColor: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Header Text Color</Label>
            <Input
              type="color"
              value={sceneSettings.headerTextColor || settings.headerTextColor}
              onChange={(e) => updateSceneSettings(scene, { headerTextColor: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Border Color</Label>
            <Input
              type="color"
              value={sceneSettings.borderColor || '#ffffff20'}
              onChange={(e) => updateSceneSettings(scene, { borderColor: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Border Radius: {sceneSettings.borderRadius || 12}px</Label>
            <Slider
              value={[sceneSettings.borderRadius || 12]}
              onValueChange={([value]) => updateSceneSettings(scene, { borderRadius: value })}
              max={30}
              min={0}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Spacing: {sceneSettings.spacing || 8}px</Label>
            <Slider
              value={[sceneSettings.spacing || 8]}
              onValueChange={([value]) => updateSceneSettings(scene, { spacing: value })}
              max={32}
              min={4}
              step={2}
            />
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Show Common Display Options for scenes that need them */}
        {['teamRoster', 'matchupPreview', 'playerSpotlight', 'teamsOverview'].includes(scene) && <CommonDisplayOptions />}
        
        {/* Show Scene-Specific Options */}
        <SceneSpecificOptions />
        
        {/* Show Visual Design Options for all scenes */}
        <VisualDesignOptions />
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🎬 Broadcast Settings Panel</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={saveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={resetSettings}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              🔒 Lock
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="teamRoster">Team Roster</TabsTrigger>
            <TabsTrigger value="matchupPreview">Matchup</TabsTrigger>
            <TabsTrigger value="playerSpotlight">Spotlight</TabsTrigger>
            <TabsTrigger value="tournamentStats">Stats</TabsTrigger>
            <TabsTrigger value="bracketOverlay">Bracket</TabsTrigger>
            <TabsTrigger value="teamsOverview">Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Global Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Background Color</Label>
                  <Input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Text Color</Label>
                  <Input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => updateSettings({ textColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Header Color</Label>
                  <Input
                    type="color"
                    value={settings.headerTextColor}
                    onChange={(e) => updateSettings({ headerTextColor: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.animationEnabled}
                    onCheckedChange={(checked) => updateSettings({ animationEnabled: checked })}
                  />
                  <Label>Enable Animations</Label>
                </div>
              </div>
            </div>

          </TabsContent>

          <TabsContent value="teamRoster" className="mt-6">
            <SceneCustomization scene="teamRoster" sceneSettings={settings.sceneSettings.teamRoster} />
          </TabsContent>

          <TabsContent value="matchupPreview" className="mt-6">
            <SceneCustomization scene="matchupPreview" sceneSettings={settings.sceneSettings.matchupPreview} />
          </TabsContent>

          <TabsContent value="playerSpotlight" className="mt-6">
            <SceneCustomization scene="playerSpotlight" sceneSettings={settings.sceneSettings.playerSpotlight} />
          </TabsContent>

          <TabsContent value="tournamentStats" className="mt-6">
            <SceneCustomization scene="tournamentStats" sceneSettings={settings.sceneSettings.tournamentStats} />
          </TabsContent>

          <TabsContent value="bracketOverlay" className="mt-6">
            <SceneCustomization scene="bracketOverlay" sceneSettings={settings.sceneSettings.bracketOverlay} />
          </TabsContent>

          <TabsContent value="teamsOverview" className="mt-6">
            <SceneCustomization scene="teamsOverview" sceneSettings={settings.sceneSettings.teamsOverview} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}