import { useState } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { Crown, AlertTriangle, ChevronDown, Check } from "lucide-react";
import { PersistentTeamMemberV2, TeamMemberRole } from "@/types/teamV2";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BetaOwnershipTransferProps {
  members: PersistentTeamMemberV2[];
  currentOwnerId: string;
  onTransfer: (newOwnerId: string, newRoleForOldOwner: TeamMemberRole) => Promise<void>;
}

export const BetaOwnershipTransfer = ({
  members,
  currentOwnerId,
  onTransfer,
}: BetaOwnershipTransferProps) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [newRoleForSelf, setNewRoleForSelf] = useState<TeamMemberRole>('manager');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const eligibleMembers = members.filter(m => m.user_id !== currentOwnerId);

  const handleTransfer = async () => {
    if (!selectedMember) return;
    setIsTransferring(true);
    try {
      await onTransfer(selectedMember, newRoleForSelf);
      setShowDialog(false);
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedMemberInfo = eligibleMembers.find(m => m.user_id === selectedMember);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--beta-accent-subtle))] flex items-center justify-center">
          <Crown className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
        </div>
        <div>
          <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">Transfer Ownership</h3>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            Pass team leadership to another member
          </p>
        </div>
      </div>

      {eligibleMembers.length === 0 ? (
        <div className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] text-center">
          <p className="text-[hsl(var(--beta-text-muted))]">
            No other members to transfer ownership to
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
              Select New Owner
            </label>
            <div className="space-y-2">
              {eligibleMembers.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => setSelectedMember(member.user_id)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                    selectedMember === member.user_id
                      ? 'bg-[hsl(var(--beta-accent-subtle))] border-[hsl(var(--beta-accent))] border'
                      : 'bg-[hsl(var(--beta-surface-3))] border border-transparent hover:border-[hsl(var(--beta-border))]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center text-sm font-medium">
                      {(member.users?.discord_username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[hsl(var(--beta-text-primary))]">
                        {member.users?.discord_username || 'Unknown'}
                      </p>
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] capitalize">
                        Current role: {member.role}
                      </p>
                    </div>
                  </div>
                  {selectedMember === member.user_id && (
                    <Check className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* New Role for Self */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
              Your New Role After Transfer
            </label>
            <div className="relative">
              <select
                value={newRoleForSelf}
                onChange={(e) => setNewRoleForSelf(e.target.value as TeamMemberRole)}
                className="w-full appearance-none bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] rounded-lg px-4 py-2.5 pr-10 text-[hsl(var(--beta-text-primary))] cursor-pointer"
              >
                <option value="manager">Manager</option>
                <option value="captain">Captain</option>
                <option value="player">Player</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--beta-text-muted))] pointer-events-none" />
            </div>
          </div>

          {/* Transfer Button with Confirmation */}
          <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogTrigger asChild>
              <BetaButton
                variant="outline"
                className="w-full"
                disabled={!selectedMember}
              >
                <Crown className="w-4 h-4 mr-2" />
                Transfer Ownership
              </BetaButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-border))]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
                  Confirm Ownership Transfer
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[hsl(var(--beta-text-muted))]">
                  You are about to transfer ownership to{' '}
                  <strong className="text-[hsl(var(--beta-text-primary))]">
                    {selectedMemberInfo?.users?.discord_username || 'Unknown'}
                  </strong>
                  . You will become a <strong className="text-[hsl(var(--beta-text-primary))]">{newRoleForSelf}</strong>.
                  This action cannot be easily undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border-[hsl(var(--beta-border))] hover:bg-[hsl(var(--beta-surface-4))]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))] hover:bg-[hsl(var(--beta-accent-muted))]"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </GlassCard>
  );
};

export default BetaOwnershipTransfer;
