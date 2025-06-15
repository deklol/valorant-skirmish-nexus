
import React from "react";
import { Match } from "./types";

interface MatchOverviewTabProps {
  match: Match;
}

const MatchOverviewTab: React.FC<MatchOverviewTabProps> = ({ match }) => (
  <div className="p-4 text-slate-300">
    <h2 className="text-lg font-bold mb-2">Match Overview</h2>
    <div>Match ID: {match?.id}</div>
    {/* Add relevant overview info as needed */}
  </div>
);

export default MatchOverviewTab;
