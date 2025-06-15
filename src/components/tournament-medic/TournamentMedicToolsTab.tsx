
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function TournamentMedicToolsTab({ tournament, onRefresh }: {
  tournament: { id: string };
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold mb-2 text-yellow-200">Data Repair & Announcements (stubs):</div>
      <Button size="sm" variant="outline" onClick={() => toast({
        title: "Tournament healthcheck",
        description: "This will scan and attempt repair. (Not implemented yet.)"
      })}>Run Data Repair Scan</Button>
      <Button size="sm" variant="outline" onClick={() => toast({
        title: "Emergency Announcement",
        description: "This will broadcast to all participants. (Not implemented yet.)"
      })}>Send Tournament Announcement</Button>
    </div>
  );
}
