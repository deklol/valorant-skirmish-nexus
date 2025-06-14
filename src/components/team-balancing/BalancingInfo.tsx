
export const BalancingInfo = () => {
  return (
    <div className="bg-slate-700 p-3 rounded-lg">
      <div className="text-sm text-slate-400 mb-2">Balancing Algorithm:</div>
      <ul className="text-xs text-slate-300 space-y-1">
        <li>• Only checked-in players are included</li>
        <li>• Uses weight_rating based on Valorant rank (10-500 points)</li>
        <li>• Auto-detects 1v1 vs team format based on player count</li>
        <li>• 1v1: Each player gets their own team</li>
        <li>• Teams: Snake draft assignment for optimal balance</li>
        <li>• Highest-rated player becomes team captain</li>
        <li>• Balance status: Ideal (0-25), Good (26-50), Warning (51-100), Poor (100+)</li>
        <li>• All players notified with their team assignment</li>
      </ul>
    </div>
  );
};
