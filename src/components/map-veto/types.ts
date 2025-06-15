
export interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url: string | null;
  is_active: boolean; // <-- Added to fix error for all code
}
export interface VetoAction {
  id: string;
  action: 'ban' | 'pick';
  map_id: string;
  team_id: string;
  order_number: number;
  performed_by?: string | null;
  performed_at?: string | null;
  map?: MapData;
  users?: {
    discord_username?: string;
  };
  side_choice?: "attack" | "defend" | null; // <-- Added this field
}
export type MapStatus = {
  action: "ban" | "pick";
  team: string;
} | null;
export type MapActionType = "ban" | "pick";
