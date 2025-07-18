import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Upload, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
}

const SponsorManager = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    display_order: 0,
    is_active: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sponsors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sponsor-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sponsor-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let logoUrl = editingSponsor?.logo_url || null;

    if (logoFile) {
      const uploadedUrl = await uploadLogo(logoFile);
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      } else {
        return; // Upload failed
      }
    }

    try {
      const sponsorData = {
        name: formData.name,
        logo_url: logoUrl,
        website_url: formData.website_url || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      if (editingSponsor) {
        const { error } = await supabase
          .from('sponsors')
          .update(sponsorData)
          .eq('id', editingSponsor.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Sponsor updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('sponsors')
          .insert([sponsorData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Sponsor created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSponsors();
    } catch (error) {
      console.error('Error saving sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to save sponsor",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;

    try {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
      fetchSponsors();
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to delete sponsor",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      website_url: "",
      display_order: 0,
      is_active: true,
    });
    setLogoFile(null);
    setEditingSponsor(null);
  };

  const openEditDialog = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      website_url: sponsor.website_url || "",
      display_order: sponsor.display_order,
      is_active: sponsor.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">Loading sponsors...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Sponsor Management</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Sponsor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingSponsor ? 'Update sponsor information' : 'Add a new sponsor to display on the website'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300">Sponsor Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="website_url" className="text-slate-300">Website URL (optional)</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="logo" className="text-slate-300">Logo (optional)</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Recommended: PNG or JPG, max 2MB
                  </p>
                </div>

                <div>
                  <Label htmlFor="display_order" className="text-slate-300">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="text-slate-300">Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {uploading ? 'Uploading...' : editingSponsor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sponsors.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No sponsors configured. Add your first sponsor to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={`${sponsor.name} logo`}
                      className="h-8 w-auto max-w-20 object-contain"
                    />
                  ) : (
                    <div className="h-8 w-20 bg-slate-600 rounded flex items-center justify-center text-xs text-slate-300">
                      No Logo
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-white">{sponsor.name}</h3>
                      {sponsor.website_url && (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      Order: {sponsor.display_order} | {sponsor.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(sponsor)}
                    className="border-slate-600 text-slate-300"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(sponsor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SponsorManager;