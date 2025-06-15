import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Use Supabase Edge Functions to export schema (enhanced for full schema)
const SchemaExportButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      // Enhanced: hits an edge function for FULL schema export
      const resp = await fetch("https://tmncfnwtqorbmxxyxhle.functions.supabase.co/export-db-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }) // Pass this to export everything including RLS, functions, etc
      });
      if (!resp.ok) throw new Error("Server error: " + resp.statusText);

      const { sql_schema } = await resp.json();
      const blob = new Blob([sql_schema], { type: "text/sql" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tournament-platform-full-schema.sql";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Full Schema Downloaded", description: "SQL schema export complete." });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className="bg-slate-900 w-full flex items-center gap-2 mt-4" onClick={handleExport} disabled={loading}>
      <Download className="w-4 h-4" />
      {loading ? 'Exporting Full Schema...' : 'Download Full Database Schema'}
    </Button>
  );
};

export default SchemaExportButton;
