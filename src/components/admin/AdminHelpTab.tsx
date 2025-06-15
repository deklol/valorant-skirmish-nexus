
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminHelpTab() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="bg-slate-800 border-slate-700 mb-8">
        <CardHeader className="flex flex-row items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <CardTitle className="text-white">Admin Help & Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 mb-2">Welcome to the Tournament Platform Admin Documentation!</p>
          <p className="text-slate-400 text-sm mb-2">
            This guide walks you through all platform features, tournament setup, user roles, team balancing, emergency tools, and more. 
            Use the Table of Contents to navigate. As you use the platform, refer back to this guide for best practices!
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-blue-300 text-lg">Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc ml-6 text-slate-200 space-y-2 text-sm">
            <li><a href="#getting-started" className="hover:underline hover:text-blue-400">Getting Started</a></li>
            <li><a href="#tournament-management" className="hover:underline hover:text-blue-400">Tournament Management</a></li>
            <li><a href="#user-player-management" className="hover:underline hover:text-blue-400">User & Player Management</a></li>
            <li><a href="#team-balancing" className="hover:underline hover:text-blue-400">Team Balancing System</a></li>
            <li><a href="#tournament-operations" className="hover:underline hover:text-blue-400">Tournament Operations</a></li>
            <li><a href="#advanced-features" className="hover:underline hover:text-blue-400">Advanced Features</a></li>
            <li><a href="#troubleshooting" className="hover:underline hover:text-blue-400">Troubleshooting & FAQ</a></li>
          </ul>
        </CardContent>
      </Card>

      {/* Documentation Sections */}
      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="getting-started">
          <AccordionTrigger id="getting-started" className="text-blue-200 text-base">
            1. Getting Started
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-slate-300 mb-2">
              <b>Welcome!</b> This admin dashboard gives you full control over tournaments, users, maps, teams, Discord connections, and more.
            </p>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li><b>Overview:</b> Navigation is through the tabs at the top. Each tab gives access to a management area.</li>
              <li><b>Roles:</b> Only users with the <span className="bg-blue-900 px-1 rounded">admin</span> role can reach this area.</li>
              <li><b>Quick Actions:</b> Use the red <b>Create Tournament</b> button to get started with your first event!</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tournament-management">
          <AccordionTrigger id="tournament-management" className="text-blue-200 text-base">
            2. Tournament Management
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li><b>Creating a Tournament:</b> Fill in tournament name, dates, player/team limits, and settings. Use the settings to customize formats and registration windows.</li>
              <li><b>Statuses:</b> Tournaments move through phases—Draft, Open, Balancing, Live, Completed, Archived. Each phase unlocks management actions.</li>
              <li><b>Brackets:</b> Once enough teams are registered, use Bracket Generator to create the tournament structure. Bracket types include single and double elimination.</li>
              <li><b>Map Veto:</b> Enable if “map veto” rounds are needed; players will ban/pick maps before matches.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="user-player-management">
          <AccordionTrigger id="user-player-management" className="text-blue-200 text-base">
            3. User & Player Management
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li><b>User List:</b> The Users tab allows role changes, bans, and player lookup. Only admins can manage roles.</li>
              <li><b>Rank System:</b> Players have an assigned rank and “weight rating,” which is used for fair team distribution.</li>
              <li><b>Riot ID Integration:</b> Each player must link their Riot ID; this can be refreshed by clicking the appropriate button in their profile.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="team-balancing">
          <AccordionTrigger id="team-balancing" className="text-blue-200 text-base">
            4. Team Balancing System
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li>
                <b>Auto Balancing:</b> The Balancing Tool uses a snake draft algorithm on checked-in players, following weight/rank for fair teams.
              </li>
              <li>
                <b>Captain Selection:</b> The first (highest-rated) player per team is assigned as captain.
              </li>
              <li>
                <b>Manual Edits:</b> Teams may also be edited/created manually using the Players and Admin tabs.
              </li>
            </ul>
            <div className="text-slate-500 text-xs mt-2">
              See the full balancing algorithm and troubleshooting tips lower in this guide.
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tournament-operations">
          <AccordionTrigger id="tournament-operations" className="text-blue-200 text-base">
            5. Tournament Operations
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li><b>Bracket Generation:</b> Click “Generate Bracket” once teams are finalized. Bracket controls allow for seeding, editing, and managing matchups.</li>
              <li><b>Check-in System:</b> Players need to check in before events; admins can enforce, force, or clear check-ins as needed.</li>
              <li><b>Reporting Results:</b> Matches are reported directly in the bracket view. You can correct, reset, or override results as an admin.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="advanced-features">
          <AccordionTrigger id="advanced-features" className="text-blue-200 text-base">
            6. Advanced Features
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 mb-2 space-y-1">
              <li>
                <b>Map Pool/Map Manager:</b> Add or remove maps available for selection in tournaments. Updates apply platform-wide.
              </li>
              <li>
                <b>Discord Integration:</b> Use the Announcements tab to set Discord webhook URLs for automatic event alerts.
              </li>
              <li>
                <b>Medic Tools:</b> The Tournament/Match/Veto Medic tabs offer emergency tools—fix brackets, player/team status, veto rounds, or match results.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger id="troubleshooting" className="text-blue-200 text-base">
            7. Troubleshooting & FAQ
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc ml-6 text-slate-400 space-y-1">
              <li>
                <b>Bracket Won’t Generate?</b> Make sure enough teams and players are checked in and that the team size is set correctly.
              </li>
              <li>
                <b>A Player is Missing?</b> Use the Players tab to search; late check-in or registration issues are common causes.
              </li>
              <li>
                <b>Balancing Fails?</b> You must have enough checked-in players for the selected team format (e.g. at least 10 for 5v5 balancing).
              </li>
              <li>
                <b>Need Advanced Help?</b> Reference the Medic Tools tabs to perform manual overrides, or contact your technical support team.
              </li>
            </ul>
            <div className="text-slate-500 text-xs mt-2">
              Still stuck? View code documentation or visit our support Discord.
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
