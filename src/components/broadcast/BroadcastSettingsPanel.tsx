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
  }) => (
    <div className="space-y-6">
      {/* Display Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Display Options</h4>
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
        </div>
      </div>

      {/* Visual Customization */}
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

      {/* Animation */}
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Animation</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={sceneSettings.animationEnabled !== false}
              onCheckedChange={(checked) => updateSceneSettings(scene, { animationEnabled: checked })}
            />
            <Label>Enable Animations</Label>
          </div>

          <div className="space-y-2">
            <Label>Animation Duration: {sceneSettings.animationDuration || 500}ms</Label>
            <Slider
              value={[sceneSettings.animationDuration || 500]}
              onValueChange={([value]) => updateSceneSettings(scene, { animationDuration: value })}
              max={2000}
              min={100}
              step={50}
            />
          </div>
        </div>
      </div>
    </div>
  );

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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="team-roster">Team Roster</TabsTrigger>
                <TabsTrigger value="matchup">Matchup</TabsTrigger>
                <TabsTrigger value="spotlight">Spotlight</TabsTrigger>
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}