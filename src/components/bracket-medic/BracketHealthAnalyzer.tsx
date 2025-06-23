
import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { calculateBracketStructure, validateBracketProgression } from "@/utils/bracketCalculations";

interface BracketHealthAnalyzerProps {
  matches: any[];
  eliminatedTeamIds: string[];
  teamCount: number;
}

export default function BracketHealthAnalyzer({ 
  matches, 
  eliminatedTeamIds, 
  teamCount 
}: BracketHealthAnalyzerProps) {
  
  if (teamCount < 2) {
    return (
      <div className="mb-4">
        <Badge className="bg-gray-700 text-white">
          <AlertCircle className="inline w-3 h-3 mr-1" />
          Insufficient Teams
        </Badge>
        <span className="text-slate-400 text-sm ml-2">
          Need at least 2 teams for bracket analysis.
        </span>
      </div>
    );
  }

  const bracketStructure = calculateBracketStructure(teamCount);
  const validation = validateBracketProgression(matches, teamCount); // FIX: Pass teamCount instead of bracketStructure
  const healthy = validation.isValid;

  return (
    <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
      <div>
        {healthy ? (
          <Badge className="bg-green-700 text-white">
            <CheckCircle2 className="inline w-3 h-3 mr-1" />
            Bracket Healthy
          </Badge>
        ) : (
          <Badge className="bg-red-700 text-white">
            <AlertCircle className="inline w-3 h-3 mr-1" />
            Issues Detected
          </Badge>
        )}
        
        <span className="text-slate-400 text-sm ml-2">
          {healthy ? (
            "Bracket progression is correct for all rounds."
          ) : (
            <>
              <span className="font-bold">{validation.issues.length}</span> progression issues found.
            </>
          )}
        </span>

        {/* Bracket Structure Info */}
        <div className="text-xs text-slate-500 mt-1">
          {teamCount} teams • {bracketStructure.totalRounds} rounds • {bracketStructure.totalMatches} total matches
          {!bracketStructure.isPowerOfTwo && (
            <span className="text-yellow-400 ml-2">⚠️ Non-power-of-2 bracket</span>
          )}
        </div>

        {validation.issues.length > 0 && (
          <ul className="text-xs mt-1 ml-1 text-red-300 list-disc">
            {validation.issues.slice(0, 5).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
            {validation.issues.length > 5 && (
              <li className="text-slate-400">...and {validation.issues.length - 5} more issues</li>
            )}
          </ul>
        )}
      </div>
      
      {healthy && (
        <div className="text-xs text-slate-400 ml-4">
          Bracket structure validated for {teamCount}-team tournament
        </div>
      )}
    </div>
  );
}
