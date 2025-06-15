
import React from "react";
import { Match } from "./types";

interface MatchScoreTabProps {
  match: Match;
  userTeamId: string | null;
  isAdmin: boolean;
  onScoreSubmitted: () => void;
}

const MatchScoreTab: React.FC<MatchScoreTabProps> = ({
  match,
  userTeamId,
  isAdmin,
  onScoreSubmitted,
}) => (
  <div className="p-4 text-slate-300">
    <h2 className="text-lg font-bold mb-2">Score</h2>
    <div>Match ID: {match?.id}</div>
    <div>Your Team ID: {userTeamId}</div>
    <div>Admin: {isAdmin ? "Yes" : "No"}</div>
    {/* Add score reporting and controls here */}
    <button
      onClick={onScoreSubmitted}
      className="mt-2 px-4 py-1 rounded bg-blue-600 text-white"
    >
      Submit Score
    </button>
  </div>
);

export default MatchScoreTab;
