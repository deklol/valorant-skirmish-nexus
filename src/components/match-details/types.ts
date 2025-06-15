
export interface Match {
  id: string;
  status?: string;
  team1_id?: string;
  team2_id?: string;
  team1?: { name?: string };
  team2?: { name?: string };
  round_number?: number;
  [key: string]: any; // Expand as needed for your project
}
