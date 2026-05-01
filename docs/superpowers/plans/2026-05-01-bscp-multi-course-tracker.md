# Multi-Course Tracker: BSCP + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BSCP (274 PortSwigger Web Security Academy labs) as a second course and build a dashboard course-picker, converting the existing single-course PEN-200 tracker into a multi-course platform without breaking any existing PEN-200 progress data.

**Architecture:** Three Astro pages — `/` (dashboard), `/pen200` (existing PEN-200 tracker relocated from `/`), `/bscp` (new BSCP tracker). Each course page boots its own vanilla-JS tracker module sharing auth/sync infrastructure. Progress is stored in the existing `tracker_progress` Supabase table using the `tracker_name` column as the course discriminator — **no schema migration needed** since `tracker_name` already exists and defaults to `'pen200'`.

**Tech Stack:** Astro 6, TypeScript strict, Tailwind CSS 3, Supabase JS SDK, vanilla DOM JS — no React, no new npm dependencies.

---

## Conflicts with Prompt (Prefer What's In the Repo)

These are deviations from the spec, confirmed by reading the actual codebase:

1. **No DB migration needed** — `tracker_progress` already has `tracker_name TEXT NOT NULL DEFAULT 'pen200'` with a unique constraint on `(user_id, tracker_name)`. BSCP simply uses `tracker_name = 'bscp'`. Prompt's Step 4 (adding a `course_id` column) is unnecessary and would be a destructive change.
2. **No React** — All components are Astro server-rendered + vanilla JS. Prompt's `TrackerProps` React interface doesn't apply.
3. **Data file is `src/data/course.ts`** (singular, exports `COURSE`) — new courses registry goes in `src/data/courses.ts` (plural).
4. **Routing is currently a single-page hash-based SPA** — new structure uses separate Astro pages, each with its own boot script.
5. **`bscp.ts` is already at the repo root** (untracked) — needs to move to `src/data/bscp.ts`.

---

## File Structure

### Files to CREATE

| File | Purpose |
|------|---------|
| `src/data/bscp.ts` | BSCP lab data (274 labs, 31 topics) — moved from root |
| `src/data/courses.ts` | Course registry with `Course` interface and `COURSES` array |
| `src/pages/pen200.astro` | PEN-200 tracker page (same content as current `index.astro`) |
| `src/pages/bscp.astro` | BSCP tracker page |
| `src/lib/bscp_tracker.ts` | BSCP tracker boot script (mirrors `tracker.ts` for BSCP data) |
| `src/lib/dashboard.ts` | Dashboard boot script (auth check + Supabase progress fetch) |
| `src/components/CourseCard.astro` | Dashboard course card with live progress |
| `src/components/bscp/BscpSidebar.astro` | BSCP sidebar (topic nav + footer) |
| `src/components/bscp/BscpSidebarNav.astro` | 31-topic nav list with per-topic progress bars |
| `src/components/bscp/BscpMainPane.astro` | BSCP main area: header, level filter chips, topic list |
| `src/components/bscp/BscpTopicView.astro` | Collapsible topic section with lab rows |
| `src/components/bscp/BscpLabRow.astro` | Lab row: checkbox + name + external link + level badge |

### Files to MODIFY

| File | Change |
|------|--------|
| `src/lib/storage.ts` | Add `makeStorageKeys(name)` factory function |
| `src/lib/tracker/sync.ts` | Add `trackerName: string` param to `loadCloud` and `saveCloud` |
| `src/lib/supabase.ts` | Remove `TRACKER_NAME` export (now passed as arg per call site) |
| `src/lib/tracker.ts` | Pass `'pen200'` explicitly to `loadCloud`/`saveCloud` |
| `src/components/AppShell.astro` | Add optional `title` prop (default: current PEN-200 title) |
| `src/components/SidebarBrand.astro` | Add optional `shortName`/`subtitle` props with PEN-200 defaults |
| `src/pages/index.astro` | Replace with dashboard page |

---

## Task 1: Move bscp.ts into src/data/

**Files:**
- Create: `src/data/bscp.ts`

> Before starting: verify `bscp.ts` exists at the repo root with `ls bscp.ts`.

- [ ] **Step 1: Copy the file**

```bash
cp bscp.ts src/data/bscp.ts
```

- [ ] **Step 2: Verify exports** Open `src/data/bscp.ts` and confirm these exports exist at the top level. If any are missing, add them after the `BSCP_TOPICS` array:

```typescript
export const BSCP_TOTAL_LABS = 274;
export const BSCP_APPRENTICE_COUNT = 61;
export const BSCP_PRACTITIONER_COUNT = 174;
export const BSCP_EXPERT_COUNT = 39;
```

- [ ] **Step 3: Verify TypeScript is happy**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors from `src/data/bscp.ts`

- [ ] **Step 4: Commit**

```bash
git add src/data/bscp.ts
git commit -m "feat: add BSCP data file (274 labs, 31 topics)"
```

---

## Task 2: Add makeStorageKeys factory

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Add the factory after the existing constants**

The current file starts with four `export const` key strings. Keep all of them unchanged (PEN-200 still imports these directly). Add the factory immediately after:

```typescript
// Add after LAST_SYNCED_KEY line:
export function makeStorageKeys(name: string) {
  return {
    progressKey: `${name}_progress_v2`,
    startDateKey: `${name}_startdate`,
    updatedAtKey: `${name}_updated_at`,
    lastSyncedKey: `${name}_last_synced`,
  } as const;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build exits 0, no new errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add makeStorageKeys factory for multi-course localStorage keys"
```

---

## Task 3: Parameterize sync.ts and remove TRACKER_NAME

**Files:**
- Modify: `src/lib/tracker/sync.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/tracker.ts`

- [ ] **Step 1: Update loadCloud signature in sync.ts**

