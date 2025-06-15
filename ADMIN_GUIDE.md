
# Admin Guide: Operating & Maintaining the Tournament App

## 1. Exporting Schema / Backup

- Go to Admin > Tools > Download Database Schema to export the schema at any time.
- To restore: Open Supabase SQL Editor and run the exported `.sql`.

## 2. Adding/Restoring Demo Data

- Use the admin interface or SQL scripts to seed `maps`, create test tournaments, etc.

## 3. Maintenance

- **Supabase Backup:** Schedule Postgres backups in the Supabase dashboard.
- **Check Realtime:** Verify `REPLICA IDENTITY FULL` and publication status on required tables.
- **Auth:** Confirm Discord and email providers are live and redirect URLs match your domain.

## 4. Troubleshooting

- **Supabase API/Key problems:** Check your `src/integrations/supabase/client.ts` for up-to-date keys.
- **Realtime/data issues:** Ensure tables have RLS, REPLICA IDENTITY FULL, and are added to the publication.
- **Schema migrations:** Apply all `/supabase/migrations/*.sql` in order.

## 5. Updating the App

- Pull latest app code.
- Apply any new migrations using admin schema export or SQL migrations.

---

