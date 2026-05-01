# Add BSCP Course to PEN-200 Tracker

I want to convert my single-course OSCP tracker into a multi-course tracker. The goal: a dashboard that lets me pick between courses (currently just PEN-200, adding BSCP now), then drills into the tracker for the selected course. Architecture should make adding a third course later trivial (just drop in another data file + register it).

## Stack (already in repo)
- Astro + React + TypeScript
- Supabase for auth and progress storage
- Tailwind / whatever styling I already use
- Deployed to GitHub Pages at `/pen200-tracker/`

## Step 1: Read the repo first

Before writing ANY code, do these in order and tell me what you find:

1. Read `package.json` — confirm deps and scripts
2. Read `astro.config.mjs` — confirm base path
3. Read `src/data/` directory — find where PEN-200 modules are defined
4. Read `src/pages/` — map out current routes
5. Read `src/components/` — find the main tracker component(s)
6. Read `src/lib/supabase.ts` (or wherever client is initialized)
7. Find the Supabase progress table schema — check `supabase/migrations/` if present, else infer from queries in the code
8. Identify any auth gating, route guards, or layout wrappers

After reading, give me a 5-10 line summary: "Here's how the current app is structured: [...]". Don't start writing code until I confirm your understanding is correct. **Stop and wait for my approval after this summary.**

## Step 2: Add the BSCP data file

I'm uploading `bscp.ts`. It contains all 274 PortSwigger Web Security Academy labs (61 Apprentice + 174 Practitioner + 39 Expert across 31 topics), pre-typed and structured. Place it at `src/data/bscp.ts` (or wherever my existing course data lives — match the convention).

The file exports:
- `BSCP_TOPICS: BscpTopic[]` — array of topics, each with their labs
- `BscpLab`, `BscpTopic`, `LabLevel` types
- Count constants: `BSCP_TOTAL_LABS` (274), `BSCP_APPRENTICE_COUNT` (61), `BSCP_PRACTITIONER_COUNT` (174), `BSCP_EXPERT_COUNT` (39)

Each lab has a stable `id` (e.g., `sql-injection-01`) for use as a primary key in Supabase.

## Step 3: Course registry

Create `src/data/courses.ts` (or match my convention) that exports a registry of all courses. Something like:

```typescript
export interface Course {
  id: 'pen200' | 'bscp';
  name: string;
  shortName: string;
  description: string;
  icon: string; // emoji or icon identifier
  accentColor: string;
  totalItems: number;
  href: string; // route to the tracker
}

export const COURSES: Course[] = [
  {
    id: 'pen200',
    name: 'OffSec PEN-200 (OSCP)',
    shortName: 'PEN-200',
    description: 'Penetration Testing with Kali Linux — OSCP exam prep',
    icon: '🎯',
    accentColor: 'red',
    totalItems: <count modules in existing pen200 data>,
    href: '/courses/pen200',
  },
  {
    id: 'bscp',
    name: 'PortSwigger Web Security Academy',
    shortName: 'BSCP',
    description: '274 labs covering web app security — BSCP cert prep',
    icon: '🛡️',
    accentColor: 'orange',
    totalItems: 274,
    href: '/courses/bscp',
  },
];
```

Match the casing, color naming, and style conventions already in my codebase.

## Step 4: Supabase schema migration

The existing progress table almost certainly assumes a single course. Add a `course_id` text column so progress for `pen200` and `bscp` can coexist.

Create a migration file `supabase/migrations/<timestamp>_add_course_id.sql` (match my existing migration filename pattern):

```sql
ALTER TABLE <progress_table_name>
  ADD COLUMN course_id TEXT NOT NULL DEFAULT 'pen200';

-- If there's a unique constraint on (user_id, item_id), drop it and recreate as (user_id, course_id, item_id)
-- Check the existing schema before running this; adapt as needed.

CREATE INDEX IF NOT EXISTS idx_progress_user_course
  ON <progress_table_name> (user_id, course_id);
```

Verify the table name and existing constraints from the actual schema before writing the migration. Don't assume.

