import { useState } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  AlertTriangle, MessageSquare, Eye, CheckCircle, XCircle, 
  Clock, ChevronDown, ChevronUp, ExternalLink, Gavel
} from "lucide-react";
import { useMatchDisputes, MatchDispute, DisputeStatus } from "@/hooks/useMatchDisputes";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface BetaDisputeManagerProps {
  tournamentId?: string;
}

/**
 * BetaDisputeManager - Admin-facing dispute management interface
 * 
 * Allows admins to:
 * - View all disputes for a tournament (or all tournaments if no tournamentId)
 * - Change dispute status
 * - Add resolution notes
 * - Take action on match results
 */
export const BetaDisputeManager = ({ tournamentId }: BetaDisputeManagerProps) => {
  // If no tournamentId, fetch all disputes (admin panel mode)
  const { disputes, loading, submitting, updateDisputeStatus, resolveDispute, getOpenDisputes } = useMatchDisputes(tournamentId, undefined, !tournamentId);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | 'all'>('all');

  const openDisputes = getOpenDisputes();
  
  const filteredDisputes = filterStatus === 'all' 
    ? disputes 
    : disputes.filter(d => d.status === filterStatus);

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

  const handleResolve = async (disputeId: string, status: 'resolved' | 'rejected') => {
    const success = await resolveDispute({
      disputeId,
      status,
      resolution,
      adminNotes,
    });

    if (success) {
      setExpandedDispute(null);
      setResolution("");
      setAdminNotes("");
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center gap-2 text-[hsl(var(--beta-text-muted))]">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading disputes...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Gavel className="w-6 h-6 text-[hsl(var(--beta-warning))]" />
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              Dispute Manager
            </h3>
            <p className="text-sm text-[hsl(var(--beta-text-muted))]">
              {openDisputes.length} open dispute{openDisputes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'under_review', 'resolved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]'
                  : 'bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filteredDisputes.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
          <p className="text-[hsl(var(--beta-text-muted))]">
            {filterStatus === 'all' ? 'No disputes filed for this tournament' : `No ${filterStatus.replace('_', ' ')} disputes`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <div 
              key={dispute.id}
              className="rounded-lg border border-[hsl(var(--beta-border))] bg-[hsl(var(--beta-surface-3))] overflow-hidden"
            >
              {/* Dispute Header */}
              <button
                onClick={() => setExpandedDispute(expandedDispute === dispute.id ? null : dispute.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-[hsl(var(--beta-surface-4))] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getStatusBadge(dispute.status)}
                  <div className="text-left">
                    <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">
                      Match R{dispute.matches?.round_number || '?'}M{dispute.matches?.match_number || '?'}
                    </p>
                    <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                      Filed {format(new Date(dispute.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {expandedDispute === dispute.id ? (
                  <ChevronUp className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedDispute === dispute.id && (
                <div className="p-4 pt-0 border-t border-[hsl(var(--beta-border))] space-y-4">
                  {/* Dispute Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">Reason</p>
                      <p className="text-sm text-[hsl(var(--beta-text-secondary))]">{dispute.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">Match Score</p>
                      <p className="text-sm text-[hsl(var(--beta-text-primary))]">
                        Team 1: {dispute.matches?.score_team1 || 0} vs Team 2: {dispute.matches?.score_team2 || 0}
                      </p>
                    </div>
                  </div>

                  {/* Evidence Links */}
                  {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                    <div>
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-2">Evidence</p>
                      <div className="flex flex-wrap gap-2">
                        {dispute.evidence_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[hsl(var(--beta-surface-4))] text-xs text-[hsl(var(--beta-accent))] hover:bg-[hsl(var(--beta-surface-4)/0.8)]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Evidence {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions for Open/Under Review */}
                  {(dispute.status === 'open' || dispute.status === 'under_review') && (
                    <div className="space-y-4 pt-4 border-t border-[hsl(var(--beta-border))]">
                      {/* Quick Status Change */}
                      {dispute.status === 'open' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[hsl(var(--beta-text-muted))]">Mark as:</span>
                          <BetaButton 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateDisputeStatus(dispute.id, 'under_review')}
                            disabled={submitting}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Under Review
                          </BetaButton>
                        </div>
                      )}

                      {/* Resolution Form */}
                      <div>
                        <label className="block text-xs text-[hsl(var(--beta-text-muted))] mb-2">
                          Resolution (required)
                        </label>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="Describe the outcome and any actions taken..."
                          className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))] resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[hsl(var(--beta-text-muted))] mb-2">
                          Admin Notes (internal)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes for admins..."
                          className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] placeholder:text-[hsl(var(--beta-text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))] resize-none"
                          rows={2}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <BetaButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(dispute.id, 'resolved')}
                          disabled={!resolution.trim() || submitting}
                          className="border-[hsl(var(--beta-success))] text-[hsl(var(--beta-success))]"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Resolve (Accept)
                        </BetaButton>
                        <BetaButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(dispute.id, 'rejected')}
                          disabled={!resolution.trim() || submitting}
                          className="border-[hsl(var(--beta-error))] text-[hsl(var(--beta-error))]"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </BetaButton>
                        <Link to={`/beta/match/${dispute.match_id}`}>
                          <BetaButton variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Match
                          </BetaButton>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Show Resolution for Resolved/Rejected */}
                  {(dispute.status === 'resolved' || dispute.status === 'rejected') && dispute.resolution && (
                    <div className="pt-4 border-t border-[hsl(var(--beta-border))]">
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] mb-1">Resolution</p>
                      <p className="text-sm text-[hsl(var(--beta-text-secondary))]">{dispute.resolution}</p>
                      {dispute.resolved_at && (
                        <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-2">
                          Resolved on {format(new Date(dispute.resolved_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
