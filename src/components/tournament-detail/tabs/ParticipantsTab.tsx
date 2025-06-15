
import TournamentParticipants from "@/components/TournamentParticipants";
export default function ParticipantsTab({
  tournamentId,
  maxPlayers,
  isAdmin
}: {
  tournamentId: string,
  maxPlayers: number,
  isAdmin: boolean
}) {
  return (
    <TournamentParticipants
      tournamentId={tournamentId}
      maxPlayers={maxPlayers}
      isAdmin={isAdmin}
    />
  );
}
