import { ShieldCheck, UserCheck, Scale, Mic2, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";

export default function RulesTab() {
  return (
    <section aria-labelledby="rules-heading" className="space-y-6">
      <header>
        <StandardHeading id="rules-heading" as="h2" level="h2">
          TLR Valorant Skirmish Rules
        </StandardHeading>
        <StandardText className="text-muted-foreground mt-1">
          All rules are enforced at the discretion of tournament admins. Any breach may result in a warning, penalty, or permanent ban. By signing up to this event you agree to these rules.
        </StandardText>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>1. Account & Eligibility</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>No smurfing or alternate accounts. Players must compete on the exact account used during sign-up.</li>
              <li>Must be a UK citizen to receive any monetary prizes.</li>
              <li>Players must be at least 10 minutes early to their scheduled matches.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <CardTitle>2. Fair Play</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>No cheating, scripting, or exploit abuse of any kind.</li>
              <li>No ghosting – watching or listening to another player’s live stream during the match.</li>
              <li>No trolling, griefing, or intentional throwing of games.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle>3. Conduct</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>Casual banter is fine, but extreme toxicity, harassment, hate speech, or targeted abuse will not be tolerated.</li>
              <li>All players must join their assigned Discord team voice channel and use voice comms for the duration of the match.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Mic2 className="h-5 w-5 text-primary" />
            <CardTitle>4. Streaming</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>If streaming your matches, you must use a minimum 2-minute delay to avoid ghosting. Failure to do so may result in penalties.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <CardTitle>5. Map Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li>Matches will use the current Valorant Active Duty map pool, unless both teams mutually agree to play on a different map.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