In `src/lib/tracker/sync.ts`, line 1 currently imports `TRACKER_NAME` from `@/lib/supabase`. Remove that import and update the function signatures:

Replace the entire file content with:

```typescript
import { getSupabaseClient, type Session } from "@/lib/supabase";
import type { ProgressState } from "@/lib/progress";

type SyncState = "off" | "ok" | "syncing" | "warn" | "error";

export function setSyncState(state: SyncState, label?: string): void {
  const root = document.getElementById("syncStatus");
  if (!root) return;
  root.dataset.syncState = state;
  const labelEl = root.querySelector<HTMLElement>("[data-sync-label]");
  if (labelEl && label !== undefined) labelEl.textContent = label;
}

export type CloudSnapshot = {
  progress: ProgressState;
  startDate: string;
  updatedAt: string;
};

export async function loadCloud(session: Session, trackerName: string): Promise<CloudSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("tracker_progress")
    .select("progress,start_date,updated_at")
    .eq("user_id", session.user.id)
    .eq("tracker_name", trackerName)
    .maybeSingle();
  if (error || !data) return null;
  return {
    progress: (data.progress as ProgressState) ?? {},
    startDate: data.start_date ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

export async function saveCloud(
  session: Session,
  progress: ProgressState,
  startDate: string,
  trackerName: string,
): Promise<{ ok: boolean; updatedAt?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false };
  const updatedAt = new Date().toISOString();
  const { error } = await client.from("tracker_progress").upsert(
    {
      user_id: session.user.id,
      tracker_name: trackerName,
      progress,
      start_date: startDate || null,
      updated_at: updatedAt,
    },
    { onConflict: "user_id,tracker_name" },
  );
  if (error) return { ok: false };
  return { ok: true, updatedAt };
}
```

- [ ] **Step 2: Remove TRACKER_NAME export from supabase.ts**

In `src/lib/supabase.ts`, delete line 4: `export const TRACKER_NAME = "pen200";`
Also delete the `TrackerProgressRecord` type (lines 6-10) if it is no longer imported anywhere else — check with `grep -r "TrackerProgressRecord" src/` first.

The final `src/lib/supabase.ts` should be:

```typescript
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url
    && anonKey
    && !String(url).includes("PASTE_")
    && !String(anonKey).includes("PASTE_"),
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}

export type { Session };
```

- [ ] **Step 3: Update tracker.ts call sites (two changes)**

In `src/lib/tracker.ts`:

Find line ~67 inside `queueCloudSave`:
```typescript
const result = await saveCloud(session!, progress, startDate);
```
Change to:
```typescript
const result = await saveCloud(session!, progress, startDate, "pen200");
```

Find line ~81 inside `loadOrMergeCloud`:
```typescript
const cloud = await loadCloud(session);
```
Change to:
```typescript
const cloud = await loadCloud(session, "pen200");
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds. TypeScript reports no errors in sync.ts, supabase.ts, or tracker.ts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracker/sync.ts src/lib/supabase.ts src/lib/tracker.ts
git commit -m "refactor: parameterize trackerName in sync functions for multi-course support"
```

---

## Task 4: Add props to AppShell and SidebarBrand

**Files:**
- Modify: `src/components/AppShell.astro`
- Modify: `src/components/SidebarBrand.astro`

- [ ] **Step 1: Update AppShell.astro frontmatter**

The file has no Props interface yet. Add one and wire the `title` prop to the `<title>` tag. Only the frontmatter and `<title>` change — leave the `<style is:global>` block and everything else exactly as-is:

```astro
---
import "@/styles/global.css";

interface Props {
  title?: string;
}
const { title = "PEN-200 OSCP Progress Tracker" } = Astro.props;

const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
---
```

Then in the `<head>` section change `<title>PEN-200 OSCP Progress Tracker</title>` to `<title>{title}</title>`.

- [ ] **Step 2: Update SidebarBrand.astro**

Replace the entire file (the SVG icon stays identical):

```astro
---
interface Props {
  shortName?: string;
  subtitle?: string;
}
const { shortName = "PEN-200", subtitle = "Progress Tracker" } = Astro.props;
---

<header class="px-5 pt-6 pb-5 border-b border-default">
  <div class="flex items-center gap-3">
    <span aria-hidden="true" class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 L4 7 v6 c0 4 3.5 7 8 8 4.5-1 8-4 8-8 V7 Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
    <div class="leading-tight">
      <div class="font-display text-h2 text-fg-default">{shortName}</div>
      <div class="text-tiny text-fg-muted">{subtitle}</div>
    </div>
  </div>
</header>
```

`Sidebar.astro` passes no props to `<SidebarBrand />`, so the PEN-200 defaults apply automatically — no other file changes needed.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds, PEN-200 sidebar and page title still show the original strings.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.astro src/components/SidebarBrand.astro
git commit -m "feat: add optional title/shortName props to AppShell and SidebarBrand"
```

---

## Task 5: Create course registry

**Files:**
- Create: `src/data/courses.ts`

- [ ] **Step 1: Create src/data/courses.ts**

```typescript
import { COURSE } from "@/data/course";
import { BSCP_TOTAL_LABS } from "@/data/bscp";

export interface Course {
  id: "pen200" | "bscp";
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accentColor: string;
  totalItems: number;
  href: string; // relative path slug, e.g. "pen200"
}

const pen200Total = COURSE.reduce(
  (sum, m) => sum + m.chapters.reduce((s, c) => s + c.lessons.length, 0),
  0,
);

