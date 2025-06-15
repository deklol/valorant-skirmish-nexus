
import ComprehensiveTournamentEditor from "@/components/ComprehensiveTournamentEditor";
import TournamentStatusManager from "@/components/TournamentStatusManager";
import BracketGenerator from "@/components/BracketGenerator";

export default function AdminTab({
  tournament,
  onTournamentUpdated,
  matches,
  teams,
  parsedMapVetoRounds,
  onBracketGenerated,
  onStatusChange
}: {
  tournament: any,
  onTournamentUpdated: () => void,
  matches: any[],
  teams: any[],
  parsedMapVetoRounds: number[],
  onBracketGenerated: () => void,
  onStatusChange: () => void
}) {
  return (
    <>
      <ComprehensiveTournamentEditor
        tournament={tournament}
        onTournamentUpdated={onTournamentUpdated}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TournamentStatusManager
          tournamentId={tournament.id}
          currentStatus={tournament.status}
          onStatusChange={onStatusChange}
        />
        <BracketGenerator
          tournamentId={tournament.id}
          tournament={{
            status: tournament.status,
            max_teams: tournament.max_teams,
            bracket_type: tournament.bracket_type,
            match_format: tournament.match_format,
            final_match_format: tournament.final_match_format,
            semifinal_match_format: tournament.semifinal_match_format,
            enable_map_veto: tournament.enable_map_veto,
            map_veto_required_rounds: parsedMapVetoRounds
          }}
          teams={teams}
          onBracketGenerated={onBracketGenerated}
        />
      </div>
    </>
  );
}
