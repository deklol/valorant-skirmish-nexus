
import { Calendar } from "lucide-react";

export default function MedicTournamentTimeline({ tournament }: { tournament: any }) {
  const { registration_opens_at, registration_closes_at, check_in_starts_at, check_in_ends_at, start_time } = tournament;
  const events = [
    { label: "Registration Opens", time: registration_opens_at },
    { label: "Registration Closes", time: registration_closes_at },
    { label: "Check-In Opens", time: check_in_starts_at },
    { label: "Check-In Closes", time: check_in_ends_at },
    { label: "Tournament Starts", time: start_time },
  ].filter(e => e.time);

  return (
    <div className="mt-4">
      <div className="font-bold text-xs text-yellow-200 mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4" /> Timeline
      </div>
      <div className="flex flex-col gap-2">
        {events.length === 0 ? (
          <div className="text-slate-400 text-xs">No timeline data</div>
        ) : (
          events.map(e => (
            <div className="flex gap-2 items-center" key={e.label}>
              <span className="w-40 text-xs text-yellow-100">{e.label}</span>
              <span className="font-mono text-xs">{new Date(e.time).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