export const COURSES: Course[] = [
  {
    id: "pen200",
    name: "OffSec PEN-200 (OSCP)",
    shortName: "PEN-200",
    description: "Penetration Testing with Kali Linux — OSCP exam prep",
    icon: "🎯",
    accentColor: "red",
    totalItems: pen200Total,
    href: "pen200",
  },
  {
    id: "bscp",
    name: "PortSwigger Web Security Academy",
    shortName: "BSCP",
    description: "274 labs covering web app security — BSCP cert prep",
    icon: "🛡️",
    accentColor: "orange",
    totalItems: BSCP_TOTAL_LABS,
    href: "bscp",
  },
];
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/data/courses.ts
git commit -m "feat: add course registry with PEN-200 and BSCP entries"
```

---

## Task 6: Move PEN-200 tracker to /pen200

**Files:**
- Create: `src/pages/pen200.astro`

- [ ] **Step 1: Create src/pages/pen200.astro**

This is an exact copy of the current `index.astro` — no changes to imports or content:

```astro
---
import AppShell from "@/components/AppShell.astro";
import AuthGate from "@/components/AuthGate.astro";
import Sidebar from "@/components/Sidebar.astro";
import MainPane from "@/components/MainPane.astro";
import Toast from "@/components/Toast.astro";
---

<AppShell title="PEN-200 OSCP Progress Tracker">
  <AuthGate />
  <div id="trackerApp" class="app-grid">
    <Sidebar />
    <MainPane />
  </div>
  <Toast />
  <script>
    import "@/lib/tracker";
  </script>
</AppShell>
```

> Note: The `AppShell` in the original `index.astro` had no `title` prop (using the default). Adding it explicitly here is identical in effect but more readable.

- [ ] **Step 2: Verify /pen200 route is created**

Run: `npm run build && test -f dist/pen200/index.html && echo "✓ pen200 route exists"`
Expected: prints `✓ pen200 route exists`

- [ ] **Step 3: Commit**

```bash
git add src/pages/pen200.astro
git commit -m "feat: add /pen200 route (PEN-200 tracker relocated from root)"
```

---

## Task 7: Build dashboard page

**Files:**
- Create: `src/components/CourseCard.astro`
- Create: `src/lib/dashboard.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create CourseCard.astro**

Read `src/styles/global.css` first to confirm the custom utility classes available (e.g., `btn`, `btn-primary`, `bg-surface`, `border-default`, `text-fg-muted`, `text-fg-default`, `bg-bg-subtle`, `bg-accent`, `text-on-accent`, `text-tiny`, `text-small`, `text-h2`, `font-display`). Use the exact same classes seen in existing components.

```astro
---
import type { Course } from "@/data/courses";

interface Props {
  course: Course;
  base: string;
}
const { course, base } = Astro.props;
const href = base.endsWith("/") ? `${base}${course.href}` : `${base}/${course.href}`;
---

<div
  class="flex flex-col gap-4 rounded-xl border border-default bg-surface p-6 transition-shadow hover:shadow-lg"
  data-course-card={course.id}
>
  <div class="flex items-start justify-between gap-3">
    <span class="text-3xl" aria-hidden="true">{course.icon}</span>
    <span
      class="rounded-full bg-accent/10 px-3 py-1 text-tiny font-medium text-accent"
      data-course-percent={course.id}
    >—</span>
  </div>

  <div>
    <h2 class="font-display text-h2 text-fg-default">{course.shortName}</h2>
    <p class="mt-1 text-small text-fg-muted">{course.description}</p>
  </div>

  <div class="space-y-1">
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
      <div
        class="h-full rounded-full bg-accent transition-[width] duration-500"
        style="width: 0%"
        data-course-bar={course.id}
      ></div>
    </div>
    <div class="flex justify-between text-tiny text-fg-muted">
      <span data-course-done={course.id}>0 / {course.totalItems}</span>
      <span data-course-last={course.id}></span>
    </div>
  </div>

  <a href={href} class="btn btn-primary mt-auto self-start">Continue →</a>
</div>
```

- [ ] **Step 2: Create src/lib/dashboard.ts**

```typescript
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ProgressState } from "@/lib/progress";
import { COURSES } from "@/data/courses";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function hydrateDashboard(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return;

  // Resolve display name from user_profiles table
  const { data: profile } = await client
    .from("user_profiles")
    .select("username")
    .eq("user_id", session.user.id)
    .maybeSingle();
  const displayName =
    (profile as { username?: string } | null)?.username ??
    session.user.email ??
    "there";

  const greeting = document.getElementById("dashGreeting");
  const signOutBtn = document.getElementById("dashSignOut");
  if (greeting) {
    greeting.textContent = `Hi, ${displayName}`;
    greeting.classList.remove("hidden");
  }
  if (signOutBtn) {
    signOutBtn.classList.remove("hidden");
    signOutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.reload();
    });
  }

  // Fetch progress rows for both courses in one query
  const trackerNames = COURSES.map((c) => c.id); // ["pen200", "bscp"]
  const { data: rows } = await client
    .from("tracker_progress")
    .select("tracker_name,progress,updated_at")
    .eq("user_id", session.user.id)
    .in("tracker_name", trackerNames);

  if (!rows) return;

  for (const course of COURSES) {
    const row = rows.find((r) => r.tracker_name === course.id);
    const prog = row ? ((row.progress as ProgressState) ?? {}) : {};
    const done = Object.values(prog).filter(Boolean).length;
    const pct = course.totalItems > 0 ? Math.round((done / course.totalItems) * 100) : 0;

    const percentEl = document.querySelector<HTMLElement>(`[data-course-percent="${course.id}"]`);
    const doneEl = document.querySelector<HTMLElement>(`[data-course-done="${course.id}"]`);
    const barEl = document.querySelector<HTMLElement>(`[data-course-bar="${course.id}"]`);
    const lastEl = document.querySelector<HTMLElement>(`[data-course-last="${course.id}"]`);

    if (percentEl) percentEl.textContent = `${pct}%`;
    if (doneEl) doneEl.textContent = `${done} / ${course.totalItems}`;
    if (barEl) barEl.style.width = `${pct}%`;
    if (lastEl && row?.updated_at) lastEl.textContent = `Last: ${formatDate(row.updated_at)}`;
  }
}

hydrateDashboard();
```

