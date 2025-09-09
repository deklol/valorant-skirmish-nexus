import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
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
                
                {/* Weight Animation Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">Weight Animation</h5>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={sceneSettings.showBalanceAssessment !== false}
                      onCheckedChange={(checked) => updateSceneSettings(scene, { showBalanceAssessment: checked })}
                    />
                    <Label>Show Balance Assessment</Label>
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
                    checked={sceneSettings.showLargeAvatar !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showLargeAvatar: checked })}
                  />
                  <Label>Large Avatar Display</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showTournamentHistory !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentHistory: checked })}
                  />
                  <Label>Tournament History</Label>
                </div>
                <div className="space-y-2">
                  <Label>Statistics Layout</Label>
                  <Select 
                    value={sceneSettings.statsLayout || 'grid'}
                    onValueChange={(value) => updateSceneSettings(scene, { statsLayout: value as 'grid' | 'stacked' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* OBS/vMix Block Color Controls */}
                <div className="space-y-2 col-span-2">
                  <h5 className="font-medium">OBS/vMix Block Colors</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Background Color</Label>
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
                    checked={sceneSettings.showTournamentStatusFooter !== false}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showTournamentStatusFooter: checked })}
                  />
                  <Label>Tournament Status Footer</Label>
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
              🎥 Transparent Background (OBS Green Screen Mode)
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Background Color</Label>
            <Input
              type="color"
              value={sceneSettings.backgroundColor || settings.backgroundColor}
              onChange={(e) => updateSceneSettings(scene, { backgroundColor: e.target.value })}
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
    <Card className="w-full h-[85vh] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>🎬 Broadcast Settings Panel</span>
          <div className="flex space-x-2">
            <Button onClick={resetSettings} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button onClick={logout} variant="outline" size="sm">
              🔒
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <Tabs defaultValue="scenes" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-6 mb-4 flex-shrink-0">
            <TabsTrigger value="scenes">Scene Settings</TabsTrigger>
            <TabsTrigger value="export">Export/Import</TabsTrigger>
            <TabsTrigger value="urls">Broadcast URLs</TabsTrigger>
            <TabsTrigger value="global">Global Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6">
              <TabsContent value="scenes" className="mt-0 space-y-6">
                <Tabs defaultValue="teamRoster" orientation="vertical" className="flex space-x-6">
                  <TabsList className="flex flex-col h-fit space-y-1 w-40 flex-shrink-0">
                    <TabsTrigger value="teamRoster" className="w-full justify-start">Team Roster</TabsTrigger>
                    <TabsTrigger value="matchupPreview" className="w-full justify-start">Matchup Preview</TabsTrigger>
                    <TabsTrigger value="playerSpotlight" className="w-full justify-start">Player Spotlight</TabsTrigger>
                    <TabsTrigger value="tournamentStats" className="w-full justify-start">Tournament Stats</TabsTrigger>
                    <TabsTrigger value="bracketOverlay" className="w-full justify-start">Bracket Overlay</TabsTrigger>
                    <TabsTrigger value="teamsOverview" className="w-full justify-start">Teams Overview</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 space-y-6">
                    <TabsContent value="teamRoster" className="mt-0">
                      <SceneCustomization scene="teamRoster" sceneSettings={settings.sceneSettings.teamRoster} />
                    </TabsContent>

                    <TabsContent value="matchupPreview" className="mt-0">
                      <SceneCustomization scene="matchupPreview" sceneSettings={settings.sceneSettings.matchupPreview} />
                    </TabsContent>

                    <TabsContent value="playerSpotlight" className="mt-0">
                      <SceneCustomization scene="playerSpotlight" sceneSettings={settings.sceneSettings.playerSpotlight} />
                    </TabsContent>

                    <TabsContent value="tournamentStats" className="mt-0">
                      <SceneCustomization scene="tournamentStats" sceneSettings={settings.sceneSettings.tournamentStats} />
                    </TabsContent>

                    <TabsContent value="bracketOverlay" className="mt-0">
                      <SceneCustomization scene="bracketOverlay" sceneSettings={settings.sceneSettings.bracketOverlay} />
                    </TabsContent>

                    <TabsContent value="teamsOverview" className="mt-0">
                      <SceneCustomization scene="teamsOverview" sceneSettings={settings.sceneSettings.teamsOverview} />
                    </TabsContent>
                  </div>
                </Tabs>
              </TabsContent>

              <TabsContent value="export" className="mt-0 space-y-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Export/Import Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Export Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Save your current broadcast settings to a file for backup or sharing.
                      </p>
                      <Button 
                        onClick={() => {
                          const data = JSON.stringify(settings, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `broadcast-settings-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast({
                            title: "Settings Exported",
                            description: "Your broadcast settings have been downloaded as a JSON file.",
                          });
                        }}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Export Settings to File
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Import Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Load broadcast settings from a previously exported file.
                      </p>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const importedSettings = JSON.parse(event.target?.result as string);
                                // Validate and merge settings here
                                updateSettings(importedSettings);
                                toast({
                                  title: "Settings Imported",
                                  description: "Your broadcast settings have been successfully imported.",
                                });
                              } catch (error) {
                                toast({
                                  title: "Import Failed",
                                  description: "The selected file is not a valid settings file.",
                                  variant: "destructive",
                                });
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="urls" className="mt-0 space-y-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Broadcast URLs</h3>
                  <p className="text-sm text-muted-foreground">
                    Copy these URLs to use in OBS, vMix, or other streaming software. Replace the parameters with actual IDs.
                  </p>
                  
                  <div className="grid gap-4">
                    {Object.entries(broadcastUrls).map(([key, url]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(url, key)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(url.replace(/:tournamentId|:teamId|:team1Id|:team2Id|:playerId/g, '1'), '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={url}
                          readOnly
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="global" className="mt-0 space-y-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Global Settings</h3>
                  
                  <div className="space-y-4">
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
            </ScrollArea>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}