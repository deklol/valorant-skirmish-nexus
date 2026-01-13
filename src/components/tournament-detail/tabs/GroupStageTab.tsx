import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Grid3X3 } from "lucide-react";
import GroupStandingsDisplay from "@/components/GroupStandingsDisplay";

interface GroupStageTabProps {
  tournamentId: string;
  teamsAdvancePerGroup: number;
  isAdmin?: boolean;
  onKnockoutGenerated?: () => void;
}

export default function GroupStageTab({ 
  tournamentId, 
  teamsAdvancePerGroup, 
  isAdmin = false,
  onKnockoutGenerated 
}: GroupStageTabProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          Group Stage Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GroupStandingsDisplay 
          tournamentId={tournamentId}
          teamsAdvancePerGroup={teamsAdvancePerGroup}
          isAdmin={isAdmin}
          onKnockoutGenerated={onKnockoutGenerated}
        />
      </CardContent>
    </Card>
  );
}