- [ ] **Step 3: Replace src/pages/index.astro with the dashboard**

```astro
---
import AppShell from "@/components/AppShell.astro";
import CourseCard from "@/components/CourseCard.astro";
import Toast from "@/components/Toast.astro";
import { COURSES } from "@/data/courses";

const base = import.meta.env.BASE_URL;
---

<AppShell title="Course Tracker Dashboard">
  <div class="min-h-screen bg-bg-canvas">
    <header class="flex items-center justify-between border-b border-default bg-surface px-6 py-4">
      <div class="flex items-center gap-3">
        <span
          aria-hidden="true"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3 L4 7 v6 c0 4 3.5 7 8 8 4.5-1 8-4 8-8 V7 Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <span class="font-display text-h2 text-fg-default">Course Tracker</span>
      </div>
      <div class="flex items-center gap-3">
        <span id="dashGreeting" class="hidden text-small text-fg-muted"></span>
        <button id="dashSignOut" type="button" class="btn btn-ghost btn-danger hidden">
          Sign out
        </button>
      </div>
    </header>

    <main id="main" class="mx-auto max-w-3xl px-6 py-10">
      <h1 class="font-display text-h1 text-fg-default mb-2">My Courses</h1>
      <p class="mb-8 text-small text-fg-muted">Track your progress across certifications.</p>

      <div class="grid gap-5 sm:grid-cols-2">
        {COURSES.map((course) => <CourseCard course={course} base={base} />)}
      </div>
    </main>
  </div>
  <Toast />
  <script>
    import "@/lib/dashboard";
  </script>
</AppShell>
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds. Check that `dist/index.html` and `dist/pen200/index.html` both exist.

```bash
ls dist/index.html dist/pen200/index.html
```

- [ ] **Step 5: Commit**

```bash
git add src/components/CourseCard.astro src/lib/dashboard.ts src/pages/index.astro
git commit -m "feat: add dashboard page with course cards and live Supabase progress"
```

---

## Task 8: Create BSCP Astro components

**Files:**
- Create: `src/components/bscp/BscpLabRow.astro`
- Create: `src/components/bscp/BscpTopicView.astro`
- Create: `src/components/bscp/BscpMainPane.astro`
- Create: `src/components/bscp/BscpSidebarNav.astro`
- Create: `src/components/bscp/BscpSidebar.astro`

> Before writing: read `src/components/LessonRow.astro`, `src/components/ChapterSection.astro`, and `src/components/SidebarNav.astro` to match component patterns exactly.

- [ ] **Step 1: Create BscpLabRow.astro**

```astro
---
import type { BscpLab } from "@/data/bscp";

interface Props {
  lab: BscpLab;
}
const { lab } = Astro.props;

const levelLabel = { apprentice: "A", practitioner: "P", expert: "E" }[lab.level];
const levelColor = {
  apprentice: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950",
  practitioner: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950",
  expert: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950",
}[lab.level];
---

<div
  class="group flex items-center gap-3 rounded px-3 py-2 hover:bg-bg-subtle"
  data-bscp-lab
  data-bscp-level={lab.level}
  data-bscp-key={lab.id}
>
  <input
    type="checkbox"
    class="h-4 w-4 shrink-0 cursor-pointer rounded border-default accent-accent"
    data-bscp-checkbox
    data-key={lab.id}
    id={`lab-${lab.id}`}
    aria-label={lab.name}
  />
  <label
    for={`lab-${lab.id}`}
    class="flex-1 cursor-pointer text-small leading-snug text-fg-default group-has-[input:checked]:text-fg-muted group-has-[input:checked]:line-through"
  >
    {lab.name}
  </label>
  <span class={`shrink-0 rounded px-1.5 py-0.5 text-tiny font-medium ${levelColor}`}>
    {levelLabel}
  </span>
  <a
    href={lab.url}
    target="_blank"
    rel="noopener noreferrer"
    class="shrink-0 text-fg-subtle opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
    aria-label={`Open ${lab.name} in new tab`}
  >
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </a>
</div>
```

- [ ] **Step 2: Create BscpTopicView.astro**

```astro
---
import type { BscpTopic } from "@/data/bscp";
import BscpLabRow from "@/components/bscp/BscpLabRow.astro";

interface Props {
  topic: BscpTopic;
}
const { topic } = Astro.props;
---

<section data-bscp-topic={topic.id} class="border-b border-default last:border-0">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-subtle"
    data-bscp-topic-toggle={topic.id}
    aria-expanded="false"
    aria-controls={`topic-body-${topic.id}`}
  >
    <span class="font-medium text-fg-default">{topic.name}</span>
    <div class="flex shrink-0 items-center gap-3">
      <div class="flex items-center gap-1.5">
        <div class="h-1.5 w-20 overflow-hidden rounded-full bg-bg-subtle">
          <div
            class="h-full rounded-full bg-accent transition-[width]"
            style="width: 0%"
            data-bscp-topic-bar={topic.id}
          ></div>
        </div>
        <span class="text-tiny text-fg-muted" data-bscp-topic-count={topic.id}>
          0/{topic.labs.length}
        </span>
      </div>
      <svg
        class="h-4 w-4 shrink-0 text-fg-subtle transition-transform"
        data-bscp-topic-chevron={topic.id}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  </button>

  <div id={`topic-body-${topic.id}`} data-bscp-topic-body={topic.id} class="hidden px-1 pb-2">
    {topic.labs.map((lab) => <BscpLabRow lab={lab} />)}
  </div>
