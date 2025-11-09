import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface AIHealthMonitorProps {
  tournamentId: string;
  onBracketGenerated: () => void;
  children: React.ReactNode;
}

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  affected_matches: string[];
  suggested_fix: string;
}

interface HealthReport {
  health_score: number;
  status: "healthy" | "warning" | "critical";
  issues: HealthIssue[];
  summary: string;
}

export default function AIHealthMonitor({ 
  tournamentId, 
  onBracketGenerated, 
  children 
}: AIHealthMonitorProps) {
  const { toast } = useToast();
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);

  // Trigger health check after bracket generation
  const handleBracketGenerated = async () => {
    // Call the original callback first
    onBracketGenerated();

    // Wait a moment for the database to settle
    setTimeout(async () => {
      await runHealthCheck();
    }, 1500);
  };

  const runHealthCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-health-check', {
        body: { tournamentId }
      });

      if (error) {
        console.error('Health check failed:', error);
        // Silent failure - don't interrupt admin workflow
        return;
      }

      if (data && data.issues && data.issues.length > 0) {
        setHealthReport(data);
        
        // Show toast based on severity
        const criticalIssues = data.issues.filter((i: HealthIssue) => i.severity === 'critical');
        const warningIssues = data.issues.filter((i: HealthIssue) => i.severity === 'warning');
        
        if (criticalIssues.length > 0) {
          toast({
            title: "⚠️ Critical Bracket Issues Detected",
            description: `${criticalIssues.length} critical issue(s) found. Check AI Health Report below.`,
            variant: "destructive",
          });
        } else if (warningIssues.length > 0) {
          toast({
            title: "⚡ Bracket Warnings",
            description: `${warningIssues.length} warning(s) detected. Review recommended.`,
          });
        }
      } else if (data && data.status === 'healthy') {
        toast({
          title: "✅ Bracket Health Check Passed",
          description: "No issues detected by AI analysis.",
        });
      }
    } catch (err) {
      console.error('Health check error:', err);
      // Silent failure
    }
  };

  // Clone the children element and override its onBracketGenerated prop
  const childrenWithProps = typeof children === 'object' && children && 'type' in children
    ? { ...children, props: { ...children.props, onBracketGenerated: handleBracketGenerated } }
    : children;

  return (
    <>
      {childrenWithProps}
      
      {healthReport && healthReport.issues.length > 0 && (
        <div className="mt-4 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            {healthReport.status === 'critical' && <AlertCircle className="w-5 h-5 text-destructive" />}
            {healthReport.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            {healthReport.status === 'healthy' && <CheckCircle className="w-5 h-5 text-green-500" />}
            <h4 className="font-semibold text-foreground">AI Health Report</h4>
            <span className="text-sm text-muted-foreground ml-auto">
              Score: {healthReport.health_score}/100
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{healthReport.summary}</p>
          
          <div className="space-y-2">
            {healthReport.issues.map((issue, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded border ${
                  issue.severity === 'critical' 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : issue.severity === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/50'
                    : 'bg-blue-500/10 border-blue-500/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                    issue.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
                    issue.severity === 'warning' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {issue.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{issue.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Fix: {issue.suggested_fix}
                    </p>
                    {issue.affected_matches.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Affected: {issue.affected_matches.length} match(es)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
