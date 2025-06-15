
# Tournament Platform App — Setup Guide

Welcome! This document guides you through setting up this tournament platform app from scratch.

---

## 1. Prerequisites

- Node.js (v18+)
- [Bun](https://bun.sh/) or [npm](https://nodejs.org/en/)
- Git
- Supabase account

## 2. Clone the repository

```sh
git clone https://github.com/yourorg/your-tournament-app.git
cd your-tournament-app
```

## 3. Install dependencies

```sh
bun install
# or
npm install
```

## 4. Create a Supabase project

- Go to https://app.supabase.com and create a new project.
- Copy the Supabase **project URL** and **Anon/Public Key**.

## 5. Link app to Supabase

This app uses static configuration in `src/integrations/supabase/client.ts`.  
Replace the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with your project's credentials if needed.

**Optional:** Set secrets via the Supabase dashboard → [Settings > API](https://supabase.com/dashboard/project/_/settings/api)

## 6. Set up database schema

**EASIEST:**  
Log in as admin in the app, go to Admin > Tools, and press “Download Database Schema” — you’ll receive a `.sql` for the exact schema.

**OR**  
Apply the `/supabase/migrations/*.sql` in order, using the Supabase SQL editor or CLI.

## 7. Configure Auth

- In Supabase dashboard, go to Authentication > Providers and enable:
  - Email (default)
  - Discord (recommended for this app)
- Set the Site URL and Redirect URLs (see below):

  ```
  Site URL: [URL of your deployed app, e.g., https://yourdomain.com]
  Redirect URLs: [Same as Site URL, plus any subpages if needed]
  ```

## 8. Run the app locally

```sh
bun run dev
# or
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