</section>
```

- [ ] **Step 3: Create BscpMainPane.astro**

```astro
---
import type { BscpTopic } from "@/data/bscp";
import {
  BSCP_TOTAL_LABS,
  BSCP_APPRENTICE_COUNT,
  BSCP_PRACTITIONER_COUNT,
  BSCP_EXPERT_COUNT,
} from "@/data/bscp";
import BscpTopicView from "@/components/bscp/BscpTopicView.astro";

interface Props {
  topics: BscpTopic[];
}
const { topics } = Astro.props;
---

<main id="main" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
  <!-- Sticky header: overall progress + level filter chips -->
  <div class="sticky top-0 z-10 border-b border-default bg-surface px-6 py-4">
    <div class="mb-2 flex items-center justify-between gap-4">
      <h1 class="font-display text-h2 text-fg-default">Web Security Academy</h1>
      <span class="text-small text-fg-muted">
        <span id="bscpDone">0</span> / {BSCP_TOTAL_LABS} labs
      </span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
      <div
        id="bscpOverallBar"
        class="h-full rounded-full bg-accent transition-[width] duration-300"
        style="width: 0%"
      ></div>
    </div>
    <!-- Level filter chips -->
    <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by difficulty">
      <button
        type="button"
        class="rounded-full border border-accent bg-accent px-3 py-1 text-tiny font-medium text-on-accent"
        data-bscp-filter="all"
      >All ({BSCP_TOTAL_LABS})</button>
      <button
        type="button"
        class="rounded-full border border-default px-3 py-1 text-tiny font-medium text-fg-muted hover:text-fg-default"
        data-bscp-filter="apprentice"
      >Apprentice ({BSCP_APPRENTICE_COUNT})</button>
      <button
        type="button"
        class="rounded-full border border-default px-3 py-1 text-tiny font-medium text-fg-muted hover:text-fg-default"
        data-bscp-filter="practitioner"
      >Practitioner ({BSCP_PRACTITIONER_COUNT})</button>
      <button
        type="button"
        class="rounded-full border border-default px-3 py-1 text-tiny font-medium text-fg-muted hover:text-fg-default"
        data-bscp-filter="expert"
      >Expert ({BSCP_EXPERT_COUNT})</button>
    </div>
  </div>

  <!-- Topic list -->
  <div>
    {topics.map((topic) => <BscpTopicView topic={topic} />)}
  </div>
</main>
```

- [ ] **Step 4: Create BscpSidebarNav.astro**

```astro
---
import type { BscpTopic } from "@/data/bscp";

interface Props {
  topics: BscpTopic[];
}
const { topics } = Astro.props;
---

<nav aria-label="Topics" class="flex-1 overflow-y-auto py-2">
  <ul class="space-y-0.5 px-2">
    {
      topics.map((topic) => (
        <li>
          <button
            type="button"
            class="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-small text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg-default"
            data-bscp-nav-item={topic.id}
          >
            <span class="flex-1 truncate text-left leading-snug">{topic.name}</span>
            <div class="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-bg-subtle">
              <div
                class="h-full rounded-full bg-accent"
                style="width: 0%"
                data-bscp-nav-bar={topic.id}
              ></div>
            </div>
          </button>
        </li>
      ))
    }
  </ul>
</nav>
```

- [ ] **Step 5: Create BscpSidebar.astro**

```astro
---
import SidebarBrand from "@/components/SidebarBrand.astro";
import SidebarFooter from "@/components/SidebarFooter.astro";
import BscpSidebarNav from "@/components/bscp/BscpSidebarNav.astro";
import type { BscpTopic } from "@/data/bscp";

interface Props {
  topics: BscpTopic[];
}
const { topics } = Astro.props;
---

<aside data-sidebar aria-label="Topics and account" class="flex flex-col border-r border-default bg-surface">
  <SidebarBrand shortName="BSCP" subtitle="Lab Tracker" />
  <BscpSidebarNav topics={topics} />
  <SidebarFooter />
</aside>
<div id="drawerBackdrop" aria-hidden="true"></div>
```

- [ ] **Step 6: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds — all BSCP components compile without errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/bscp/
git commit -m "feat: add BSCP Astro components (sidebar, topic views, lab rows, filter chips)"
```

---

## Task 9: Create BSCP tracker boot script

**Files:**
- Create: `src/lib/bscp_tracker.ts`

> Before writing: read `src/lib/tracker/auth.ts` to confirm the exact `AuthMode` type, `isValidUsername`, `checkUsername`, `signIn`, `signUp` signatures and return types. Read `src/lib/tracker/toast.ts` to confirm the `showToast` signature.

- [ ] **Step 1: Create src/lib/bscp_tracker.ts**

