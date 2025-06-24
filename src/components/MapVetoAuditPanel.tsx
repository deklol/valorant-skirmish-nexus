
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { auditMapVetoSystem, cleanupVetoSessions, type VetoAuditResult } from '@/utils/mapVetoAudit';

interface MapVetoAuditPanelProps {
  tournamentId?: string;
}

const MapVetoAuditPanel = ({ tournamentId }: MapVetoAuditPanelProps) => {
  const [auditResult, setAuditResult] = useState<VetoAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { toast } = useToast();

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await auditMapVetoSystem(tournamentId);
      setAuditResult(result);
      
      if (!result.isHealthy) {
        toast({
          title: "Map Veto Issues Found",
          description: `Found ${result.issues.length} critical issues`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Map Veto Audit Complete",
          description: "System appears healthy",
        });
      }
    } catch (error: any) {
      toast({
        title: "Audit Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!auditResult || auditResult.issues.length === 0) return;

    setCleaning(true);
    try {
      // Extract session IDs from stuck session issues
      const stuckSessionIds = auditResult.issues
        .filter(issue => issue.includes('is stuck'))
        .map(issue => issue.match(/Session (\w+)/)?.[1])
        .filter(Boolean) as string[];

      if (stuckSessionIds.length > 0) {
        const cleanupResult = await cleanupVetoSessions(stuckSessionIds);
        
        toast({
          title: "Cleanup Complete",
          description: `Cleaned ${cleanupResult.cleaned} sessions. ${cleanupResult.errors.length} errors.`,
          variant: cleanupResult.errors.length > 0 ? "destructive" : "default",
        });

        // Re-run audit after cleanup
        await runAudit();
      }
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, [tournamentId]);

  const getHealthBadge = () => {
    if (!auditResult) return null;
    
    if (auditResult.isHealthy) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
    } else {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Issues Found</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Map Veto System Audit
            {getHealthBadge()}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={runAudit}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh Audit
            </Button>
            {auditResult && auditResult.issues.length > 0 && (
              <Button
                onClick={handleCleanup}
                disabled={cleaning}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {cleaning ? 'Cleaning...' : 'Cleanup Issues'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Running map veto audit...</p>
          </div>
        ) : auditResult ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{auditResult.sessionCount}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{auditResult.completedSessions}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{auditResult.issues.length}</div>
                <div className="text-sm text-gray-600">Critical Issues</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{auditResult.warnings.length}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>

            {/* Critical Issues */}
            {auditResult.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Critical Issues ({auditResult.issues.length})
                </h3>
                <div className="space-y-1">
                  {auditResult.issues.map((issue, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {auditResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-yellow-600">Warnings ({auditResult.warnings.length})</h3>
                <div className="space-y-1">
                  {auditResult.warnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-700">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {auditResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">Recommendations</h3>
                <div className="space-y-1">
                  {auditResult.recommendations.map((rec, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Clear Message */}
            {auditResult.isHealthy && auditResult.issues.length === 0 && auditResult.warnings.length === 0 && (
              <div className="text-center py-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Map Veto System is Healthy</p>
                <p className="text-green-600 text-sm">No issues or warnings detected</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Click "Refresh Audit" to run system diagnostics
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapVetoAuditPanel;
