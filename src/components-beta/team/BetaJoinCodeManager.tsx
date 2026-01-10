import { useState } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { Key, Copy, RefreshCw, Check, Eye, EyeOff, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BetaJoinCodeManagerProps {
  inviteCode: string;
  joinCodeVersion: number;
  generatedAt: string;
  onRegenerate: () => Promise<void>;
  canManage?: boolean;
}

export const BetaJoinCodeManager = ({
  inviteCode,
  joinCodeVersion,
  generatedAt,
  onRegenerate,
  canManage = false,
}: BetaJoinCodeManagerProps) => {
  const { toast } = useToast();
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Join code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
      toast({ title: "Code regenerated", description: "New join code has been created" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const maskedCode = showCode ? inviteCode : '••••••';

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
            <Key className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          </div>
          <div>
            <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">Join Code</h3>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">
              Share this code to invite players
            </p>
          </div>
        </div>
        <BetaBadge variant="default" size="sm">
          v{joinCodeVersion}
        </BetaBadge>
      </div>

      {/* Code Display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-[hsl(var(--beta-surface-3))] rounded-lg px-4 py-3 font-mono text-lg tracking-widest text-center text-[hsl(var(--beta-text-primary))]">
          {maskedCode}
        </div>
        
        <BetaButton
          variant="ghost"
          size="sm"
          onClick={() => setShowCode(!showCode)}
          className="shrink-0"
        >
          {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </BetaButton>

        <BetaButton
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-[hsl(var(--beta-success))]" /> : <Copy className="w-4 h-4" />}
        </BetaButton>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-[hsl(var(--beta-text-muted))]">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Generated {format(new Date(generatedAt), 'MMM d, yyyy')}</span>
        </div>
        
        {canManage && (
          <BetaButton
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </BetaButton>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
        <p className="text-xs text-[hsl(var(--beta-text-muted))]">
          <strong className="text-[hsl(var(--beta-text-secondary))]">Note:</strong> Join codes automatically rotate when members join or leave the team for security.
        </p>
      </div>
    </GlassCard>
  );
};

export default BetaJoinCodeManager;
