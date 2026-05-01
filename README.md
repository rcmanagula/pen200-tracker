# PEN-200 OSCP Progress Tracker

Modern Astro 6.1 rebuild of the PEN-200 progress tracker. It keeps the original course data, study plan, localStorage keys, and video progress key format while adding a cleaner light dashboard UI and Supabase-backed account sync.

Tailwind is wired through PostCSS. The latest `@astrojs/tailwind` package currently declares peer support only through Astro 5, so this project avoids that integration to keep Astro 6 installs clean.

## Features

- Course/module progress tracking with chapter and video checklists
- Start date tracking, current study day, today banner, schedule panel, stats, and completion banner
- Expand all, collapse all, mark all watched, and reset progress
- localStorage-first persistence using the original keys
- Login-first Supabase username/password auth + cloud sync using only public client environment variables
- Static GitHub Pages deployment

The video key format is preserved:

```ts
`${code}_${chapterNumberPadded}_${lessonNumberPadded}`
```

Examples: `IG_02_01`, `ITWAA_02_03`, `SQLI_02_02`.

## Local Setup

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

The app works without any Supabase environment variables for local development. In that mode it saves progress only to localStorage and shows `Cloud sync not configured.`

## Supabase Setup

Create a Supabase project, keep email/password auth enabled, and add your local and GitHub Pages URLs to the Supabase Auth redirect URLs. Sign-up collects username, email, and password. Sign-in uses username and password through the `username-auth` Edge Function, which keeps username-to-email lookup server-side and returns generic login failures.

Create `.env.local`:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Never use or expose a Supabase service role key in this static app.

The deployed Edge Function may use Supabase-managed server-side secrets such as `SUPABASE_SERVICE_ROLE_KEY`; those are not bundled into the static client.

## SQL Table

Run this in the Supabase SQL editor:

```sql
create table if not exists tracker_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tracker_name text not null default 'pen200',
  progress jsonb not null default '{}',
  start_date date,
  updated_at timestamptz default now(),
  unique (user_id, tracker_name)
);
```

## RLS Policies

```sql
alter table tracker_progress enable row level security;

create policy "Users can read own tracker progress"
on tracker_progress
for select
using (auth.uid() = user_id);

create policy "Users can insert own tracker progress"
on tracker_progress
for insert
with check (auth.uid() = user_id);

create policy "Users can update own tracker progress"
on tracker_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

The username lookup table is `public.user_profiles`. It has RLS enabled and only lets authenticated users read their own profile. Public username/password sign-in is handled by the deployed `username-auth` Edge Function.

## Sync Behavior

- Signed out: login gate is shown before the tracker
- Supabase not configured: localStorage only
- Signed in: load cloud progress and compare `updated_at`
- Newer cloud data wins when it has progress or a start date
- Empty cloud data, missing cloud rows, or newer local edits upload local progress
- Every checkbox or start date change saves locally first, then upserts to Supabase when signed in

## GitHub Pages Deployment

`astro.config.mjs` is set for a project repo named `pen200-tracker`:

```js
site: "https://USERNAME.github.io",
base: "/pen200-tracker",
```

Adjust these before deploying:

- For a user/organization repo named `USERNAME.github.io`, use `base: "/"`.
- For a project repo, use `base: "/repo-name"`.
- Replace `USERNAME` with your GitHub username or organization.

The included workflow deploys on pushes to `main`:

```text
.github/workflows/deploy.yml
```

If using Supabase in production, add these GitHub repository secrets:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Then enable GitHub Pages with GitHub Actions as the source.

## Limitations

- Sync conflict handling is intentionally simple and timestamp-based.
- Google login is not required by default; configure it in Supabase if you want to extend the sign-in UI.
- The app is light mode only.
- This is a static client app, so all cloud access must use the public anon key plus RLS.
