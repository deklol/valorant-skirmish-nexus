
import React from "react";

interface MatchPlayersTabProps {
  matchId: string;
  team1Id: string;
  team2Id: string;
}

const MatchPlayersTab: React.FC<MatchPlayersTabProps> = ({ matchId, team1Id, team2Id }) => (
  <div className="p-4 text-slate-300">
    <h2 className="text-lg font-bold mb-2">Players</h2>
    <div>Match ID: {matchId}</div>
    <div>Team 1 ID: {team1Id}</div>
    <div>Team 2 ID: {team2Id}</div>
    {/* Add player listing and management */}
  </div>
);

export default MatchPlayersTab;
