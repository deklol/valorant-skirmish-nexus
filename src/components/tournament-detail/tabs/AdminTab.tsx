
import React from "react";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import TournamentEditDialog from "@/components/TournamentEditDialog";
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import CloneTournamentDialog from "@/components/CloneTournamentDialog";
import AIHealthMonitor from "@/components/ai/AIHealthMonitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminTabProps {
  tournament: any;
  teams: any[];
  onRefresh: () => void;
  onTournamentUpdated?: () => void;
  matches?: any[];
  parsedMapVetoRounds?: number[];
  onBracketGenerated?: () => void;
  onStatusChange?: () => void;
}

export default function AdminTab({ 
  tournament, 
  teams, 
  onRefresh, 
  onTournamentUpdated,
  matches,
  parsedMapVetoRounds,
  onBracketGenerated,
  onStatusChange
}: AdminTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-white">Tournament Administration</h3>
        
        {/* Tournament Status Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Tournament Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentStatusManager
              tournamentId={tournament.id}
              currentStatus={tournament.status}
              onStatusChange={onStatusChange || onRefresh}
            />
          </CardContent>
        </Card>

        {/* Tournament Settings */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Tournament Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <TournamentEditDialog
                tournament={tournament}
                onTournamentUpdated={onTournamentUpdated || onRefresh}
              />
              <CloneTournamentDialog
                tournament={tournament}
                onTournamentCloned={() => {
                  // Navigate to tournaments page or refresh to see new tournament
                  window.location.href = '/tournaments';
                }}
              />
            </div>
            <ComprehensiveTournamentEditor
              tournament={tournament}
              onTournamentUpdated={onTournamentUpdated || onRefresh}
            />
          </CardContent>
        </Card>

        {/* Bracket Management with AI Health Monitoring */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Bracket Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIHealthMonitor 
              tournamentId={tournament.id}
              onBracketGenerated={onBracketGenerated || onRefresh}
            >
              <BracketGenerator
                tournamentId={tournament.id}
                teams={teams}
                onBracketGenerated={onBracketGenerated || onRefresh}
              />
            </AIHealthMonitor>
            <IntegratedBracketView tournamentId={tournament.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
