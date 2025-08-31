import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useBroadcastSettings, type BroadcastDisplaySettings } from '@/hooks/useBroadcastSettings';

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

  const DisplaySettingsSection = ({ 
    title, 
    settings: displaySettings, 
    onUpdate 
  }: { 
    title: string; 
    settings: BroadcastDisplaySettings; 
    onUpdate: (settings: Partial<BroadcastDisplaySettings>) => void;
  }) => (
    <div className="space-y-4">
      <h4 className="font-medium">{title}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={displaySettings.showAdaptiveWeight}
            onCheckedChange={(checked) => onUpdate({ showAdaptiveWeight: checked })}
          />
          <Label>Adaptive Weight</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={displaySettings.showCurrentRank}
            onCheckedChange={(checked) => onUpdate({ showCurrentRank: checked })}
          />
          <Label>Current Rank</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={displaySettings.showPeakRank}
            onCheckedChange={(checked) => onUpdate({ showPeakRank: checked })}
          />
          <Label>Peak Rank</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={displaySettings.showTournamentWins}
            onCheckedChange={(checked) => onUpdate({ showTournamentWins: checked })}
          />
          <Label>Tournament Wins</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={displaySettings.showRiotId}
            onCheckedChange={(checked) => onUpdate({ showRiotId: checked })}
          />
          <Label>Riot ID</Label>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>⚙️ Broadcast Settings</CardTitle>
        <div className="flex gap-2">
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
      <CardContent>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="scenes">Scenes</TabsTrigger>
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

          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Header Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.headerTextColor}
                    onChange={(e) => updateSettings({ headerTextColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.headerTextColor}
                    onChange={(e) => updateSettings({ headerTextColor: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => updateSettings({ textColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.textColor}
                    onChange={(e) => updateSettings({ textColor: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.backgroundColor === 'transparent' ? '#000000' : settings.backgroundColor}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Select 
                    value={settings.backgroundColor} 
                    onValueChange={(value) => updateSettings({ backgroundColor: value })}
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
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4">
            <DisplaySettingsSection
              title="Global Display Settings"
              settings={settings.displaySettings}
              onUpdate={(newSettings) => updateSettings({ 
                displaySettings: { ...settings.displaySettings, ...newSettings }
              })}
            />
          </TabsContent>

          <TabsContent value="scenes" className="space-y-6">
            <DisplaySettingsSection
              title="Team Roster Scene"
              settings={settings.sceneSettings.teamRoster}
              onUpdate={(newSettings) => updateSceneSettings('teamRoster', newSettings)}
            />
            
            <DisplaySettingsSection
              title="Matchup Preview Scene"
              settings={settings.sceneSettings.matchupPreview}
              onUpdate={(newSettings) => updateSceneSettings('matchupPreview', newSettings)}
            />
            
            <DisplaySettingsSection
              title="Player Spotlight Scene"
              settings={settings.sceneSettings.playerSpotlight}
              onUpdate={(newSettings) => updateSceneSettings('playerSpotlight', newSettings)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}