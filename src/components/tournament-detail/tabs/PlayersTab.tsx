
import ForceCheckInManager from "@/components/ForceCheckInManager";
import TournamentParticipants from "@/components/TournamentParticipants";
export default function PlayersTab({
  tournamentId,
  maxPlayers,
  onCheckInUpdate
}: {
  tournamentId: string,
  maxPlayers: number,
  onCheckInUpdate: () => void
}) {
  return (
    <>
      <ForceCheckInManager
        tournamentId={tournamentId}
        onCheckInUpdate={onCheckInUpdate}
      />
      <TournamentParticipants
        tournamentId={tournamentId}
        maxPlayers={maxPlayers}
        isAdmin={true}
      />
    </>
  );
}
