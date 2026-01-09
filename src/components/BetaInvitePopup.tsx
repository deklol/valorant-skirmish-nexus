import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const BETA_POPUP_DISMISSED_KEY = "beta_invite_dismissed_until";

export const BetaInvitePopup = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [remindLater, setRemindLater] = useState(false);

  useEffect(() => {
    // Only show for logged in users
    if (!user) return;

    // Check if dismissed
    const dismissedUntil = localStorage.getItem(BETA_POPUP_DISMISSED_KEY);
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        return; // Still dismissed
      }
    }

    // Small delay before showing
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => {
    if (remindLater) {
      // Dismiss for 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      localStorage.setItem(BETA_POPUP_DISMISSED_KEY, threeDaysFromNow.toISOString());
    } else {
      // Dismiss for 30 days (essentially permanent)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      localStorage.setItem(BETA_POPUP_DISMISSED_KEY, thirtyDaysFromNow.toISOString());
    }
    setOpen(false);
  };

  const handleTryBeta = () => {
    // Set a long dismissal so they don't see it when they return
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    localStorage.setItem(BETA_POPUP_DISMISSED_KEY, thirtyDaysFromNow.toISOString());
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 border-indigo-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Try Our New Beta
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            We've been working on a brand new design with enhanced features, live updates, and tournament chats!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Real-time brackets</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Tournament chat</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Global search</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>New notifications</span>
            </div>
          </div>

          {/* Beta preview image/gradient */}
          <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                BETA
              </span>
            </div>
          </div>

          {/* Remind later checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remind-later"
              checked={remindLater}
              onCheckedChange={(checked) => setRemindLater(checked as boolean)}
            />
            <label htmlFor="remind-later" className="text-sm text-slate-400 cursor-pointer">
              Remind me in 3 days
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Maybe Later
          </Button>
          <Link to="/beta" onClick={handleTryBeta} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold">
              Try Beta
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetaInvitePopup;
