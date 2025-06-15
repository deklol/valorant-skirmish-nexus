
# Deployment & Production Guide

Instructions to deploy this app and link it to Supabase.

---

## Build for Production

```sh
bun run build
# or
npm run build
```

Upload the `dist/` output to your preferred web server, or deploy directly using Vercel, Netlify, or similar.

## Environment Configuration

**All configuration is via `src/integrations/supabase/client.ts`.**  
If you want to keep your keys secret, set environment variables in your web host and update this file to read from them if supported.

## Supabase URL and API Key

- `SUPABASE_URL`: Found in Supabase project dashboard > Settings > API.
- `SUPABASE_PUBLISHABLE_KEY`: Found in the same place, labeled "anon public".

## Linking to Supabase

If you redeploy, make sure your keys are correct in the deployed code.

## Auth Providers

Check that Discord, Email, and any others needed are enabled and properly configured.
- Use the same Site URL/Redirect from setup.

## Domain Configuration

- Set custom domains in your hosting provider and update the “Site URL” in Supabase > Auth config.
- Set up SSL/TLS (auto-managed by most hosts).

## Backup & Restore

- Use the admin interface (“Download Database Schema”) for schema dumps.
- For regular backups, schedule schema/download exports via Supabase automations or pg_dump.

---

