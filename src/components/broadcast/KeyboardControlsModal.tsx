import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Space } from "lucide-react";

interface KeyboardControlsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardControlsModal({ open, onOpenChange }: KeyboardControlsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/90 backdrop-blur border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Keyboard className="w-8 h-8 text-blue-400" />
            <span>Keyboard Controls</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-lg">
            Control the broadcast presentation using these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation Controls */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-400">Navigation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Next Scene/Team</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <ArrowRight className="w-4 h-4" />
                    <span>→</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Previous Scene/Team</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <ArrowLeft className="w-4 h-4" />
                    <span>←</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Next Scene Type</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <ArrowUp className="w-4 h-4" />
                    <span>↑</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Previous Scene Type</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <ArrowDown className="w-4 h-4" />
                    <span>↓</span>
                  </Badge>
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-400">Playback</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Play/Pause</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <Space className="w-4 h-4" />
                    <span>Space</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Toggle Controls</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <span>H</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Hide This Help</span>
                  <Badge variant="outline" className="flex items-center space-x-1 border-white/30 text-white">
                    <span>Esc</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Number Keys */}
          <div className="border-t border-white/20 pt-4">
            <h3 className="text-xl font-semibold text-purple-400 mb-3">Quick Scene Selection</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <Badge variant="outline" className="w-8 h-8 justify-center border-white/30 text-white mb-1">1</Badge>
                <p className="text-xs text-slate-400">Team Showcase</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="w-8 h-8 justify-center border-white/30 text-white mb-1">2</Badge>
                <p className="text-xs text-slate-400">Team Comparison</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="w-8 h-8 justify-center border-white/30 text-white mb-1">3</Badge>
                <p className="text-xs text-slate-400">Player Spotlight</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="w-8 h-8 justify-center border-white/30 text-white mb-1">4</Badge>
                <p className="text-xs text-slate-400">Bracket View</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>Tip:</strong> Press <kbd className="bg-white/20 px-2 py-1 rounded text-xs">H</kbd> at any time to toggle the control panel visibility for a cleaner broadcast view.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}