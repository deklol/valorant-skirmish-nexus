
import { CheckCircle, AlertTriangle } from "lucide-react";

interface BalancingStatusProps {
  status: 'idle' | 'balancing' | 'complete';
}

export const BalancingStatus = ({ status }: BalancingStatusProps) => {
  if (status === 'balancing') {
    return (
      <div className="flex items-center gap-2 text-yellow-400">
        <AlertTriangle className="w-4 h-4" />
        <span>Balancing teams and sending notifications...</span>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span>Teams balanced successfully! Players have been notified.</span>
      </div>
    );
  }

  return null;
};
