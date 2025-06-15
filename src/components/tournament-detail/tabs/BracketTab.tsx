
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import IntegratedBracketView from "@/components/IntegratedBracketView";

export default function BracketTab({ tournamentId }: { tournamentId: string }) {
  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Bracket
        </CardTitle>
      </CardHeader>
      <CardContent>
        <IntegratedBracketView tournamentId={tournamentId} />
      </CardContent>
    </Card>
  );
}
