import { ShieldCheck, UserCheck, Scale, Mic2, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { cn } from "@/lib/utils";

const rules = [
  {
    icon: ShieldCheck,
    title: "Account & Eligibility",
    color: "bg-blue-100 text-blue-600",
    items: [
      "No smurfing or alternate accounts. Play on the account you signed up with.",
      "UK citizenship required for monetary prizes.",
      "Be ready at least 10 minutes before your match."
    ]
  },
  {
    icon: Scale,
    title: "Fair Play",
    color: "bg-green-100 text-green-600",
    items: [
      "No cheating, scripting, or exploit abuse.",
      "No ghosting – don’t watch or listen to other players’ live streams.",
      "No trolling, griefing, or intentional throwing."
    ]
  },
  {
    icon: UserCheck,
    title: "Conduct",
    color: "bg-yellow-100 text-yellow-700",
    items: [
      "Casual banter is fine, but no toxicity, harassment, or hate speech.",
      "Stay in your assigned Discord voice channel for the whole match."
    ]
  },
  {
    icon: Mic2,
    title: "Streaming",
    color: "bg-purple-100 text-purple-600",
    items: [
      "If streaming, enable at least a 2-minute delay to prevent ghosting."
    ]
  },
  {
    icon: Map,
    title: "Map Pool",
    color: "bg-red-100 text-red-600",
    items: [
      "Matches use the current Valorant Active Duty map pool unless both teams agree otherwise."
    ],
    full: true
  }
];

export default function RulesTab() {
  return (
    <section aria-labelledby="rules-heading" className="space-y-6">
      <header>
        <StandardHeading id="rules-heading" as="h2" level="h2">
          TLR Valorant Skirmish Rules
        </StandardHeading>
        <StandardText className="text-muted-foreground mt-1">
          Rules are enforced at the discretion of tournament admins. Breaches may result in warnings, penalties, or permanent bans. By signing up, you agree to these terms.
        </StandardText>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {rules.map(({ icon: Icon, title, color, items, full }, i) => (
          <Card key={i} className={cn(full && "md:col-span-2")}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2">
                {items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
