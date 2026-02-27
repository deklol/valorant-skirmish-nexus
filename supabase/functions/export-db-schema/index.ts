/**
  Export full database schema as SQL (including RLS, types, policies, functions, triggers, etc).
  This edge function returns a SQL dump matching the running schema for reproducible setup.
  Called from the admin SchemaExportButton in the UI.
  
  REQUIRES: Authenticated admin user.
*/

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

async function verifyAdmin(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, error: "Missing authorization header" };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { authorized: false, error: "Invalid or expired token" };
  }

  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { authorized: false, error: "Admin access required" };
  }

  return { authorized: true };
}

async function exportFullSchema() {
  const { Client } = await import("npm:pg@8.10.0");
  const client = new Client({
    connectionString: Deno.env.get("SUPABASE_DB_URL") as string,
  });
  await client.connect();

  let output = "-- EXPORT: Full database schema, types, policies, functions, triggers\n";

  // Tables
  const tables = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  for (const row of tables.rows) {
    const { tablename } = row;
    const createStmtRes = await client.query(`
      SELECT pg_get_tabledef(c.oid) as ddl
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind='r' AND n.nspname='public' AND c.relname=$1
    `, [tablename]);
    output += `\n-- Table: ${tablename}\n${createStmtRes.rows?.[0]?.ddl ?? ''}`;
  }

  // Types
  const types = await client.query(`
    SELECT n.nspname as schema, t.typname as type
    FROM pg_type t 
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `);
  for (const row of types.rows) {
    const enumsRes = await client.query(`
      SELECT e.enumlabel as value
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname=$1
      ORDER BY e.enumsortorder
    `, [row.type]);
    const enumVals = enumsRes.rows.map((e: any) => `'${e.value}'`).join(', ');
    output += `\n-- Enum type: ${row.type}\nCREATE TYPE ${row.type} AS ENUM (${enumVals});\n`;
  }

  // RLS and policies
  const rlsRes = await client.query(`
    SELECT
      relname,
      relrowsecurity,
      relforcerowsecurity
    FROM pg_class
    WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
      AND relkind = 'r'
  `);
  for (const row of rlsRes.rows) {
    if (row.relrowsecurity) {
      output += `\n-- RLS enabled on ${row.relname}\nALTER TABLE public.${row.relname} ENABLE ROW LEVEL SECURITY;\n`;
    }
    if (row.relforcerowsecurity) {
      output += `ALTER TABLE public.${row.relname} FORCE ROW LEVEL SECURITY;\n`;
    }
    const policies = await client.query(
      `SELECT polname, polcmd, polpermissive, polroles, pg_get_expr(coalesce(polqual, 'true'::text), polrelid), pg_get_expr(coalesce(polwithcheck, 'true'::text), polrelid) FROM pg_policies WHERE schemaname='public' AND tablename=$1`, [row.relname]
    );
    for (const p of policies.rows) {
      output += `CREATE POLICY "${p.polname}" ON public.${row.relname} FOR ${p.polcmd} `;
      if (!p.polpermissive) output += "AS RESTRICTIVE ";
      output += `TO ${p.polroles.map((r: string) => r).join(',')} `;
      output += `USING (${p.pg_get_expr}) WITH CHECK (${p.pg_get_expr_1});\n`;
    }
  }

  // Functions & triggers
  const funcs = await client.query(`
    SELECT
      p.proname,
      pg_get_functiondef(p.oid) as funcdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proisagg = false
    ORDER BY p.proname
  `);
  for (const row of funcs.rows) {
    output += `\n-- Function: ${row.proname}\n${row.funcdef}\n`;
  }

  // Triggers
  const triggers = await client.query(`
    SELECT
      tgname,
      pg_get_triggerdef(t.oid)
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  `);
  for (const row of triggers.rows) {
    output += `\n-- Trigger: ${row.tgname}\n${row.pg_get_triggerdef};\n`;
  }

  await client.end();

  output += `
-- 
-- To initialize: 
-- 1. Upload your SQL schema to a new Supabase project (SQL Editor > run).
-- 2. Configure Auth, providers, "Site URL", etc. as in SETUP.md.
-- 3. Run the app as described.
-- 4. For restoring data, use \`pg_restore\` for full dumps or seed from exported data.
--
`;

  return output;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin authentication
  const { authorized, error: authError } = await verifyAdmin(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: authError }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { mode } = await req.json().catch(() => ({ mode: "basic" }));
  if (mode !== "full") {
    return new Response(JSON.stringify({ error: "Unsupported mode" }), { status: 400, headers: corsHeaders });
  }

  try {
    const sql_schema = await exportFullSchema();
    return new Response(JSON.stringify({ sql_schema }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