```typescript
import { BSCP_TOPICS, BSCP_TOTAL_LABS } from "@/data/bscp";
import type { LabLevel } from "@/data/bscp";
import type { ProgressState } from "@/lib/progress";
import { makeStorageKeys } from "@/lib/storage";
import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";
import { initTheme } from "@/lib/tracker/theme";
import { initDrawer } from "@/lib/tracker/drawer";
import { showToast } from "@/lib/tracker/toast";
import { setSyncState, loadCloud, saveCloud } from "@/lib/tracker/sync";
import {
  isValidUsername,
  checkUsername,
  signIn,
  signUp,
  type AuthMode,
} from "@/lib/tracker/auth";

const TRACKER_NAME = "bscp";
const KEYS = makeStorageKeys(TRACKER_NAME);

// ---- Storage ---------------------------------------------------------------

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEYS.progressKey);
    return raw ? (JSON.parse(raw) as ProgressState) : {};
  } catch {
    return {};
  }
}

function saveProgressLocal(p: ProgressState): void {
  localStorage.setItem(KEYS.progressKey, JSON.stringify(p));
}

function loadLocalUpdatedAt(): string {
  return localStorage.getItem(KEYS.updatedAtKey) || "";
}

function touchLocalTimestamp(ts = new Date().toISOString()): string {
  localStorage.setItem(KEYS.updatedAtKey, ts);
  return ts;
}

function saveLastSynced(ts: string): void {
  localStorage.setItem(KEYS.lastSyncedKey, ts);
}

// ---- State -----------------------------------------------------------------

let progress: ProgressState = loadProgress();
let localUpdatedAt: string = loadLocalUpdatedAt();
let session: Session | null = null;
let accountName = "";
let authMode: AuthMode = "sign-in";
let usernameAvailable: boolean | null = null;
let usernameTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let activeFilter: "all" | LabLevel = "all";

// ---- Progress rendering ----------------------------------------------------

function countDone(): number {
  return Object.values(progress).filter(Boolean).length;
}

function refreshOverallProgress(): void {
  const done = countDone();
  const pct = BSCP_TOTAL_LABS > 0 ? Math.round((done / BSCP_TOTAL_LABS) * 100) : 0;
  const doneEl = document.getElementById("bscpDone");
  if (doneEl) doneEl.textContent = String(done);
  const bar = document.getElementById("bscpOverallBar") as HTMLElement | null;
  if (bar) bar.style.width = `${pct}%`;
}

function refreshTopicProgress(): void {
  for (const topic of BSCP_TOPICS) {
    const done = topic.labs.filter((l) => progress[l.id]).length;
    const total = topic.labs.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const count = document.querySelector<HTMLElement>(`[data-bscp-topic-count="${topic.id}"]`);
    if (count) count.textContent = `${done}/${total}`;

    const bar = document.querySelector<HTMLElement>(`[data-bscp-topic-bar="${topic.id}"]`);
    if (bar) bar.style.width = `${pct}%`;

    const navBar = document.querySelector<HTMLElement>(`[data-bscp-nav-bar="${topic.id}"]`);
    if (navBar) navBar.style.width = `${pct}%`;
  }
}

function refreshCheckboxes(): void {
  document.querySelectorAll<HTMLInputElement>("[data-bscp-checkbox]").forEach((cb) => {
    const key = cb.dataset["key"];
    if (key) cb.checked = Boolean(progress[key]);
  });
}

function refresh(): void {
  refreshCheckboxes();
  refreshOverallProgress();
  refreshTopicProgress();
}

// ---- Level filter ----------------------------------------------------------

function applyFilter(level: "all" | LabLevel): void {
  activeFilter = level;

  document.querySelectorAll<HTMLElement>("[data-bscp-filter]").forEach((btn) => {
    const isActive = btn.dataset["bscpFilter"] === level;
    btn.classList.toggle("bg-accent", isActive);
    btn.classList.toggle("text-on-accent", isActive);
    btn.classList.toggle("border-accent", isActive);
    btn.classList.toggle("text-fg-muted", !isActive);
    btn.classList.toggle("border-default", !isActive);
  });

  document.querySelectorAll<HTMLElement>("[data-bscp-lab]").forEach((row) => {
    const labLevel = row.dataset["bscpLevel"] as LabLevel;
    row.classList.toggle("hidden", level !== "all" && labLevel !== level);
  });
}

// ---- Topic accordion -------------------------------------------------------

function initTopicAccordions(): void {
  document.querySelectorAll<HTMLElement>("[data-bscp-topic-toggle]").forEach((btn) => {
    const topicId = btn.dataset["bscpTopicToggle"];
    if (!topicId) return;
    btn.addEventListener("click", () => {
      const body = document.querySelector<HTMLElement>(`[data-bscp-topic-body="${topicId}"]`);
      const chevron = document.querySelector<SVGElement>(`[data-bscp-topic-chevron="${topicId}"]`);
      if (!body) return;
      const isOpen = !body.classList.contains("hidden");
      body.classList.toggle("hidden", isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (chevron) {
        chevron.style.transform = isOpen ? "" : "rotate(180deg)";
      }
    });
  });
}

// ---- Sidebar nav: scroll to topic ------------------------------------------

function initSidebarNav(): void {
  document.querySelectorAll<HTMLElement>("[data-bscp-nav-item]").forEach((btn) => {
    const topicId = btn.dataset["bscpNavItem"];
    if (!topicId) return;
    btn.addEventListener("click", () => {
      const body = document.querySelector<HTMLElement>(`[data-bscp-topic-body="${topicId}"]`);
      const toggleBtn = document.querySelector<HTMLElement>(
        `[data-bscp-topic-toggle="${topicId}"]`,
      );
      if (body?.classList.contains("hidden") && toggleBtn) toggleBtn.click();
      const section = document.querySelector<HTMLElement>(`[data-bscp-topic="${topicId}"]`);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ---- Cloud sync ------------------------------------------------------------

function queueCloudSave(): void {
  if (!isSupabaseConfigured() || !session) return;
  if (syncTimer) clearTimeout(syncTimer);
  setSyncState("syncing", "Syncing…");
  syncTimer = setTimeout(async () => {
    const result = await saveCloud(session!, progress, "", TRACKER_NAME);
    if (result.ok && result.updatedAt) {
      localUpdatedAt = touchLocalTimestamp(result.updatedAt);
      saveLastSynced(result.updatedAt);
      setSyncState("ok", "Synced just now");
    } else {
      setSyncState("error", "Sync failed");
    }
  }, 500);
}

async function loadOrMergeCloud(): Promise<void> {
  if (!session) return;
  setSyncState("syncing", "Syncing…");
  const cloud = await loadCloud(session, TRACKER_NAME);
  if (!cloud) {
    setSyncState("error", "Sync failed");
    return;
  }
  const cloudHasData = Object.keys(cloud.progress).length > 0;
  const cloudNewer =
    cloud.updatedAt && (!localUpdatedAt || new Date(cloud.updatedAt) > new Date(localUpdatedAt));
  const localHasData = Object.keys(progress).length > 0;

  if (cloudHasData && cloudNewer) {
    progress = cloud.progress;
    saveProgressLocal(progress);
    localUpdatedAt = touchLocalTimestamp(cloud.updatedAt);
    saveLastSynced(cloud.updatedAt);
    setSyncState("ok", "Loaded cloud progress");
    refresh();
    return;
  }
  if (localHasData || !cloudHasData) {
    const result = await saveCloud(session, progress, "", TRACKER_NAME);
    if (result.ok && result.updatedAt) {
      localUpdatedAt = touchLocalTimestamp(result.updatedAt);
      saveLastSynced(result.updatedAt);
      setSyncState("ok", "Synced just now");
    } else {
      setSyncState("error", "Sync failed");
    }
  } else {
    setSyncState("ok", "Up to date");
  }
}

// ---- Auth gate UI ----------------------------------------------------------

function setAuthMode(mode: AuthMode): void {
  authMode = mode;
  usernameAvailable = null;
  const signInBtn = document.getElementById("authSignInModeBtn");
  const signUpBtn = document.getElementById("authSignUpModeBtn");
  const submit = document.getElementById("authSubmitBtn") as HTMLButtonElement | null;
  const emailLabel = document.getElementById("authEmailLabel");
  const email = document.getElementById("authEmailInput") as HTMLInputElement | null;

  signInBtn?.setAttribute("aria-selected", mode === "sign-in" ? "true" : "false");
  signUpBtn?.setAttribute("aria-selected", mode === "sign-up" ? "true" : "false");
  signInBtn?.classList.toggle("text-fg-default", mode === "sign-in");
  signInBtn?.classList.toggle("text-fg-muted", mode !== "sign-in");
  signInBtn?.classList.toggle("border-accent", mode === "sign-in");
  signInBtn?.classList.toggle("border-transparent", mode !== "sign-in");
  signUpBtn?.classList.toggle("text-fg-default", mode === "sign-up");
  signUpBtn?.classList.toggle("text-fg-muted", mode !== "sign-up");
  signUpBtn?.classList.toggle("border-accent", mode === "sign-up");
  signUpBtn?.classList.toggle("border-transparent", mode !== "sign-up");

  const isSignUp = mode === "sign-up";
  emailLabel?.classList.toggle("hidden", !isSignUp);
  email?.classList.toggle("hidden", !isSignUp);
  if (submit) submit.textContent = isSignUp ? "Create account" : "Sign in";

  const usernameStatus = document.getElementById("usernameStatus");
  if (usernameStatus) usernameStatus.textContent = "";
}

function showAuthGate(): void {
  document.getElementById("authGate")?.classList.remove("hidden");
  document.getElementById("trackerApp")?.classList.add("hidden");
}

function hideAuthGate(): void {
  document.getElementById("authGate")?.classList.add("hidden");
  document.getElementById("trackerApp")?.classList.remove("hidden");
  const nameEl = document.getElementById("accountName");
  if (nameEl) nameEl.textContent = accountName;
  document.getElementById("signOutBtn")?.classList.remove("hidden");
}

function bindAuthEvents(): void {
  document.getElementById("authSignInModeBtn")?.addEventListener("click", () => setAuthMode("sign-in"));
  document.getElementById("authSignUpModeBtn")?.addEventListener("click", () => setAuthMode("sign-up"));

  document.getElementById("signOutBtn")?.addEventListener("click", async () => {
    const client = getSupabaseClient();
    await client?.auth.signOut();
    session = null;
    accountName = "";
    showAuthGate();
    setSyncState("off");
    const nameEl = document.getElementById("accountName");
    if (nameEl) nameEl.textContent = "";
    document.getElementById("signOutBtn")?.classList.add("hidden");
  });

  const usernameInput = document.getElementById("authUsernameInput") as HTMLInputElement | null;
  usernameInput?.addEventListener("input", () => {
    if (authMode !== "sign-up") return;
    const val = usernameInput.value;
    const statusEl = document.getElementById("usernameStatus");
    if (!statusEl) return;
    if (!isValidUsername(val)) {
      statusEl.textContent = val.length < 3 ? "" : "Username must be 3-24 alphanumeric characters";
      usernameAvailable = null;
      return;
    }
    statusEl.textContent = "Checking…";
    if (usernameTimer) clearTimeout(usernameTimer);
    usernameTimer = setTimeout(async () => {
      const result = await checkUsername(val);
      usernameAvailable = result?.available ?? null;
      statusEl.textContent =
        usernameAvailable === true
          ? "✓ Available"
          : usernameAvailable === false
            ? "✗ Taken"
            : "Error checking";
    }, 450);
  });

  document.getElementById("authForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username =
      (document.getElementById("authUsernameInput") as HTMLInputElement | null)?.value ?? "";
    const password =
      (document.getElementById("authPasswordInput") as HTMLInputElement | null)?.value ?? "";
    const email =
      (document.getElementById("authEmailInput") as HTMLInputElement | null)?.value ?? "";
    const submit = document.getElementById("authSubmitBtn") as HTMLButtonElement | null;
    if (submit) submit.disabled = true;

    if (authMode === "sign-in") {
      const result = await signIn(username, password);
      if (result?.session) {
        session = result.session;
        accountName = result.username ?? username;
        hideAuthGate();
        refresh();
        await loadOrMergeCloud();
      } else {
        showToast(result?.error ?? "Sign in failed", { type: "error" });
      }
    } else {
      const result = await signUp(username, email, password);
      if (result?.session) {
        session = result.session;
        accountName = result.username ?? username;
        hideAuthGate();
        refresh();
        await loadOrMergeCloud();
      } else if (result?.needsConfirmation) {
        showToast("Account created. Check your email to confirm.", { type: "info" });
        setAuthMode("sign-in");
      } else {
        showToast(result?.error ?? "Sign up failed", { type: "error" });
      }
    }
    if (submit) submit.disabled = false;
  });
}

// ---- Checkbox + filter events ----------------------------------------------

function bindTrackerEvents(): void {
  document.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.dataset["bscpCheckbox"]) return;
    const key = target.dataset["key"];
    if (!key) return;
    progress[key] = target.checked;
    saveProgressLocal(progress);
    localUpdatedAt = touchLocalTimestamp();
    queueCloudSave();
    refreshOverallProgress();
    refreshTopicProgress();
  });

  document.querySelectorAll<HTMLElement>("[data-bscp-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = btn.dataset["bscpFilter"] as "all" | LabLevel;
      applyFilter(level);
    });
  });
}

// ---- Supabase init ---------------------------------------------------------

async function initSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    setSyncState("off");
    hideAuthGate();
    return;
  }
  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { session: s },
  } = await client.auth.getSession();
  if (s) {
    session = s;
    const { data: profile } = await client
      .from("user_profiles")
      .select("username")
      .eq("user_id", s.user.id)
      .maybeSingle();
    accountName =
      (profile as { username?: string } | null)?.username ?? s.user.email ?? "";
    hideAuthGate();
    refresh();
    await loadOrMergeCloud();
  } else {
    showAuthGate();
  }

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      session = null;
      showAuthGate();
    }
  });
}

// ---- Boot ------------------------------------------------------------------

initTheme();
initDrawer();
setAuthMode("sign-in");
initTopicAccordions();
initSidebarNav();
bindAuthEvents();
bindTrackerEvents();
refresh();
initSupabase();
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: No errors in `bscp_tracker.ts`. If `showToast` signature differs from what is used above, open `src/lib/tracker/toast.ts` and adjust the call accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bscp_tracker.ts
git commit -m "feat: add BSCP tracker boot script with cloud sync and level filtering"
```