Also update any TypeScript types that mirror the schema (likely in `src/lib/database.types.ts` or generated types).

## Step 5: Refactor routing

Current state: assume my tracker lives at `/` or `/tracker` and reads PEN-200 data directly.

New structure:
- `src/pages/index.astro` — NEW dashboard. Grid of course cards from the `COURSES` registry. Each card shows icon, name, description, completion percentage (query Supabase for that course's progress count), and a "Continue →" button.
- `src/pages/courses/[course].astro` — dynamic route. Reads the `course` param, loads the corresponding data, passes to a generic tracker component.
- Keep the OLD tracker route working as a redirect to `/courses/pen200` if anything links there.

Use Astro's `getStaticPaths` to pre-render `/courses/pen200` and `/courses/bscp` at build time.

## Step 6: Generalize the tracker component

The existing tracker component (whatever it's named) probably imports PEN-200 data directly. Refactor it to accept a `course` prop:

```typescript
interface TrackerProps {
  course: Course;
  topics: Topic[]; // generic shape that works for both pen200 modules and bscp topics
}
```

If the data shapes differ (PEN-200 modules vs BSCP topics), introduce a small adapter layer. Don't force one shape onto the other if it makes the code uglier — define a normalized `TrackerSection` type that both sources can map to.

When querying Supabase, always filter by `course_id`:
```typescript
.from('progress')
.select('*')
.eq('user_id', user.id)
.eq('course_id', course.id)
```

Same for inserts/updates — always include `course_id` in the payload.

## Step 7: BSCP-specific UI considerations

The BSCP data has three difficulty levels (Apprentice / Practitioner / Expert) which PEN-200 doesn't have. The generic tracker should support an optional level filter or grouping. Suggested UI:

- Filter chips at top: "All / Apprentice / Practitioner / Expert" with counts
- Each lab row: status checkbox + lab name + external link icon (opens `lab.url` in new tab) + small level badge
- Topics collapsed by default with a per-topic progress bar
- Overall progress bar at top of page

If PEN-200 doesn't show level badges or filter chips today, hide those elements when `course.id === 'pen200'` or use a feature flag in the course config.

## Step 8: Dashboard polish

The dashboard should:
- Show a greeting with the logged-in user's name (or email if no name)
- Per-course card: percentage complete, items done / total, a small horizontal progress bar
- A "Last activity" timestamp per course (most recent progress update)
- Sign out button somewhere visible

## Step 9: Don't break existing PEN-200 progress

Critical: my existing PEN-200 progress data must remain intact. The migration sets `course_id = 'pen200'` for all existing rows by default, but verify this before and after the migration. If anything looks risky, write a backup query first.

## Constraints

- Do NOT touch any auth flow (signup/login/password reset). It already works.
- Do NOT change the deployment config or base path. Site lives at `/pen200-tracker/`.
- Match my existing code style: same import order, same naming conventions, same component patterns. Read 2-3 of my existing components before writing new ones.
- Use the same UI library / styling approach already in the repo. Don't introduce new dependencies unless absolutely necessary, and ask first if you must.
- TypeScript strict mode — no `any`, no `// @ts-ignore`.

## Workflow

1. Read repo (Step 1) → give me the summary → wait for my OK.
2. Apply Step 2 (drop in `bscp.ts`) → tell me when done.
3. Plan Steps 3-9 as a series of commits. Show me the commit plan (just the messages and which files each one touches) before writing code.
4. Implement one commit at a time. After each commit, list the files changed and run `npm run build` (or whatever my build command is) to confirm nothing is broken.
5. Final step: tell me what manual steps I need to do (run the migration in Supabase dashboard, verify env vars, test locally before deploying, etc.).

## What I'm uploading alongside this prompt

- `bscp.ts` — the data file with all 274 labs (drop into `src/data/`)

If anything in this prompt conflicts with what you find in the actual repo, **prefer what's in the repo** and tell me about the conflict. Don't blindly follow this prompt if it would break my existing patterns.
