
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}

const MapManager = () => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    thumbnail_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaps(data || []);
    } catch (error) {
      console.error('Error fetching maps:', error);
      toast({
        title: "Error",
        description: "Failed to load maps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMap) {
        // Update existing map
        const { error } = await supabase
          .from('maps')
          .update({
            name: formData.name,
            display_name: formData.display_name,
            thumbnail_url: formData.thumbnail_url || null
          })
          .eq('id', editingMap.id);

        if (error) throw error;

        toast({
          title: "Map Updated",
          description: `${formData.display_name} has been updated successfully`,
        });
      } else {
        // Create new map
        const { error } = await supabase
          .from('maps')
          .insert({
            name: formData.name,
            display_name: formData.display_name,
            thumbnail_url: formData.thumbnail_url || null,
            is_active: true
          });

        if (error) throw error;

        toast({
          title: "Map Added",
          description: `${formData.display_name} has been added to the map pool`,
        });
      }

      setDialogOpen(false);
      setEditingMap(null);
      setFormData({ name: '', display_name: '', thumbnail_url: '' });
      fetchMaps();
    } catch (error: any) {
      console.error('Error saving map:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save map",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (map: MapData) => {
    setEditingMap(map);
    setFormData({
      name: map.name,
      display_name: map.display_name,
      thumbnail_url: map.thumbnail_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (mapId: string, mapName: string) => {
    if (!confirm(`Are you sure you want to delete "${mapName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('maps')
        .delete()
        .eq('id', mapId);

      if (error) throw error;

      toast({
        title: "Map Deleted",
        description: `${mapName} has been removed from the map pool`,
      });

      fetchMaps();
    } catch (error: any) {
      console.error('Error deleting map:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete map",
        variant: "destructive",
      });
    }
  };

  const toggleMapStatus = async (mapId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('maps')
        .update({ is_active: !currentStatus })
        .eq('id', mapId);

      if (error) throw error;

      toast({
        title: "Map Status Updated",
        description: `Map has been ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchMaps();
    } catch (error: any) {
      console.error('Error updating map status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update map status",
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setEditingMap(null);
    setFormData({ name: '', display_name: '', thumbnail_url: '' });
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <p className="text-white">Loading maps...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-400" />
            Map Manager
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetDialog}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Map
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingMap ? 'Edit Map' : 'Add New Map'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Map Name (Internal)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="e.g., ascent, bind, haven"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-white">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="e.g., Ascent, Bind, Haven"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url" className="text-white">Thumbnail URL</Label>
                  <Input
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="https://example.com/map-image.jpg"
                    type="url"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetDialog}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingMap ? 'Update Map' : 'Add Map'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {maps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No maps added yet.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Map
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Map</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Map Name (Internal)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g., ascent, bind, haven"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name" className="text-white">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g., Ascent, Bind, Haven"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url" className="text-white">Thumbnail URL</Label>
                    <Input
                      id="thumbnail_url"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com/map-image.jpg"
                      type="url"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDialog}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add Map
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">Preview</TableHead>
                  <TableHead className="text-slate-300">Map Name</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maps.map((map) => (
                  <TableRow key={map.id}>
                    <TableCell>
                      {map.thumbnail_url ? (
                        <img
                          src={map.thumbnail_url}
                          alt={map.display_name}
                          className="w-16 h-10 object-cover rounded border border-slate-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-10 bg-slate-700 rounded border border-slate-600 flex items-center justify-center">
                          <Map className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-white font-medium">{map.display_name}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => toggleMapStatus(map.id, map.is_active)}
                        className={`px-3 py-1 text-xs ${
                          map.is_active
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {map.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(map)}
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(map.id, map.display_name)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
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
      </CardContent>
    </Card>
  );
};

export default MapManager;
