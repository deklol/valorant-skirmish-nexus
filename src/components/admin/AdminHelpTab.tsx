
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminHelpTab() {
  return (
    <div className="w-full px-1 md:px-2 pt-8">
      {/* Header Card */}
      <Card className="bg-slate-800/95 border border-slate-700 rounded-xl mb-8 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pt-6 pb-2 px-6">
          <BookOpen className="w-7 h-7 text-blue-400" />
          <CardTitle className="text-2xl font-semibold text-white">Admin Help &amp; Documentation</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <p className="text-slate-200 mb-2 leading-tight">
            Welcome to the Tournament Platform Admin Documentation!
          </p>
          <p className="text-slate-400 leading-snug text-[15px]">
            This reference fully explains all admin features:
            <b> tournament setup, bracket management, user roles, team balancing, troubleshooting, Medic tools, and more.</b>
            Every action and workflow is explained! Use the Table of Contents or search (Ctrl+F) to find topics.
          </p>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card className="bg-slate-800/95 border border-slate-700 rounded-xl mb-8 shadow">
        <CardHeader className="pt-6 pb-2 px-6">
          <CardTitle className="text-blue-300 text-lg font-medium">Table of Contents</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-2 pb-6">
          <ul className="list-disc ml-6 text-slate-200 space-y-1.5 text-base">
            <li><a href="#getting-started" className="hover:underline hover:text-blue-400">Getting Started</a></li>
            <li><a href="#tournament-management" className="hover:underline hover:text-blue-400">Tournament Management</a></li>
            <li><a href="#user-player-management" className="hover:underline hover:text-blue-400">User &amp; Player Management</a></li>
            <li><a href="#team-balancing" className="hover:underline hover:text-blue-400">Team Balancing System</a></li>
            <li><a href="#tournament-operations" className="hover:underline hover:text-blue-400">Tournament Operations</a></li>
            <li><a href="#advanced-features" className="hover:underline hover:text-blue-400">Advanced Features</a></li>
            <li><a href="#troubleshooting" className="hover:underline hover:text-blue-400">Troubleshooting &amp; FAQ</a></li>
          </ul>
        </CardContent>
      </Card>

      <div className="pt-2" />

      {/* Documentation Sections */}
      <Accordion type="single" collapsible className="w-full space-y-2">

        {/* 1. Getting Started */}
        <AccordionItem value="getting-started">
          <AccordionTrigger id="getting-started" className="text-blue-200 text-base font-medium">
            1. Getting Started
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-slate-300">
              <b>Admin Dashboard Overview</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Access Control:</b> Only users assigned the <span className="bg-blue-950 text-blue-300 px-1 rounded">admin</span> role in Supabase <b>user_roles</b> table can access the Admin Dashboard.
                </li>
                <li>
                  <b>Interface Layout:</b> The top tabs let you switch quickly between all admin systems:<br/>
                  <span className="text-blue-200">Tournaments</span>, <span className="text-blue-200">Users</span>, <span className="text-blue-200">Maps</span>, Medic tools, Announcements, Settings, and Help.
                </li>
                <li>
                  <b>Promotion/Demotion:</b> Use the <span className="font-semibold text-red-400">Users</span> tab to make another user an admin or demote them by updating their role in the user management panel.<br/>
                  <b>Security note:</b> Only grant admin to trusted users; admins can delete, edit, and override any data!
                </li>
                <li>
                  <b>Initial Setup Steps:</b>
                  <ol className="list-decimal ml-8 space-y-1">
                    <li>Review this documentation and your Supabase project structure.</li>
                    <li>Set up maps and system settings before running your first tournament (see Maps/System in tabs).</li>
                    <li>Test the platform end-to-end with a dummy tournament before inviting players.</li>
                  </ol>
                </li>
                <li>
                  <b>Quick Links:</b>
                  <ul className="list-disc ml-5">
                    <li><a href="#tournament-management" className="hover:underline text-blue-400">Create and manage tournaments</a></li>
                    <li><a href="#user-player-management" className="hover:underline text-blue-400">Manage user roles and bans</a></li>
                  </ul>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Tournament Management */}
        <AccordionItem value="tournament-management">
          <AccordionTrigger id="tournament-management" className="text-blue-200 text-base font-medium">
            2. Tournament Management
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-slate-300">
              <b>Creating, Editing & Deleting Tournaments</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>To create a new tournament:</b> Click the red <span className="font-semibold text-red-400">Create Tournament</span> button (top right). Fill all required fields. See field explanations below:
                  <ul className="list-disc ml-5">
                    <li><b>Name:</b> Public title of the event. Used for all announcements and brackets.</li>
                    <li><b>Registration window:</b> Controls when players can sign up. <b>Open</b> = registration open; <b>Close</b> = signups locked.</li>
                    <li><b>Format:</b> Choose Single Elimination, Double Elimination, or custom. This determines bracket style.</li>
                    <li><b>Player/team limits:</b> Set strict caps to prevent overbooking.</li>
                    <li><b>Map pool selection:</b> Pick available maps for matches/veto; managed in the <span className="text-blue-200">Maps</span> tab.</li>
                  </ul>
                </li>
                <li>
                  <b>Edit tournament settings:</b> Use the gear icon to access config forms for each tournament. 
                  <ul className="list-disc ml-5">
                    <li>Most settings are locked after the tournament goes <b>Live</b> (for integrity).</li>
                  </ul>
                </li>
                <li>
                  <b>Phases:</b> Each tournament moves through these states:
                  <ul className="list-disc ml-5">
                    <li><b>Draft:</b> Only admins can edit or see. Prep here before launching registration.</li>
                    <li><b>Open:</b> Players may sign up and change teams. Supervising for abuse/alt accounts is your responsibility.</li>
                    <li><b>Balancing:</b> When registration closes, team balancing tools unlock.</li>
                    <li><b>Live:</b> Bracket, teams, and players are locked; matches are played.</li>
                    <li><b>Completed:</b> All rounds/results entered. This state publishes final stats and disables all edits except via Medic.</li>
                    <li><b>Archived:</b> Hidden from lists but always visible on request for record-keeping.</li>
                  </ul>
                </li>
                <li>
                  <b>Bracket Generation:</b> After teams are set, click <span className="font-semibold text-red-400">Generate Bracket</span>. Configure "random" or "seeded" placement. *Always* review results before saving, to avoid unfair matchups!
                </li>
                <li>
                  <b>Deleting/cancelling events:</b> Only perform this if a tournament is a mistake or failed (use Archive for most things). This cannot be undone!
                </li>
              </ul>
              <b>Tips</b>
              <ul className="list-disc ml-5 space-y-1">
                <li>Keep at least one test/dummy tournament for training and troubleshooting without risk.</li>
                <li>Always communicate schedule changes in Announcements & Discord integrations.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. User & Player Management */}
        <AccordionItem value="user-player-management">
          <AccordionTrigger id="user-player-management" className="text-blue-200 text-base font-medium">
            3. User &amp; Player Management
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-slate-300">
              <b>User Roles & Account Actions</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Role Management:</b> In the <b>Users</b> tab, use role dropdowns to promote/demote users.
                  <ul className="list-disc ml-5">
                    <li><b>Admin:</b> Full access. Only another admin can demote you.</li>
                    <li><b>User:</b> Standard tournament participant.</li>
                  </ul>
                </li>
                <li>
                  <b>Ban/Unban Users:</b> Click the "Ban" button to block all platform access. Unban to restore their permissions. <br/>
                  <b>Reasons for bans:</b> Toxicity, cheating, evasion, alts, abuse, etc.
                </li>
                <li>
                  <b>Player Lookup:</b> Use search to locate users by Discord, Riot ID, or partial. This helps with rapid response to player issues.
                </li>
                <li>
                  <b>Checking Registration Issues:</b> If user cannot register:
                  <ul className="list-disc ml-5">
                    <li>Check ban status and role.</li>
                    <li>Ensure unique Discord + Riot ID.</li>
                    <li>Look for duplicate or past incomplete signups/unchecked INs.</li>
                  </ul>
                </li>
              </ul>
              <b>Player Info Panels</b>
              <ul className="list-disc ml-5 space-y-1">
                <li><b>Ranks & Performance:</b> Show current rank, historical events, MVP, and rating. High ratings impact balancing seeding and captain assignments.</li>
                <li><b>Riot ID Integration:</b> All players MUST have a valid Riot ID. If the Riot account isn’t connected, prompt user to re-authorize via profile.</li>
                <li><b>Notes:</b> Use profile notes to track issues, warnings, and communication history for future reference.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Team Balancing System */}
        <AccordionItem value="team-balancing">
          <AccordionTrigger id="team-balancing" className="text-blue-200 text-base font-medium">
            4. Team Balancing System
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-slate-300">
              <b>Auto Team Balancing (Snake Draft)</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Auto Balance Teams:</b> Hit the "Auto Balance Teams" button to instantly distribute checked-in players into teams by rating (highest to lowest, then lowest to highest, so teams are fair).<br/>
                  No human bias, repeatable, reduces disputes.
                </li>
                <li>
                  <b>Manual Edits:</b> Drag-and-drop players between teams, and change captain assignments. This is often used after auto-balance when captains have preferences or if last-minute changes are needed.
                </li>
                <li>
                  <b>Assigning Captains:</b> The highest-rated player is made captain by default (can be changed).
                </li>
                <li>
                  <b>Rebalancing:</b> If a player drops or is checked-in late, you may re-run balance, but warn participants. Announce any forced team moves.
                </li>
                <li>
                  <b>Edge Cases:</b>
                  <ul className="list-disc ml-5">
                    <li>Odd player count: Will show a warning and leave teams uneven. You must move a sub manually or update team count.</li>
                    <li>Not enough checked-in: System blocks balancing and highlights missing users. Confirm check-in on user list!</li>
                  </ul>
                </li>
                <li>
                  <b>1v1 Brackets:</b> Each user is a single team–no balancing needed. Just proceed.
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Tournament Operations */}
        <AccordionItem value="tournament-operations">
          <AccordionTrigger id="tournament-operations" className="text-blue-200 text-base font-medium">
            5. Tournament Operations
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-slate-300">
              <b>Running & Managing the Event</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Check-In Management:</b> Players must check-in before each event. Admins can force/correct check-in if a user has trouble (check their user status).
                </li>
                <li>
                  <b>Bracket Generation & Control:</b>
                  <ul className="list-disc ml-5">
                    <li>Only allowed after teams set. Ensure team count matches bracket structure.</li>
                    <li>Review bracket preview carefully before finalizing.</li>
                  </ul>
                </li>
                <li>
                  <b>Reporting Scores:</b> Only admins and sometimes captains may enter match results in the system. If two captains submit conflicting results, admins are responsible for making the final call.
                </li>
                <li>
                  <b>Edit/Override Results:</b> Use the “Edit” (or “Reset”) buttons in the bracket view to correct errors or resolve disputes. Always keep Discord logs/screenshots for audit trail.
                </li>
                <li>
                  <b>Timer Management:</b> Manually update round start/end times if matches are delayed so the bracket reflects live status for spectators.
                </li>
                <li>
                  <b>Announcing Results:</b> Use the Announcements or Discord webhook/announcement panel to push major updates immediately to everyone.
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Advanced Features */}
        <AccordionItem value="advanced-features">
          <AccordionTrigger id="advanced-features" className="text-blue-200 text-base font-medium">
            6. Advanced Features
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-slate-300">
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Map Pool Manager:</b> Access via Maps tab. Here you add, remove, and change all available maps (works for all tournaments). All edits are logged.<br/>
                  Double check that all new tournaments use the correct map pool before opening registration.
                </li>
                <li>
                  <b>Discord Announcement Integration:</b> Set up/update webhook URLs under Announcements. Use for:
                  <ul className="list-disc ml-5">
                    <li>Auto announce tournament creation, signup open, round start/end, match result, and winner.</li>
                    <li>Mute announcement for test events or so you can control spam.</li>
                  </ul>
                </li>
                <li>
                  <b>Medic Tools:</b> Use Tournament/Match/Veto Medic for emergencies: broken brackets, buggy team assignments, or stuck registration states.<br/>
                  Examples:
                  <ul className="list-disc ml-5">
                    <li><b>Tournament Medic:</b> Lock/unlock status, force team/participant fixing, or repair corrupted tournament data.</li>
                    <li><b>Match Medic:</b> Force match result, reset a round, or correct player swap.</li>
                    <li><b>Veto Medic:</b> Repair draft issues or forcibly unlock veto when teams are out of sync.</li>
                  </ul>
                  <b>Always announce any use of Medic tools!</b>
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Troubleshooting & FAQ */}
        <AccordionItem value="troubleshooting">
          <AccordionTrigger id="troubleshooting" className="text-blue-200 text-base font-medium">
            7. Troubleshooting &amp; FAQ
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-slate-300">
              <b>Common Issues & Solutions</b>
              <ul className="list-disc ml-5 space-y-2 text-slate-400">
                <li>
                  <b>Bracket not generating?</b>
                  <ul className="list-disc ml-5">
                    <li>Check that participant/team count matches bracket logic.</li>
                    <li>Make sure all required check-in is complete.</li>
                    <li>Try resetting team assignments and re-balancing, then re-run bracket generator.</li>
                  </ul>
                </li>
                <li>
                  <b>Player can't register or check-in?</b>
                  <ul className="list-disc ml-5">
                    <li>Check for user ban/role.</li>
                    <li>Duplicate Discord or Riot ID: search for both to confirm unique identity.</li>
                    <li>If account looks correct, check for registration deadline.</li>
                  </ul>
                </li>
                <li>
                  <b>Team balancing gives errors?</b>
                  <ul className="list-disc ml-5">
                    <li>Not enough checked-in players for given team configuration.</li>
                    <li>Try reducing the number of teams or updating check-in status manually (after confirming with players).</li>
                  </ul>
                </li>
                <li>
                  <b>Medic tool changes not applying?</b>
                  <ul className="list-disc ml-5">
                    <li>Reload the page to ensure fresh state from backend.</li>
                    <li>If still broken, contact tech support with screenshot + what you tried.</li>
                  </ul>
                </li>
                <li>
                  <b>Discord notifications not firing?</b>
                  <ul className="list-disc ml-5">
                    <li>Ensure that the correct webhook URL is in place and test via the Announcements tab.</li>
                  </ul>
                </li>
                <li>
                  <b>Other UI bugs or broken flows?</b>
                  <ul className="list-disc ml-5">
                    <li>If 'stuck', manually change status using Medic, then resave tournament config.</li>
                    <li>Last resort: Archive broken event and start new one (never delete unless a test event).</li>
                  </ul>
                </li>
                <li>
                  <b>Still stuck?</b><br />
                  Screenshot the issue, reload, and share with the admin/dev Discord or email your developer for direct support.
                </li>
              </ul>
              <b>For more help see:</b> <a href="https://docs.lovable.dev/tips-tricks/troubleshooting" target="_blank" rel="noopener" className="underline text-blue-400">Troubleshooting docs</a>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
