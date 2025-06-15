
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminHelpTab() {
  return (
    <div className="w-full px-2 md:px-0 max-w-5xl mx-auto py-10">
      <Card className="bg-slate-800/90 border border-slate-700 rounded-xl mb-8 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pt-6 pb-2 px-6">
          <BookOpen className="w-7 h-7 text-blue-400" />
          <CardTitle className="text-2xl font-semibold text-white">Admin Help &amp; Documentation</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <p className="text-slate-200 mb-2 leading-tight">
            Welcome to the Tournament Platform Admin Documentation!
          </p>
          <p className="text-slate-400 leading-snug text-[15px]">
            This guide walks you through all platform features: tournament setup, user roles, team balancing, emergency tools, and more.
            Use the Table of Contents to navigate. For best results, review before your first event!
          </p>
        </CardContent>
      </Card>
      <Card className="bg-slate-800/90 border border-slate-700 rounded-xl mb-8 shadow">
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

      <Accordion type="single" collapsible className="w-full space-y-2">
        {/* 1. Getting Started */}
        <AccordionItem value="getting-started">
          <AccordionTrigger id="getting-started" className="text-blue-200 text-base font-medium">
            1. Getting Started
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-slate-300">
              <b>Welcome, Administrator!</b>
              <ul className="list-disc ml-5 space-y-1 text-slate-400">
                <li>
                  <b>Dashboard Navigation:</b> Use the tabs at the top for direct access to each system: 
                  <span className="text-blue-200"> Tournaments</span>, <span className="text-blue-200">Users</span>, <span className="text-blue-200">Maps</span>, and admin tools.
                </li>
                <li>
                  <b>User Roles:</b> The admin dashboard is only available to users with <code className="bg-blue-950 text-blue-300 px-1 rounded">admin</code> role.<br />
                  Promote trusted helpers in the Users tab to share duties.
                </li>
                <li>
                  <b>Jump-Start:</b> Hit the <span className="font-semibold text-red-400">Create Tournament</span> button to launch a new event. Set required game/format details immediately.
                </li>
                <li>
                  <b>Security Reminder:</b> Be careful with admin privileges—any admin has full control of tournaments, users, and backend.
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
              <div>
                <b>Creating Tournaments:</b>
                <ul className="list-disc ml-5 space-y-1 text-slate-400">
                  <li>
                    <b>Required fields:</b> Give a clear Tournament Name, set registration Open/Close dates, and configure player/team limits.
                  </li>
                  <li>
                    <b>Format Options:</b> Choose bracket style (single/double elimination), match and map rules, and registration policies.
                  </li>
                  <li>
                    <b>Status Phases:</b> Tournaments move through several phases:
                    <ul className="list-disc ml-5 space-y-0.5">
                      <li className="pl-1"><b>Draft:</b> Only visible to admins—fine-tune everything here!</li>
                      <li className="pl-1"><b>Open:</b> Public sign-up window. Players/teams can join.</li>
                      <li className="pl-1"><b>Balancing:</b> Only checked-in players can be balanced into teams (admins trigger this).</li>
                      <li className="pl-1"><b>Live:</b> Matches are active and bracket is locked in.</li>
                      <li className="pl-1"><b>Completed:</b> All matches finished, results finalized.</li>
                      <li className="pl-1"><b>Archived:</b> Tournament hidden from main lists (store for records).</li>
                    </ul>
                  </li>
                  <li>
                    <b>Editing Existing Events:</b> Use the tournament’s configuration form (gear icon). Some settings lock after the event goes Live!
                  </li>
                  <li>
                    <b>Bracket Generation:</b> When ready, use <span className="font-semibold text-red-400">Generate Bracket</span> for final structure. Choose seeding & check the results preview before saving.
                  </li>
                  <li>
                    <b>Map Veto (Optional):</b> Enable map veto if you want captains to ban/pick maps before match start.
                  </li>
                </ul>
              </div>
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
              <div>
                <b>Users Tab:</b>
                <ul className="list-disc ml-5 space-y-1 text-slate-400">
                  <li>
                    <b>Roles:</b> Only admins can assign/revoke admin privileges to users. Use with care—admins have platform-wide power.
                  </li>
                  <li>
                    <b>Ban/Unban:</b> Banned users can’t sign up, play, or access most features.
                  </li>
                  <li>
                    <b>Player Lookup:</b> Search by Discord username or Riot ID for fast support.
                  </li>
                </ul>
              </div>
              <div>
                <b>Player Details:</b>
                <ul className="list-disc ml-5 space-y-1 text-slate-400">
                  <li>
                    <b>Ranks &amp; Ratings:</b> Each player has a current rank and “weight rating” based on performance. These help balance teams.
                  </li>
                  <li>
                    <b>Riot ID Integration:</b> Required for each participant. If disconnected or outdated, instruct the user to refresh via their profile.
                  </li>
                  <li>
                    <b>Troubleshooting:</b> If a player can’t register, check for duplicate Discord/Riot or expired bans.
                  </li>
                </ul>
              </div>
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
              <b>Automatic Team Balancing:</b>
              <ul className="list-disc ml-5 space-y-1 text-slate-400">
                <li>
                  Use the <span className="text-blue-200 font-semibold">Auto Balance Teams</span> button to distribute eligible players based on ratings ("snake draft" logic).
                </li>
                <li>
                  <b>Captain Assignment:</b> The highest-rated player in each team is the captain (can be edited after).
                </li>
                <li>
                  <b>Review Results:</b> After balancing, check teams for fairness, diversity, and captain selection. Edit manually if needed!
                </li>
                <li>
                  <b>Manual Edit:</b> Admins can always move players between teams or assign custom captains if something looks off.
                </li>
                <li>
                  <b>Tip:</b> Not enough checked-in players? Users might need a reminder or penalty for lateness!
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
              <ul className="list-disc ml-5 space-y-1 text-slate-400">
                <li>
                  <b>Bracket Generation:</b> After teams are set, generate brackets. Double-check the seeding and number of teams.
                </li>
                <li>
                  <b>Check-in Management:</b> For fair play, require check-in before the event. Force/correct check-in status as needed.
                </li>
                <li>
                  <b>Match Reporting:</b> Only admins (and sometimes captains) can update results. Watch for disputes—admins can always override scores.
                </li>
                <li>
                  <b>Time Management:</b> Keep the event running by updating round timers and enforcing start times.
                </li>
                <li>
                  <b>Editing Results:</b> If a match was reported incorrectly, use “Edit” or “Reset” under the bracket view. Record changes for transparency.
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
              <ul className="list-disc ml-5 space-y-1 text-slate-400">
                <li>
                  <b>Map Pool &amp; Manager:</b> Use the Maps tab to add, remove, or update the map pool for all events. These changes apply platform-wide.
                </li>
                <li>
                  <b>Discord Integration:</b> In Announcements, set webhook URLs to send automated event updates (signups, match start, winners) to Discord.
                </li>
                <li>
                  <b>Medic Tools:</b> Use Tournament/Match/Veto Medic tabs for emergency situations—fix broken brackets, player/team issues, or map veto problems without restoring backups.
                </li>
                <li>
                  <b>Best Practice:</b> Document every use of Medic features in your admin notes for accountability—most issues are traceable to last-minute changes!
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
            <div className="space-y-2 text-slate-300">
              <ul className="list-disc ml-5 space-y-1 text-slate-400">
                <li>
                  <b>Bracket not generating?</b> Ensure enough checked-in teams/players, and team settings match tournament requirements.
                </li>
                <li>
                  <b>A player is missing?</b> Search for check-in status and confirm correct signup. Late or duplicate registrations are the usual cause.
                </li>
                <li>
                  <b>Balancing fails?</b> You must have enough checked-in players for your team format. Try forcing a re-check-in or reducing team count.
                </li>
                <li>
                  <b>Map veto not working?</b> Confirm all teams have a captain and check Discord roles; sometimes reloading the Medic helps.
                </li>
                <li>
                  <b>Other bugs?</b> Use the Medic tabs for manual repair. If unsure, call your tech support or reach out in the platform's Discord server.
                </li>
                <li>
                  <b>Still stuck?</b> Screenshot the issue, try refreshing, and share the error details in the admin Discord or get developer help.
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
