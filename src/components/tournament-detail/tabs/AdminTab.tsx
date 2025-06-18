
import React from "react";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";

interface AdminTabProps {
  tournament: any;
  teams: any[];
  onRefresh: () => void;
}

export default function AdminTab({ tournament, teams, onRefresh }: AdminTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-white">Tournament Administration</h3>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4">Bracket Management</h4>
          <div className="flex flex-col gap-4">
            <BracketGenerator
              tournamentId={tournament.id}
              teams={teams}
              onBracketGenerated={onRefresh}
            />
            <IntegratedBracketView tournamentId={tournament.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