---

## Task 10: Create bscp.astro page

**Files:**
- Create: `src/pages/bscp.astro`

- [ ] **Step 1: Create src/pages/bscp.astro**

```astro
---
import AppShell from "@/components/AppShell.astro";
import AuthGate from "@/components/AuthGate.astro";
import BscpSidebar from "@/components/bscp/BscpSidebar.astro";
import BscpMainPane from "@/components/bscp/BscpMainPane.astro";
import Toast from "@/components/Toast.astro";
import { BSCP_TOPICS } from "@/data/bscp";
---

<AppShell title="BSCP Web Security Academy Tracker">
  <AuthGate />
  <div id="trackerApp" class="app-grid">
    <BscpSidebar topics={BSCP_TOPICS} />
    <BscpMainPane topics={BSCP_TOPICS} />
  </div>
  <Toast />
  <script>
    import "@/lib/bscp_tracker";
  </script>
</AppShell>
```

- [ ] **Step 2: Full build**

Run: `npm run build 2>&1 | tail -20`
Expected: Exit 0. Then confirm:

```bash
ls dist/index.html dist/pen200/index.html dist/bscp/index.html
```

All three files must exist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/bscp.astro
git commit -m "feat: add /bscp route — BSCP tracker page"
```

---

## Task 11: Final verification

- [ ] **Step 1: Preview locally**

```bash
npm run preview
```

Open `http://localhost:4321/pen200-tracker/` in the browser.

