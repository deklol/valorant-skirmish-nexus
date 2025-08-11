import { ShieldCheck, UserCheck, Scale, Mic2, Map } from "lucide-react";
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { cn } from "@/lib/utils";

const rules = [
  {
    icon: ShieldCheck,
    title: "Account & Eligibility",
    color: "from-red-600 to-red-800",
    items: [
      "No smurfing or alternate accounts. Play on the account you signed up with.",
      "UK citizenship required for monetary prizes.",
      "Be ready at least 10 minutes before your match."
    ]
  },
  {
    icon: Scale,
    title: "Fair Play",
    color: "from-blue-600 to-blue-800",
    items: [
      "No cheating, scripting, or exploit abuse.",
      "No ghosting – don’t watch or listen to other players’ live streams.",
      "No trolling, griefing, or intentional throwing."
    ]
  },
  {
    icon: UserCheck,
    title: "Conduct",
    color: "from-yellow-500 to-yellow-700",
    items: [
      "Casual banter is fine, but no toxicity, harassment, or hate speech.",
      "Stay in your assigned Discord voice channel for the whole match."
    ]
  },
  {
    icon: Mic2,
    title: "Streaming",
    color: "from-purple-600 to-purple-800",
    items: [
      "If streaming, enable at least a 2-minute delay to prevent ghosting."
    ]
  },
  {
    icon: Map,
    title: "Map Pool",
    color: "from-green-600 to-green-800",
    items: [
      "Matches use the current Valorant Active Duty map pool unless both teams agree otherwise."
    ]
  }
];

export default function RulesTab() {
  return (
    <section aria-labelledby="rules-heading" className="space-y-12">
      <header className="text-center">
        <StandardHeading id="rules-heading" as="h2" level="h2">
          TLR Valorant Skirmish Rules
        </StandardHeading>
        <StandardText className="text-muted-foreground mt-2 max-w-3xl mx-auto">
          Rules are enforced at the discretion of tournament admins. Breaches may result in warnings, penalties, or permanent bans. By signing up, you agree to these terms.
        </StandardText>
      </header>

      <div className="relative flex gap-8">
        {/* Progress sidebar */}
        <div className="hidden lg:flex flex-col items-end sticky top-20 w-48 space-y-4">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
            >
              <rule.icon className="h-4 w-4" />
              <span>{rule.title}</span>
            </div>
          ))}
        </div>

        {/* Scrollable rules */}
        <div className="flex-1 space-y-16">
          {rules.map(({ icon: Icon, title, color, items }, i) => (
            <div
              id={`rule-${i}`}
              key={i}
              className={cn(
                "relative overflow-hidden rounded-xl border border-neutral-800 shadow-lg",
                "bg-gradient-to-r",
                color
              )}
            >
              {/* Icon watermark */}
              <Icon className="absolute right-4 top-4 h-20 w-20 opacity-10" />

              {/* Header */}
              <div className="p-6 pb-3 border-b border-white/10">
                <h3 className="text-xl font-bold tracking-wide text-white">{title}</h3>
              </div>

              {/* Body */}
              <div className="p-6 pt-3">
                <ul className="list-disc pl-6 space-y-2 text-white/90">
                  {items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
