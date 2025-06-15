import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicManager from "@/components/TournamentMedicManager";

interface User {
  id: string;
  discord_username?: string;
  riot_id?: string;
  is_phantom?: boolean;
  is_banned?: boolean;
}

const AdminPage = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [editedRiotId, setEditedRiotId] = useState("");
  const [editedIsPhantom, setEditedIsPhantom] = useState(false);
  const [editedIsBanned, setEditedIsBanned] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .limit(1000);

        if (error) {
          console.error("Error fetching users:", error);
          toast({
            title: "Error",
            description: "Failed to fetch users.",
            variant: "destructive",
          });
        } else {
          setUsers(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, toast]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditedUsername(user.discord_username || "");
    setEditedRiotId(user.riot_id || "");
    setEditedIsPhantom(user.is_phantom || false);
    setEditedIsBanned(user.is_banned || false);
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("users")
        .update({
          discord_username: editedUsername,
          riot_id: editedRiotId,
          is_phantom: editedIsPhantom,
          is_banned: editedIsBanned,
        })
        .eq("id", selectedUser.id);

      if (error) {
        console.error("Error updating user:", error);
        toast({
          title: "Error",
          description: "Failed to update user.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "User updated successfully.",
        });
        // Refresh users
        const { data } = await supabase.from("users").select("*").limit(1000);
        setUsers(data || []);
      }
    } finally {
      setLoading(false);
      setIsEditDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Panel</h1>

        {/* User Management Section */}
        <section className="space-y-4">
          <h2 className="text-xl text-amber-400 font-semibold mb-2 flex items-center gap-2">
            User Management <span className="text-xs text-amber-300">(Full Override)</span>
          </h2>
          {loading ? (
            <p className="text-white">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="bg-slate-800/90 border-slate-700 rounded-md">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-white">Username</TableHead>
                    <TableHead className="text-white">Riot ID</TableHead>
                    <TableHead className="text-white">Phantom</TableHead>
                    <TableHead className="text-white">Banned</TableHead>
                    <TableHead className="text-right text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-white">{user.discord_username}</TableCell>
                      <TableCell className="text-slate-300">{user.riot_id}</TableCell>
                      <TableCell className="text-slate-300">{user.is_phantom ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-slate-300">{user.is_banned ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="secondary" size="sm" onClick={() => handleEditUser(user)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Tournament Medic Section */}
        <section>
          <h2 className="text-xl text-amber-400 font-semibold mb-4 flex items-center gap-2">
            Tournament Medic <span className="text-xs text-amber-300">(Admin Emergency Tool)</span>
          </h2>
          <TournamentMedicManager />
        </section>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Make changes to the selected user.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  className="col-span-3 bg-slate-800 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="riotId" className="text-right">
                  Riot ID
                </Label>
                <Input
                  id="riotId"
                  value={editedRiotId}
                  onChange={(e) => setEditedRiotId(e.target.value)}
                  className="col-span-3 bg-slate-800 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isPhantom" className="text-right">
                  Is Phantom
                </Label>
                <Checkbox
                  id="isPhantom"
                  checked={editedIsPhantom}
                  onCheckedChange={(checked) => setEditedIsPhantom(!!checked)}
                  className="col-span-3 focus:ring-0 focus:ring-offset-0 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isBanned" className="text-right">
                  Is Banned
                </Label>
                <Checkbox
                  id="isBanned"
                  checked={editedIsBanned}
                  onCheckedChange={(checked) => setEditedIsBanned(!!checked)}
                  className="col-span-3 focus:ring-0 focus:ring-offset-0 border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveUser} disabled={loading}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPage;