- [ ] **Step 2: Dashboard smoke test**
  - Dashboard renders two course cards (PEN-200 🎯 and BSCP 🛡️)
  - "Continue →" on PEN-200 card → navigates to `/pen200-tracker/pen200`
  - "Continue →" on BSCP card → navigates to `/pen200-tracker/bscp`
  - If signed in: greeting shows username, progress bars fill from Supabase data
  - If not signed in: cards show `—` for percentage, no greeting

- [ ] **Step 3: PEN-200 tracker smoke test**
  - Auth gate appears if not signed in
  - Sign in works
  - All modules load, checkboxes work
  - Existing progress is intact
  - Cloud sync indicator shows "Synced"

- [ ] **Step 4: BSCP tracker smoke test**
  - Auth gate appears if not signed in
  - Sign in works (same credentials as PEN-200)
  - 31 topics visible in sidebar
  - Clicking a topic in sidebar scrolls to it and expands it
  - Level filter chips (All / Apprentice / Practitioner / Expert) show/hide lab rows correctly
  - Checking a lab updates the topic progress bar and the overall bar
  - Cloud sync stores progress under `tracker_name = 'bscp'`

- [ ] **Step 5: Verify Supabase data isolation**

In Supabase SQL Editor:
```sql
-- Confirm existing PEN-200 rows are unchanged
SELECT tracker_name, count(*) FROM tracker_progress GROUP BY tracker_name;
-- Expected: row with tracker_name='pen200' and your existing count

-- After checking a BSCP lab, confirm BSCP row was created
SELECT tracker_name, jsonb_object_keys(progress) AS lab_id
FROM tracker_progress
WHERE tracker_name = 'bscp'
LIMIT 5;
```

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: post-verification tweaks from smoke testing"
```

---

## Manual Steps After Implementation

1. **No Supabase migration needed** — The `tracker_name` column already exists with `DEFAULT 'pen200'`. All existing PEN-200 rows remain unchanged. BSCP progress will appear as new rows with `tracker_name = 'bscp'`.

2. **Deploy to GitHub Pages** — Push to `main` and let GitHub Actions build. The existing deployment pipeline is unchanged.

3. **Environment variables** — `.env.local` already has the correct values. Confirm they are also set in GitHub Pages / any CI environment.

4. **Optional polish** — Add a "← Dashboard" link to `SidebarFooter.astro` or `SidebarBrand.astro` to allow navigating back to the course picker without using the browser back button.
