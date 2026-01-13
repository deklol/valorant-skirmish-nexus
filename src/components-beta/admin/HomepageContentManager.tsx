import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Save, Image, Type, Layout, Eye, EyeOff, 
  Upload, Trash2, RefreshCw, FileText, Building2 
} from "lucide-react";

interface HomepageContent {
  id: string;
  // Hero section
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  hero_image_url: string | null;
  // Org section
  org_name: string | null;
  org_tagline: string | null;
  org_about: string | null;
  org_image_url: string | null;
  org_founded_year: number | null;
  // Org history
  org_history_enabled: boolean | null;
  org_history_title: string | null;
  org_history_content: string | null;
  // Section visibility toggles
  show_hero_section: boolean | null;
  show_org_section: boolean | null;
  show_stats_section: boolean | null;
  show_tournaments_section: boolean | null;
  show_leaderboard_section: boolean | null;
  show_winners_section: boolean | null;
  show_features_section: boolean | null;
  show_how_it_works_section: boolean | null;
  show_faq_section: boolean | null;
  show_formats_section: boolean | null;
}

const DEFAULT_CONTENT: Partial<HomepageContent> = {
  hero_headline: "Welcome to TLR Hub",
  hero_subheadline: "Premier Valorant Tournament Platform",
  hero_cta_text: "Join the Action",
  hero_cta_link: "/tournaments",
  org_name: "The Last Resort",
  org_tagline: "Competitive Gaming Community",
  org_about: "We are a passionate esports organization dedicated to providing the best competitive Valorant experience.",
  org_founded_year: 2024,
  org_history_enabled: true,
  org_history_title: "Our Story",
  org_history_content: "Founded with a vision to create fair, competitive gaming experiences for everyone.",
  show_hero_section: true,
  show_org_section: true,
  show_stats_section: true,
  show_tournaments_section: true,
  show_leaderboard_section: true,
  show_winners_section: true,
  show_features_section: true,
  show_how_it_works_section: true,
  show_faq_section: true,
  show_formats_section: false,
};

