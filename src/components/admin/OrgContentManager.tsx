import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Upload, Trash2, Image as ImageIcon } from "lucide-react";

interface OrgContent {
  id: string;
  org_name: string | null;
  org_tagline: string | null;
  org_about: string | null;
  org_image_url: string | null;
  org_history_enabled: boolean | null;
  org_history_title: string | null;
  org_history_content: string | null;
  org_founded_year: number | null;
  show_org_section: boolean | null;
}

const OrgContentManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState<OrgContent>({
    id: "",
    org_name: "",
    org_tagline: "",
    org_about: "",
    org_image_url: "",
    org_history_enabled: true,
    org_history_title: "Our Story",
    org_history_content: "",
    org_founded_year: null,
    show_org_section: true,
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("homepage_content")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: "Error loading content", description: error.message, variant: "destructive" });
    } else if (data) {
      setContent(data as OrgContent);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `org-image-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      setContent((prev) => ({ ...prev, org_image_url: urlData.publicUrl }));
      toast({ title: "Image uploaded", description: "Don't forget to save!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setContent((prev) => ({ ...prev, org_image_url: "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("homepage_content")
        .update({
          org_name: content.org_name || null,
          org_tagline: content.org_tagline || null,
          org_about: content.org_about || null,
          org_image_url: content.org_image_url || null,
          org_history_enabled: content.org_history_enabled,
          org_history_title: content.org_history_title || null,
          org_history_content: content.org_history_content || null,
          org_founded_year: content.org_founded_year,
          show_org_section: content.show_org_section,
          updated_at: new Date().toISOString(),
        })
        .eq("id", content.id);

      if (error) throw error;
      toast({ title: "Content saved", description: "Organization section updated successfully" });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Building2 className="w-5 h-5 text-primary" />
          Organization Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div>
            <Label className="text-foreground">Show Organization Section</Label>
            <p className="text-sm text-muted-foreground">Display the org section on the homepage</p>
          </div>
          <Switch
            checked={content.show_org_section ?? true}
            onCheckedChange={(checked) => setContent((prev) => ({ ...prev, show_org_section: checked }))}
          />
        </div>

        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Organization Name</Label>
            <Input
              value={content.org_name || ""}
              onChange={(e) => setContent((prev) => ({ ...prev, org_name: e.target.value }))}
              placeholder="e.g., The Last Resort"
              className="bg-background border-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Founded Year</Label>
            <Input
              type="number"
              value={content.org_founded_year || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  org_founded_year: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="e.g., 2024"
              className="bg-background border-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Tagline</Label>
          <Input
            value={content.org_tagline || ""}
            onChange={(e) => setContent((prev) => ({ ...prev, org_tagline: e.target.value }))}
            placeholder="e.g., Competitive Gaming Community"
            className="bg-background border-input"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">About Description</Label>
          <Textarea
            value={content.org_about || ""}
            onChange={(e) => setContent((prev) => ({ ...prev, org_about: e.target.value }))}
            placeholder="Describe your organization..."
            rows={4}
            className="bg-background border-input resize-none"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <Label className="text-muted-foreground">Organization Image</Label>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-32 h-32 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
              {content.org_image_url ? (
                <img src={content.org_image_url} alt="Org" className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-xs text-center px-2">No image</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
                {content.org_image_url && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <Input
                value={content.org_image_url || ""}
                onChange={(e) => setContent((prev) => ({ ...prev, org_image_url: e.target.value }))}
                placeholder="Or paste image URL..."
                className="bg-background border-input text-sm"
              />
              <p className="text-xs text-muted-foreground">Recommended: 800x600 or larger, max 5MB</p>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">History Section</Label>
              <p className="text-sm text-muted-foreground">Add a story/history section</p>
            </div>
            <Switch
              checked={content.org_history_enabled ?? false}
              onCheckedChange={(checked) => setContent((prev) => ({ ...prev, org_history_enabled: checked }))}
            />
          </div>

          {content.org_history_enabled && (
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground">History Section Title</Label>
                <Input
                  value={content.org_history_title || ""}
                  onChange={(e) => setContent((prev) => ({ ...prev, org_history_title: e.target.value }))}
                  placeholder="e.g., Our Story"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">History Content</Label>
                <Textarea
                  value={content.org_history_content || ""}
                  onChange={(e) => setContent((prev) => ({ ...prev, org_history_content: e.target.value }))}
                  placeholder="Tell the story of your organization..."
                  rows={5}
                  className="bg-background border-input resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Organization Content"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgContentManager;
