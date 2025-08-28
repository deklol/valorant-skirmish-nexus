import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, X } from "lucide-react";
import type { BroadcastConfig, SceneType, TransitionType } from "@/hooks/useBroadcastScene";

interface BroadcastConfigProps {
  config: BroadcastConfig;
  onUpdate: (config: Partial<BroadcastConfig>) => void;
}

export default function BroadcastConfig({ config, onUpdate }: BroadcastConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sceneOptions: { value: SceneType; label: string }[] = [
    { value: 'team-showcase', label: 'Team Showcase' },
    { value: 'team-comparison', label: 'Team Comparison' },
    { value: 'player-spotlight', label: 'Player Spotlight' },
    { value: 'bracket', label: 'Bracket View' }
  ];

  const transitionOptions: { value: TransitionType; label: string }[] = [
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'cascade', label: 'Cascade' }
  ];

  const handleSceneToggle = (scene: SceneType, enabled: boolean) => {
    const newEnabledScenes = enabled 
      ? [...config.enabledScenes, scene]
      : config.enabledScenes.filter(s => s !== scene);
    
    if (newEnabledScenes.length > 0) {
      onUpdate({ enabledScenes: newEnabledScenes });
    }
  };

  return (
    <>
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 bg-black/80 backdrop-blur border border-white/20 text-white hover:bg-white/20"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <Card className="bg-black/90 backdrop-blur border-white/20 p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Broadcast Settings</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Auto-play Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Auto-play</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoplay" className="text-slate-300">Enable Auto-play</Label>
                  <Switch
                    id="autoplay"
                    checked={config.autoPlay}
                    onCheckedChange={(checked) => onUpdate({ autoPlay: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-slate-300">Scene Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="3"
                    max="60"
                    value={config.duration}
                    onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 8 })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Transition Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Transitions</h3>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Transition Effect</Label>
                  <Select
                    value={config.transition}
                    onValueChange={(value: TransitionType) => onUpdate({ transition: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {transitionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-white">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scene Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Active Scenes</h3>
                
                <div className="space-y-3">
                  {sceneOptions.map((scene) => (
                    <div key={scene.value} className="flex items-center justify-between">
                      <Label className="text-slate-300">{scene.label}</Label>
                      <Switch
                        checked={config.enabledScenes.includes(scene.value)}
                        onCheckedChange={(checked) => handleSceneToggle(scene.value, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Background</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="bgcolor" className="text-slate-300">Background Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="bgcolor"
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1 bg-slate-800 border-slate-600"
                    />
                    <Input
                      type="text"
                      value={config.backgroundColor}
                      onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                      className="flex-1 bg-slate-800 border-slate-600 text-white"
                      placeholder="#0f172a"
                    />
                  </div>
                </div>

                {/* Preset Colors */}
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#0f172a', // slate-900
                    '#1e293b', // slate-800
                    '#000000', // black
                    '#1f2937', // gray-800
                    '#0c1220', // dark blue
                    '#1a1a2e'  // dark purple
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border-2 border-white/20 hover:border-white/40 transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdate({ backgroundColor: color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="mt-8">
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply Settings
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}