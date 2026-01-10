import { useState } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { AlertTriangle, MessageSquare, Upload, X, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { useMatchDisputes, MatchDispute } from "@/hooks/useMatchDisputes";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface BetaDisputePanelProps {
  matchId: string;
  tournamentId: string;
  userTeamId?: string;
  matchStatus: string;
}

/**
 * BetaDisputePanel - Captain-facing dispute interface
 * 
 * Allows team captains/owners to:
 * - Raise disputes on matches
 * - View their dispute status
 * - Provide reason and evidence
 */
export const BetaDisputePanel = ({ 
  matchId, 
  tournamentId, 
  userTeamId,
  matchStatus 
}: BetaDisputePanelProps) => {
  const { user } = useAuth();
  const { disputes, loading, submitting, raiseDispute, getDisputesForMatch } = useMatchDisputes(undefined, matchId);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const matchDisputes = getDisputesForMatch(matchId);
  const userDispute = matchDisputes.find(d => d.raised_by === user?.id);
  const canRaiseDispute = userTeamId && matchStatus === 'completed' && !userDispute;

  const handleAddEvidence = () => {
    if (evidenceUrl.trim() && evidenceUrls.length < 5) {
      setEvidenceUrls([...evidenceUrls, evidenceUrl.trim()]);
      setEvidenceUrl("");
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim() || !userTeamId) return;

    const success = await raiseDispute({
      matchId,
      tournamentId,
      teamId: userTeamId,
      reason: reason.trim(),
      evidenceUrls,
    });

    if (success) {
      setShowForm(false);
      setReason("");
      setEvidenceUrls([]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <BetaBadge variant="warning" size="sm"><Clock className="w-3 h-3 mr-1" /> Open</BetaBadge>;
      case 'under_review':
        return <BetaBadge variant="accent" size="sm"><Eye className="w-3 h-3 mr-1" /> Under Review</BetaBadge>;
      case 'resolved':
        return <BetaBadge variant="success" size="sm"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</BetaBadge>;
      case 'rejected':
        return <BetaBadge variant="error" size="sm"><XCircle className="w-3 h-3 mr-1" /> Rejected</BetaBadge>;
      default:
        return <BetaBadge variant="default" size="sm">{status}</BetaBadge>;
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading disputes...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
          Match Disputes
        </h4>
        {canRaiseDispute && !showForm && (
          <BetaButton variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Raise Dispute
          </BetaButton>
        )}
      </div>

      {/* Existing Disputes */}
      {matchDisputes.length > 0 && (
        <div className="space-y-3 mb-4">
          {matchDisputes.map((dispute) => (
            <div 
              key={dispute.id}
              className="p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]"
            >
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(dispute.status)}
                <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                  {format(new Date(dispute.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-[hsl(var(--beta-text-secondary))] mb-2">{dispute.reason}</p>
              
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {dispute.evidence_urls.map((url, i) => (
                    <a 
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[hsl(var(--beta-accent))] hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {dispute.resolution && (
                <div className="mt-2 pt-2 border-t border-[hsl(var(--beta-border))]">
                  <p className="text-xs text-[hsl(var(--beta-text-muted))]">Resolution:</p>
                  <p className="text-sm text-[hsl(var(--beta-text-secondary))]">{dispute.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Raise Dispute Form */}
      {showForm && (
        <div className="space-y-4 p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))]">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
              Reason for Dispute *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're disputing this match result..."
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))] resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-2">
              Evidence (Screenshots/Videos)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Paste image/video URL..."
                className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
              />
              <BetaButton 
                variant="outline" 
                size="sm" 
                onClick={handleAddEvidence}
                disabled={!evidenceUrl.trim() || evidenceUrls.length >= 5}
              >
                Add
              </BetaButton>
            </div>
            {evidenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {evidenceUrls.map((url, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[hsl(var(--beta-surface-4))] text-xs"
                  >
                    <span className="text-[hsl(var(--beta-text-secondary))] truncate max-w-[150px]">
                      {url}
                    </span>
                    <button 
                      onClick={() => handleRemoveEvidence(i)}
                      className="text-[hsl(var(--beta-error))] hover:text-[hsl(var(--beta-error)/0.8)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">
              Max 5 evidence links. Use image hosting or video links.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <BetaButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </BetaButton>
            <BetaButton 
              size="sm" 
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </BetaButton>
          </div>
        </div>
      )}

      {/* No disputes and can't raise */}
      {matchDisputes.length === 0 && !canRaiseDispute && !showForm && (
        <p className="text-sm text-[hsl(var(--beta-text-muted))] text-center py-4">
          {matchStatus !== 'completed' 
            ? 'Disputes can only be raised after match completion'
            : 'No disputes for this match'
          }
        </p>
      )}
    </GlassCard>
  );
};
