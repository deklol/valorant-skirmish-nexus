
# App Architecture Overview

## Overview

This project is a full-stack web app powered by React (Vite, Typescript), Tailwind CSS, Shadcn UI, and Supabase for all backend/database/auth features.

## Main Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind, shadcn/ui
- **Backend**: Supabase (Postgres DB, Auth, Edge Functions, Storage)
- **Real-time**: Supabase Realtime (via RLS-enabled tables)
- **CI/CD**: Deploy as static site (Vercel, Netlify, or custom server)

## Folder Structure

- `/src/components` — app feature components
- `/src/pages` — route pages
- `/src/hooks` — custom React hooks
- `/src/integrations/supabase` — SDK client
- `/supabase/migrations/` — database schema migrations
- `/public` — static assets

## How Authentication Works

- User signs in via Discord or Email (using Supabase Auth)
- Session is stored and managed with the Supabase SDK
- Custom profile fields are stored in the `users` table in Supabase public schema (not in auth.users)

## Key Database Schema

- `users` — application profiles, role, stats
- `tournaments`, `teams`, `matches` — tournament logic
- `map_veto_sessions`, `map_veto_actions` — Map veto system
- `notifications`, `user_notification_preferences` — system & match notifications (with RLS)
- `rank_history`, `phantom_players`, etc — more features

## Real-Time Features

- Realtime enabled on key tables (`matches`, etc) using replica identity and pub/sub channels
- UI auto-updates as database changes

## Edge Functions

- For exporting schemas, external integrations, etc.

---

