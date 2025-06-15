
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

type Submission = {
  id: string;
  submitted_by: string;
  submitted_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  score_team1: number;
  score_team2: number;
  winner_id: string | null;
  status: string;
  // Fetched from join:
  user: { discord_username: string | null } | null;
};

interface MatchResultHistoryProps {
  matchId: string;
  team1Name: string;
  team2Name: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-700 text-white"><CheckCircle className="inline w-3 h-3 mr-1" /> Confirmed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-700 text-white"><Clock className="inline w-3 h-3 mr-1" /> Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-700 text-white"><AlertTriangle className="inline w-3 h-3 mr-1" /> Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function MatchResultHistory({ matchId, team1Name, team2Name }: MatchResultHistoryProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    supabase
      .from("match_result_submissions")
      .select("*, user:submitted_by(discord_username)")
      .eq("match_id", matchId)
      .order("submitted_at", { ascending: true })
      .then(({ data }) => {
        if (isMounted && data) {
          // Defensive fix: Only assign valid user objects, else null
          const cleanData = data.map((sub: any) => {
            let user = null;
            if (
              sub.user &&
              typeof sub.user === "object" &&
              !Array.isArray(sub.user) &&
              Object.prototype.hasOwnProperty.call(sub.user, "discord_username") &&
              !("error" in sub.user)
            ) {
              user = { discord_username: sub.user.discord_username };
            }
            return { ...sub, user };
          });
          setSubmissions(cleanData);
        }
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [matchId]);

  if (loading) return <div>Loading match result history...</div>;
  if (submissions.length === 0)
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 text-sm text-slate-400">
          No score submissions yet.
        </CardContent>
      </Card>
    );

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-base">Score Submission History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {submissions.map(sub => (
            <div key={sub.id} className="rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between bg-slate-800 border border-slate-700">
              <div>
                <span className="font-semibold text-white">{sub.user?.discord_username || sub.submitted_by.slice(0, 8) || "Captain"}</span>
                <span className="ml-2 text-xs text-slate-400">{new Date(sub.submitted_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-white mt-1 md:mt-0">
                <span>{team1Name} <b>{sub.score_team1}</b> - <b>{sub.score_team2}</b> {team2Name}</span>
                <span className="ml-2 italic text-slate-300">{sub.winner_id ? `Winner: ${sub.winner_id.slice(0,8)}` : ""}</span>
              </div>
              <div className="ml-auto">{statusBadge(sub.status)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
