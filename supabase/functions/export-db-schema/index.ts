
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // List of tables to export (can use pg_catalog to create this for automation)
  // For now, just basic "SELECT table_name, column_name,..."
  //'Public' schema only, skip internal
  const sql = `
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  // Connect to Deno Supabase client with service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.9");
  const supabase = createClient(supabaseUrl, serviceKey);

  let schemaLines: string[] = [];
  try {
    // Get column info
    const { data, error } = await supabase.rpc("execute_literal_sql", { sql_code: sql });
    if (error) throw new Error("SQL Fetch Error: " + error.message);

    const columns = data as Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string }>;
    let lastTable = "";
    for (const col of columns) {
      if (col.table_name !== lastTable) {
        schemaLines.push(`\n-- Table: ${col.table_name}\nCREATE TABLE ${col.table_name} (`);
        lastTable = col.table_name;
      }
      schemaLines.push(
        `  ${col.column_name} ${col.data_type}${col.is_nullable === "NO" ? " NOT NULL" : ""}${col.column_default ? " DEFAULT " + col.column_default : ""},`
      );
    }
    // Clean up final comma and close
    if (schemaLines.length > 0) {
      schemaLines[schemaLines.length - 1] = schemaLines[schemaLines.length - 1].replace(/,$/, "");
      schemaLines.push(");\n");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ sql_schema: schemaLines.join("\n") }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
