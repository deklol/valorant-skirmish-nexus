import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BannerImageInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  helpText?: string;
}

export default function BannerImageInput({ label = "Banner Image", value, onChange, helpText }: BannerImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase
        .storage
        .from("tournament-banners")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase
        .storage
        .from("tournament-banners")
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      toast({ title: "Banner uploaded", description: "Your banner image was uploaded successfully." });
    } catch (err: any) {
      console.error("Banner upload failed", err);
      toast({ title: "Upload failed", description: err.message ?? "Could not upload banner.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <div className="grid grid-cols-1 gap-3">
        <Input
          placeholder="Paste image URL (e.g. https://i.imgur.com/...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-700 border-slate-600 text-white"
        />
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={handleFileChange} className="bg-slate-700 border-slate-600 text-white" />
          <Button type="button" disabled={uploading} className="bg-red-600 hover:bg-red-700">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        {helpText && <p className="text-slate-400 text-sm">{helpText}</p>}
      </div>

      {value && (
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-2">
            <AspectRatio ratio={16 / 9}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Tournament banner preview"
                className="w-full h-full object-cover rounded"
                loading="lazy"
              />
            </AspectRatio>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
