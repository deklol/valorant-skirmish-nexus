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
                    checked={sceneSettings.showCaptainBadges ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showCaptainBadges: checked })}
                  />
                  <Label>Captain Badges</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showRankEmojis ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showRankEmojis: checked })}
                  />
                  <Label>Rank Emojis</Label>
                </div>
                <div className="space-y-2 col-span-2">
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
                    checked={sceneSettings.showVsHeader ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showVsHeader: checked })}
                  />
                  <Label>VS Header with Swords</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showWeightDifference ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showWeightDifference: checked })}
                  />
                  <Label>Weight Difference Box</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sceneSettings.showBalanceAssessment ?? true}
                    onCheckedChange={(checked) => updateSceneSettings(scene, { showBalanceAssessment: checked })}
                  />
                  <Label>Balance Assessment Text</Label>
                </div>
                <div className="space-y-2">
                  <Label>Layout Style</Label>
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
                  <Label>Stats Layout</Label>
                  <Select 
                    value={sceneSettings.statsLayout || 'grid'} 
                    onValueChange={(value) => updateSceneSettings(scene, { statsLayout: value as 'grid' | 'stacked' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">2-Column Grid</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label>Card Layout</Label>
                  <Select 
                    value={sceneSettings.statCardLayout || 'grid'} 
                    onValueChange={(value) => updateSceneSettings(scene, { statCardLayout: value as 'grid' | 'row' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="row">Row</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label>Winner Highlighting</Label>
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
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="space-y-6">
        <CommonDisplayOptions />
        <SceneSpecificOptions />
        
        {/* Visual Customization - Common to all scenes */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Visual Design</h4>
          
          {/* Background */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={sceneSettings.backgroundColor === 'transparent' ? '#000000' : sceneSettings.backgroundColor}
                  onChange={(e) => updateSceneSettings(scene, { backgroundColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Select 
                  value={sceneSettings.backgroundColor || 'transparent'} 
                  onValueChange={(value) => updateSceneSettings(scene, { backgroundColor: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transparent">Transparent</SelectItem>
                    <SelectItem value="#000000">Black</SelectItem>
                    <SelectItem value="#1a1a1a">Dark Gray</SelectItem>
                    <SelectItem value="#2d2d2d">Medium Gray</SelectItem>
                    <SelectItem value="#ffffff">White</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <Input
                type="url"
                value={sceneSettings.backgroundImage || ''}
                onChange={(e) => updateSceneSettings(scene, { backgroundImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={sceneSettings.textColor || '#ffffff'}
                  onChange={(e) => updateSceneSettings(scene, { textColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={sceneSettings.textColor || '#ffffff'}
                  onChange={(e) => updateSceneSettings(scene, { textColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Header Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={sceneSettings.headerTextColor || '#ffffff'}
                  onChange={(e) => updateSceneSettings(scene, { headerTextColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={sceneSettings.headerTextColor || '#ffffff'}
                  onChange={(e) => updateSceneSettings(scene, { headerTextColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Border & Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Border Radius: {sceneSettings.borderRadius || 12}px</Label>
              <Slider
                value={[sceneSettings.borderRadius || 12]}
                onValueChange={([value]) => updateSceneSettings(scene, { borderRadius: value })}
                max={50}
                min={0}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Border Width: {sceneSettings.borderWidth || 1}px</Label>
              <Slider
                value={[sceneSettings.borderWidth || 1]}
                onValueChange={([value]) => updateSceneSettings(scene, { borderWidth: value })}
                max={10}
                min={0}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Border Color</Label>
              <Input
                type="text"
                value={sceneSettings.borderColor || '#ffffff20'}
                onChange={(e) => updateSceneSettings(scene, { borderColor: e.target.value })}
                placeholder="#ffffff20"
              />
            </div>

            <div className="space-y-2">
              <Label>Shadow Intensity: {sceneSettings.shadowIntensity || 3}</Label>
              <Slider
                value={[sceneSettings.shadowIntensity || 3]}
                onValueChange={([value]) => updateSceneSettings(scene, { shadowIntensity: value })}
                max={10}
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Typography</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select 
                value={sceneSettings.fontFamily || 'inherit'} 
                onValueChange={(value) => updateSceneSettings(scene, { fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Default</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="'Helvetica Neue', sans-serif">Helvetica</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                  <SelectItem value="'Georgia', serif">Georgia</SelectItem>
                  <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Weight</Label>
              <Select 
                value={sceneSettings.fontWeight || 'normal'} 
                onValueChange={(value) => updateSceneSettings(scene, { fontWeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lighter">Lighter</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="bolder">Bolder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Size: {sceneSettings.fontSize || 16}px</Label>
              <Slider
                value={[sceneSettings.fontSize || 16]}
                onValueChange={([value]) => updateSceneSettings(scene, { fontSize: value })}
                max={32}
                min={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Header Font Size: {sceneSettings.headerFontSize || 24}px</Label>
              <Slider
                value={[sceneSettings.headerFontSize || 24]}
                onValueChange={([value]) => updateSceneSettings(scene, { headerFontSize: value })}
                max={64}
                min={14}
                step={2}
              />
            </div>
          </div>
        </div>

        {/* Layout & Spacing */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Layout & Spacing</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Padding: {sceneSettings.padding || 16}px</Label>
              <Slider
                value={[sceneSettings.padding || 16]}
                onValueChange={([value]) => updateSceneSettings(scene, { padding: value })}
                max={50}
                min={0}
                step={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Element Spacing: {sceneSettings.spacing || 8}px</Label>
              <Slider
                value={[sceneSettings.spacing || 8]}
                onValueChange={([value]) => updateSceneSettings(scene, { spacing: value })}
                max={30}
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex">
      {/* Right Panel - Settings (now full width) */}
      <div className="w-full p-6">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>⚙️ Broadcast Settings</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveSettings}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetSettings}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                Lock
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="team-roster">Team Roster</TabsTrigger>
                <TabsTrigger value="matchup">Matchup</TabsTrigger>
                <TabsTrigger value="spotlight">Spotlight</TabsTrigger>
                <TabsTrigger value="tournament-stats">Stats</TabsTrigger>
                <TabsTrigger value="bracket">Bracket</TabsTrigger>
                <TabsTrigger value="teams-overview">Teams</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loading Time (ms)</Label>
                    <Input
                      type="number"
                      value={settings.loadingTime}
                      onChange={(e) => updateSettings({ loadingTime: Number(e.target.value) })}
                      min={500}
                      max={10000}
                      step={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transition Time (ms)</Label>
                    <Input
                      type="number"
                      value={settings.transitionTime}
                      onChange={(e) => updateSettings({ transitionTime: Number(e.target.value) })}
                      min={100}
                      max={2000}
                      step={100}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Transition Type</Label>
                  <Select 
                    value={settings.transitionType} 
                    onValueChange={(value) => updateSettings({ transitionType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="team-roster" className="space-y-4">
                <SceneCustomization 
                  scene="teamRoster" 
                  sceneSettings={settings.sceneSettings.teamRoster} 
                />
              </TabsContent>

              <TabsContent value="matchup" className="space-y-4">
                <SceneCustomization 
                  scene="matchupPreview" 
                  sceneSettings={settings.sceneSettings.matchupPreview} 
                />
              </TabsContent>

              <TabsContent value="spotlight" className="space-y-4">
                <SceneCustomization 
                  scene="playerSpotlight" 
                  sceneSettings={settings.sceneSettings.playerSpotlight} 
                />
              </TabsContent>

              <TabsContent value="tournament-stats" className="space-y-4">
                <SceneCustomization 
                  scene="tournamentStats" 
                  sceneSettings={settings.sceneSettings.tournamentStats} 
                />
              </TabsContent>

              <TabsContent value="bracket" className="space-y-4">
                <SceneCustomization 
                  scene="bracketOverlay" 
                  sceneSettings={settings.sceneSettings.bracketOverlay} 
                />
              </TabsContent>

              <TabsContent value="teams-overview" className="space-y-4">
                <SceneCustomization 
                  scene="teamsOverview" 
                  sceneSettings={settings.sceneSettings.teamsOverview} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}