export const HomepageContentManager = () => {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingOrg, setUploadingOrg] = useState(false);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_content")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default content if none exists
        const { data: newData, error: insertError } = await supabase
          .from("homepage_content")
          .insert(DEFAULT_CONTENT)
          .select()
          .single();
        
        if (insertError) throw insertError;
        setContent(newData);
      } else {
        setContent(data);
      }
    } catch (error) {
      console.error("Error fetching homepage content:", error);
      toast.error("Failed to load homepage content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    if (!content) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("homepage_content")
        .update({
          hero_headline: content.hero_headline,
          hero_subheadline: content.hero_subheadline,
          hero_cta_text: content.hero_cta_text,
          hero_cta_link: content.hero_cta_link,
          hero_image_url: content.hero_image_url,
          org_name: content.org_name,
          org_tagline: content.org_tagline,
          org_about: content.org_about,
          org_image_url: content.org_image_url,
          org_founded_year: content.org_founded_year,
          org_history_enabled: content.org_history_enabled,
          org_history_title: content.org_history_title,
          org_history_content: content.org_history_content,
          show_hero_section: content.show_hero_section,
          show_org_section: content.show_org_section,
          show_stats_section: content.show_stats_section,
          show_tournaments_section: content.show_tournaments_section,
          show_leaderboard_section: content.show_leaderboard_section,
          show_winners_section: content.show_winners_section,
          show_features_section: content.show_features_section,
          show_how_it_works_section: content.show_how_it_works_section,
          show_faq_section: content.show_faq_section,
          show_formats_section: content.show_formats_section,
          updated_at: new Date().toISOString(),
        })
        .eq("id", content.id);

      if (error) throw error;
      toast.success("Homepage content saved successfully!");
    } catch (error) {
      console.error("Error saving homepage content:", error);
      toast.error("Failed to save homepage content");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    file: File,
    type: "hero" | "org"
  ) => {
    if (!file || !content) return;
    
    const setUploading = type === "hero" ? setUploadingHero : setUploadingOrg;
    setUploading(true);

    try {
      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be less than 5MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `homepage-${type}-${Date.now()}.${fileExt}`;
      const filePath = `homepage/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      const urlField = type === "hero" ? "hero_image_url" : "org_image_url";
      setContent({ ...content, [urlField]: urlData.publicUrl });
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (type: "hero" | "org") => {
    if (!content) return;
    const urlField = type === "hero" ? "hero_image_url" : "org_image_url";
    setContent({ ...content, [urlField]: null });
  };

  const updateField = <K extends keyof HomepageContent>(
    field: K,
    value: HomepageContent[K]
  ) => {
    if (!content) return;
    setContent({ ...content, [field]: value });
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center gap-3 py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-[hsl(var(--beta-accent))]" />
          <span className="text-[hsl(var(--beta-text-muted))]">Loading homepage content...</span>
        </div>
      </GlassCard>
    );
  }

  if (!content) {
    return (
      <GlassCard className="p-6">
        <p className="text-center text-[hsl(var(--beta-text-muted))]">
          Failed to load homepage content
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
            Homepage Content Manager
          </h2>
          <p className="text-sm text-[hsl(var(--beta-text-muted))]">
            Customize your homepage content and visibility
          </p>
        </div>
        <BetaButton onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </BetaButton>
      </div>

      {/* Section Visibility Toggles */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">
            Section Visibility
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { key: "show_hero_section", label: "Hero Section" },
            { key: "show_org_section", label: "Organization Section" },
            { key: "show_stats_section", label: "Stats Grid" },
            { key: "show_tournaments_section", label: "Upcoming Tournaments" },
            { key: "show_leaderboard_section", label: "Top Players" },
            { key: "show_winners_section", label: "Recent Winners" },
            { key: "show_features_section", label: "Features" },
            { key: "show_how_it_works_section", label: "How It Works" },
            { key: "show_faq_section", label: "FAQ" },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-surface-3))]"
            >
              <span className="text-sm text-[hsl(var(--beta-text-primary))]">{label}</span>
              <Switch
                checked={content[key as keyof HomepageContent] as boolean}
                onCheckedChange={(checked) =>
                  updateField(key as keyof HomepageContent, checked)
                }
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Hero Section */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">
            Hero Section
          </h3>
          <BetaBadge variant={content.show_hero_section ? "success" : "default"} size="sm">
            {content.show_hero_section ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {content.show_hero_section ? "Visible" : "Hidden"}
          </BetaBadge>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Headline</Label>
            <Input
              value={content.hero_headline || ""}
              onChange={(e) => updateField("hero_headline", e.target.value)}
              placeholder="Welcome to TLR Hub"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Subheadline</Label>
            <Input
              value={content.hero_subheadline || ""}
              onChange={(e) => updateField("hero_subheadline", e.target.value)}
              placeholder="Premier Valorant Tournament Platform"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">CTA Button Text</Label>
            <Input
              value={content.hero_cta_text || ""}
              onChange={(e) => updateField("hero_cta_text", e.target.value)}
              placeholder="Join the Action"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">CTA Link</Label>
            <Input
              value={content.hero_cta_link || ""}
              onChange={(e) => updateField("hero_cta_link", e.target.value)}
              placeholder="/tournaments"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Hero Background Image</Label>
            <div className="flex gap-4 items-start">
              {content.hero_image_url ? (
                <div className="relative">
                  <img
                    src={content.hero_image_url}
                    alt="Hero background"
                    className="w-40 h-24 object-cover rounded-[var(--beta-radius-md)] border border-[hsl(var(--beta-border))]"
                  />
                  <button
                    onClick={() => removeImage("hero")}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-40 h-24 rounded-[var(--beta-radius-md)] border-2 border-dashed border-[hsl(var(--beta-border))] flex items-center justify-center">
                  <Image className="w-6 h-6 text-[hsl(var(--beta-text-muted))]" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "hero");
                    }}
                    className="hidden"
                  />
                  <BetaButton variant="outline" size="sm" disabled={uploadingHero}>
                    {uploadingHero ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Image
                  </BetaButton>
                </label>
                <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-2">
                  Recommended: 1920x1080, max 5MB
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Organization Section */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
          <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">
            Organization Info
          </h3>
          <BetaBadge variant={content.show_org_section ? "success" : "default"} size="sm">
            {content.show_org_section ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {content.show_org_section ? "Visible" : "Hidden"}
          </BetaBadge>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Organization Name</Label>
            <Input
              value={content.org_name || ""}
              onChange={(e) => updateField("org_name", e.target.value)}
              placeholder="The Last Resort"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Tagline</Label>
            <Input
              value={content.org_tagline || ""}
              onChange={(e) => updateField("org_tagline", e.target.value)}
              placeholder="Competitive Gaming Community"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Founded Year</Label>
            <Input
              type="number"
              value={content.org_founded_year || ""}
              onChange={(e) => updateField("org_founded_year", parseInt(e.target.value) || null)}
              placeholder="2024"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">Organization Image</Label>
            <div className="flex gap-4 items-start">
              {content.org_image_url ? (
                <div className="relative">
                  <img
                    src={content.org_image_url}
                    alt="Organization"
                    className="w-20 h-20 object-cover rounded-[var(--beta-radius-md)] border border-[hsl(var(--beta-border))]"
                  />
                  <button
                    onClick={() => removeImage("org")}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "org");
                    }}
                    className="hidden"
                  />
                  <BetaButton variant="outline" size="sm" disabled={uploadingOrg}>
                    {uploadingOrg ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload
                  </BetaButton>
                </label>
              )}
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">About</Label>
            <Textarea
              value={content.org_about || ""}
              onChange={(e) => updateField("org_about", e.target.value)}
              placeholder="Tell visitors about your organization..."
              rows={3}
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
        </div>
      </GlassCard>

      {/* Organization History */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">
              Organization History
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(var(--beta-text-muted))]">Show history section</span>
            <Switch
              checked={content.org_history_enabled || false}
              onCheckedChange={(checked) => updateField("org_history_enabled", checked)}
            />
          </div>
        </div>
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">History Title</Label>
            <Input
              value={content.org_history_title || ""}
              onChange={(e) => updateField("org_history_title", e.target.value)}
              placeholder="Our Story"
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(var(--beta-text-secondary))]">History Content</Label>
            <Textarea
              value={content.org_history_content || ""}
              onChange={(e) => updateField("org_history_content", e.target.value)}
              placeholder="Share your organization's journey, milestones, and vision..."
              rows={5}
              className="bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default HomepageContentManager;
