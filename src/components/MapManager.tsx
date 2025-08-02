
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StandardInput } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Map, Plus, Edit2, Trash2, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url?: string;
  is_active: boolean;
}

export default function MapManager() {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);
  const [newMap, setNewMap] = useState({
    name: "",
    display_name: "",
    thumbnail_url: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  const fetchMaps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maps")
      .select("*")
      .order("display_name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch maps",
        variant: "destructive",
      });
    } else {
      setMaps(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  const handleCreateMap = async () => {
    if (!newMap.name.trim() || !newMap.display_name.trim()) {
      toast({
        title: "Error",
        description: "Map name and display name are required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("maps").insert([
      {
        name: newMap.name.trim(),
        display_name: newMap.display_name.trim(),
        thumbnail_url: newMap.thumbnail_url.trim() || null,
        is_active: false, // New maps start inactive
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create map",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Map created successfully",
      });
      setNewMap({ name: "", display_name: "", thumbnail_url: "" });
      setShowAddForm(false);
      fetchMaps();
    }
  };

  const handleUpdateMap = async () => {
    if (!editingMap || !editingMap.name.trim() || !editingMap.display_name.trim()) {
      toast({
        title: "Error",
        description: "Map name and display name are required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("maps")
      .update({
        name: editingMap.name.trim(),
        display_name: editingMap.display_name.trim(),
        thumbnail_url: editingMap.thumbnail_url?.trim() || null,
        is_active: editingMap.is_active,
      })
      .eq("id", editingMap.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update map",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Map updated successfully",
      });
      setEditingMap(null);
      fetchMaps();
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm("Are you sure you want to delete this map?")) return;

    const { error } = await supabase.from("maps").delete().eq("id", mapId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete map",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Map deleted successfully",
      });
      fetchMaps();
    }
  };

  const handleToggleActive = async (mapId: string, isActive: boolean) => {
    const activeMapsCount = maps.filter(m => m.is_active).length;
    
    // Warn if trying to activate when we already have 7 active maps
    if (isActive && activeMapsCount >= 7) {
      toast({
        title: "Warning",
        description: "You already have 7 active maps. Consider deactivating another map first.",
        variant: "destructive",
      });
      return;
    }

    // Warn if trying to deactivate when we only have 1-2 active maps
    if (!isActive && activeMapsCount <= 2) {
      toast({
        title: "Warning", 
        description: "You need at least 2 active maps for tournaments.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("maps")
      .update({ is_active: isActive })
      .eq("id", mapId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update map status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Map ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
      fetchMaps();
    }
  };

  const activeMaps = maps.filter(m => m.is_active);
  const inactiveMaps = maps.filter(m => !m.is_active);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">Loading maps...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5" />
            Map Pool Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Active Map Pool Status */}
          <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Current Active Map Pool</h3>
              <Badge className={
                activeMaps.length === 7 
                  ? "bg-green-600/20 text-green-400 border-green-500/40"
                  : activeMaps.length < 2
                  ? "bg-red-600/20 text-red-400 border-red-500/40"
                  : "bg-yellow-600/20 text-yellow-400 border-yellow-500/40"
              }>
                {activeMaps.length} / 7 Maps Active
              </Badge>
            </div>
            
            {activeMaps.length === 7 ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Perfect! Your map pool is ready for competitive tournaments.
              </div>
            ) : activeMaps.length < 2 ? (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                You need at least 2 active maps to create tournaments.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Consider having exactly 7 active maps for optimal competitive play.
              </div>
            )}

            {activeMaps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeMaps.map(map => (
                  <div key={map.id} className="flex items-center gap-2 bg-green-600/10 border border-green-500/30 rounded px-3 py-1">
                    {map.thumbnail_url && (
                      <img src={map.thumbnail_url} alt={map.display_name} className="w-6 h-4 object-cover rounded" />
                    )}
                    <span className="text-green-300 text-sm font-medium">{map.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Map Button */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">All Maps</h3>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Map
            </Button>
          </div>

          {/* Add Map Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <h4 className="font-medium text-white mb-3">Add New Map</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Input
                  placeholder="Map name (e.g., de_dust2)"
                  value={newMap.name}
                  onChange={(e) => setNewMap({ ...newMap, name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <Input
                  placeholder="Display name (e.g., Dust 2)"
                  value={newMap.display_name}
                  onChange={(e) => setNewMap({ ...newMap, display_name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <Input
                  placeholder="Thumbnail URL (optional)"
                  value={newMap.thumbnail_url}
                  onChange={(e) => setNewMap({ ...newMap, thumbnail_url: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateMap} className="bg-green-600 hover:bg-green-700">
                  Create Map
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Maps List */}
          <div className="space-y-3">
            {maps.map((map) => (
              <div
                key={map.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  map.is_active
                    ? "bg-green-600/10 border-green-500/30"
                    : "bg-slate-900/50 border-slate-600"
                }`}
              >
                <div className="flex items-center gap-4">
                  {map.thumbnail_url && (
                    <img
                      src={map.thumbnail_url}
                      alt={map.display_name}
                      className="w-16 h-10 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{map.display_name}</h4>
                      <Badge className={
                        map.is_active
                          ? "bg-green-600/20 text-green-400 border-green-500/40"
                          : "bg-gray-600/20 text-gray-400 border-gray-500/40"
                      }>
                        {map.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{map.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Active/Inactive Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {map.is_active ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={map.is_active}
                      onCheckedChange={(checked) => handleToggleActive(map.id, checked)}
                    />
                  </div>

                  {/* Edit Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingMap(map)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteMap(map.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Map Modal */}
      {editingMap && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Edit Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                placeholder="Map name"
                value={editingMap.name}
                onChange={(e) => setEditingMap({ ...editingMap, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Input
                placeholder="Display name"
                value={editingMap.display_name}
                onChange={(e) => setEditingMap({ ...editingMap, display_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Input
                placeholder="Thumbnail URL"
                value={editingMap.thumbnail_url || ""}
                onChange={(e) => setEditingMap({ ...editingMap, thumbnail_url: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Active in map pool:</span>
                <Switch
                  checked={editingMap.is_active}
                  onCheckedChange={(checked) => setEditingMap({ ...editingMap, is_active: checked })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateMap} className="bg-green-600 hover:bg-green-700">
                Save Changes
              </Button>
              <Button onClick={() => setEditingMap(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
