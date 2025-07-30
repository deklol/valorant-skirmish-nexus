import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { StandardInput } from "@/components/ui/standard-input";
import { StandardTextarea } from "@/components/ui/standard-textarea";
import { StandardSelect } from "@/components/ui/standard-select"; // This is the main Select component
import {
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"; // Import sub-components for Select
import { StandardHeading } from "@/components/ui/standard-heading";
import { StandardText } from "@/components/ui/standard-text";
import { StandardBadge } from "@/components/ui/standard-badge";
import { PageCard } from "@/components/ui/page-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  Trash2,
  Youtube,
  Twitch,
  Star,
  ExternalLink,
  Eye
} from "lucide-react";

interface VOD {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  tournament_id: string | null;
  casters: string[] | null;
  production_team: string[] | null;
  video_platform: string;
  embed_id: string | null;
  duration_minutes: number | null;
  view_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  tournaments?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

export function VODManager() {
  const [vods, setVods] = useState<VOD[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVod, setEditingVod] = useState<VOD | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    tournament_id: "",
    casters: "",
    production_team: "",
    video_platform: "youtube",
    duration_minutes: "",
    is_featured: false,
    is_active: true,
  });

  useEffect(() => {
    fetchVods();
    fetchTournaments();
  }, []);

  const fetchVods = async () => {
    try {
      const { data, error } = await supabase
        .from("vods")
        .select(`
          *,
          tournaments (
            id,
            name,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVods(data || []);
    } catch (error) {
      console.error("Error fetching VODs:", error);
      toast({
        title: "Error",
        description: "Failed to load VODs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("status", "completed")
        .order("start_time", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      tournament_id: "",
      casters: "",
      production_team: "",
      video_platform: "youtube",
      duration_minutes: "",
      is_featured: false,
      is_active: true,
    });
    setEditingVod(null);
  };

  const handleEdit = (vod: VOD) => {
    setEditingVod(vod);
    setFormData({
      title: vod.title,
      description: vod.description || "",
      video_url: vod.video_url,
      thumbnail_url: vod.thumbnail_url || "",
      tournament_id: vod.tournament_id || "",
      casters: vod.casters?.join(", ") || "",
      production_team: vod.production_team?.join(", ") || "",
      video_platform: vod.video_platform,
      duration_minutes: vod.duration_minutes?.toString() || "",
      is_featured: vod.is_featured,
      is_active: vod.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.video_url) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const vodData = {
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        tournament_id: formData.tournament_id || null,
        casters: formData.casters ? formData.casters.split(",").map(c => c.trim()).filter(c => c) : null,
        production_team: formData.production_team ? formData.production_team.split(",").map(p => p.trim()).filter(p => p) : null,
        video_platform: formData.video_platform,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
      };

      let error;
      if (editingVod) {
        ({ error } = await supabase
          .from("vods")
          .update(vodData)
          .eq("id", editingVod.id));
      } else {
        ({ error } = await supabase
          .from("vods")
          .insert([vodData]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `VOD ${editingVod ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      fetchVods();
    } catch (error) {
      console.error("Error saving VOD:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingVod ? "update" : "create"} VOD`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (vodId: string) => {
    // IMPORTANT: Replaced window.confirm with a placeholder.
    // For a real application, you should implement a custom modal
    // or dialog component for user confirmation instead of window.confirm.
    // Example: A custom <ConfirmDialog> component.
    const confirmed = await new Promise((resolve) => {
      // This is a simplified placeholder. In a real app, you'd show a modal
      // and resolve true/false based on user interaction with the modal buttons.
      // For now, it will always resolve true to allow deletion for testing,
      // but you MUST replace this with a proper UI confirmation.
      console.warn("Using a placeholder for confirmation. Implement a custom modal for user confirmation.");
      resolve(true); // Always confirm for now, replace with actual modal logic
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("vods")
        .delete()
        .eq("id", vodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "VOD deleted successfully",
      });

      fetchVods();
    } catch (error) {
      console.error("Error deleting VOD:", error);
      toast({
        title: "Error",
        description: "Failed to delete VOD",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (vodId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("vods")
        .update({ is_featured: !currentStatus })
        .eq("id", vodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `VOD ${!currentStatus ? "featured" : "unfeatured"} successfully`,
      });

      fetchVods();
    } catch (error) {
      console.error("Error updating VOD:", error);
      toast({
        title: "Error",
        description: "Failed to update VOD",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <PageCard>
      <div className="flex justify-between items-center mb-6">
        <StandardHeading level="h2">VOD Management</StandardHeading>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add VOD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVod ? "Edit VOD" : "Add New VOD"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <StandardInput
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter VOD title"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <StandardTextarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter VOD description"
                    rows={3}
                  />
                </div>

                {/* Video Platform Select */}
                <div>
                  <Label htmlFor="video_platform">Platform *</Label>
                  <StandardSelect
                    value={formData.video_platform}
                    onValueChange={(value) => setFormData({...formData, video_platform: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </StandardSelect>
                </div>

                <div>
                  <Label htmlFor="video_url">Video URL *</Label>
                  <StandardInput
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="thumbnail_url">Custom Thumbnail URL</Label>
                  <StandardInput
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <StandardInput
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    placeholder="120"
                  />
                </div>

                {/* Tournament Select */}
                <div>
                  <Label htmlFor="tournament_id">Tournament</Label>
                  <StandardSelect
                    value={formData.tournament_id}
                    onValueChange={(value) => setFormData({...formData, tournament_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tournament (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select tournament (optional)</SelectItem>
                      {tournaments.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </StandardSelect>
                </div>

                <div>
                  <Label htmlFor="casters">Casters (comma-separated)</Label>
                  <StandardInput
                    id="casters"
                    value={formData.casters}
                    onChange={(e) => setFormData({...formData, casters: e.target.value})}
                    placeholder="Caster1, Caster2, Caster3"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="production_team">Production Team (comma-separated)</Label>
                  <StandardInput
                    id="production_team"
                    value={formData.production_team}
                    onChange={(e) => setFormData({...formData, production_team: e.target.value})}
                    placeholder="Producer1, Editor1, Director1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVod ? "Update VOD" : "Create VOD"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <StandardText>Loading VODs...</StandardText>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Tournament</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vods.map((vod) => (
                <TableRow key={vod.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {vod.is_featured && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium">{vod.title}</div>
                        {vod.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {vod.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {vod.video_platform === "youtube" ? (
                        <Youtube className="w-4 h-4 text-red-500" />
                      ) : (
                        <Twitch className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="capitalize">{vod.video_platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vod.tournaments ? (
                      <StandardText className="text-sm">
                        {vod.tournaments.name}
                      </StandardText>
                    ) : (
                      <StandardText className="text-sm text-muted-foreground">
                        No tournament
                      </StandardText>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      {vod.view_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <StandardBadge status={vod.is_active ? "success" : "error"}>
                        {vod.is_active ? "Active" : "Inactive"}
                      </StandardBadge>
                      {vod.is_featured && (
                        <StandardBadge status="warning">
                          Featured
                        </StandardBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StandardText className="text-sm">
                      {formatDate(vod.created_at)}
                    </StandardText>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(vod.video_url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeatured(vod.id, vod.is_featured)}
                      >
                        <Star className={`w-4 h-4 ${vod.is_featured ? "text-yellow-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(vod)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(vod.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && vods.length === 0 && (
        <div className="text-center py-8">
          <StandardText className="text-muted-foreground">
            No VODs found. Create your first VOD to get started.
          </StandardText>
        </div>
      )}
    </PageCard>
  );
}
