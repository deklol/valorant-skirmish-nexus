import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MatchOverviewTab from "@/components/match-details/MatchOverviewTab";
import MatchScoreTab from "@/components/match-details/MatchScoreTab";
import MatchVetoManager from "@/components/MapVetoManager";
import MatchPlayersTab from "@/components/match-details/MatchPlayersTab";
import { Match } from "@/components/match-details/types";
import MapVetoHistory from "../map-veto/MapVetoHistory";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MatchTabsProps {
  match: Match;
  userTeamId: string | null;
  isAdmin: boolean;
  onScoreSubmitted: () => void;
}

// Add a tab to show public veto audit history (bans/picks/side choices)
function MatchVetoHistoryTab({ matchId }: { matchId: string }) {
  const [vetoActions, setVetoActions] = useState<any[]>([]);
  useEffect(() => {
    async function fetchAudit() {
      // Fetch audit logs for veto session(s) for this match
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "map_veto_actions")
        .order("created_at", { ascending: true });
      setVetoActions(data || []);
    }
    fetchAudit();
  }, [matchId]);
  if (!vetoActions.length)
    return (
      <Card className="bg-slate-800 border-slate-700 mt-4">
        <CardContent className="p-5">No veto actions found for this match.</CardContent>
      </Card>
    );
  return (
    <Card className="bg-slate-800 border-slate-700 mt-4">
      <CardContent>
        <h3 className="text-white font-semibold text-lg mb-3">Veto History (Audit Log)</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Map</TableHead>
              <TableHead>Team/User</TableHead>
              <TableHead>Side Choice</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vetoActions.map((a, i) => (
              <TableRow key={a.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <Badge>
                    {a?.new_values?.action?.toUpperCase?.() || "?"}
                  </Badge>
                </TableCell>
                <TableCell>{a?.map_display_name || a?.new_values?.map_id?.slice?.(0, 6) || "?"}</TableCell>
                <TableCell>
                  {a?.user_id?.slice?.(0, 8) || a?.user_id || "?"}
                </TableCell>
                <TableCell>
                  {a?.new_values?.side_choice ? (
                    <Badge className={a.new_values.side_choice === "attack"
                      ? "bg-red-600/30 text-red-300"
                      : "bg-blue-700/30 text-blue-200"
                    }>
                      {a.new_values.side_choice?.toUpperCase()}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {a?.created_at
                    ? new Date(a.created_at).toLocaleString()
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const MatchTabs: React.FC<MatchTabsProps> = ({
  match,
  userTeamId,
  isAdmin,
  onScoreSubmitted,
}) => {
  const TABS = [
    {
      label: "Overview",
      render: (props: any) => <MatchOverviewTab match={props.match} />,
    },
    {
      label: "Score",
      render: (props: any) => (
        <MatchScoreTab
          match={props.match}
          userTeamId={props.userTeamId}
          isAdmin={props.isAdmin}
          onScoreSubmitted={props.onScoreSubmitted}
        />
      ),
    },
    {
      label: "Veto",
      render: (props: any) => (
        <MatchVetoManager
          matchId={props.match.id}
          team1Id={props.match.team1_id}
          team2Id={props.match.team2_id}
          team1Name={props.match.team1?.name || "Team 1"}
          team2Name={props.match.team2?.name || "Team 2"}
          matchStatus={props.match.status}
          userTeamId={props.userTeamId}
          roundNumber={props.match.round_number}
          isAdmin={props.isAdmin}
        />
      ),
    },
    {
      label: "Players",
      render: (props: any) => (
        <MatchPlayersTab
          matchId={props.match.id}
          team1Id={props.match.team1_id}
          team2Id={props.match.team2_id}
        />
      ),
    },
    { label: "Veto History", render: (props: any) => <MatchVetoHistoryTab matchId={props.match.id} /> },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full mt-4">
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.label} value={tab.label.toLowerCase()}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab) => (
        <TabsContent key={tab.label} value={tab.label.toLowerCase()}>
          {
            tab.render({
              match: match,
              userTeamId: userTeamId,
              isAdmin: isAdmin,
              onScoreSubmitted: onScoreSubmitted,
            })
          }
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default MatchTabs;
