# Tracker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PEN-200 tracker's current presentation with a calm, sidebar + focused-detail single-page app that ships light + dark themes, native View Transitions, and a coherent design-token system — preserving all existing storage, sync, and auth behavior.

**Architecture:** Astro static site with prerendered HTML for every view (home + each module + auth gate). View toggling is client-side via `data-view` attributes wrapped in `document.startViewTransition()`. Hash routing reflects the current view. Theming via CSS variables and a pre-paint inline script reading `localStorage.theme`. All existing logic in `lib/storage.ts`, `lib/progress.ts`, `lib/supabase.ts` is unchanged; `lib/tracker.ts` is split into smaller modules under `lib/tracker/`.

**Tech Stack:** Astro 6.1, Tailwind via PostCSS, TypeScript, Supabase (existing), native browser APIs (View Transitions, CSS Variables, `prefers-color-scheme`, `prefers-reduced-motion`).

**Spec:** [docs/superpowers/specs/2026-04-30-tracker-redesign-design.md](../specs/2026-04-30-tracker-redesign-design.md)

**Notes for the executing engineer:**
- This project is not a git repo. The "Checkpoint" steps are stand-ins for commits — pause, run the dev server (or build+preview), and visually verify before continuing.
- No test runner is configured. Verification is `npm run dev` (or `build`+`preview`) followed by visual + behavioral inspection. Where logic is non-trivial (view state, hash routing, theme persistence, undo), tasks include a tiny manual smoke check.
- The course data has **19 modules** (codes: IG, VS, ITWAA, CWAA, SQLI, CSA, AVE, PA, FE, LOCPE, WPE, LPE, PRAT, PRAT2, TMF, ADIE, AADA, ADLM, ATP) over an **18-day** study plan (3 weeks). The sidebar is going to be tall — that is fine; it scrolls.
- The Astro alias `@/` resolves to `src/` (already configured in `tsconfig.json` and Astro's resolve).

---

## File Structure (target end-state)

```
src/
  pages/
    index.astro                       # rewritten: AuthGate + AppShell composition
  components/
    AppShell.astro                    # rewritten: 2-pane grid, mounts theme attribute
    AuthGate.astro                    # new: extracted auth view, redesigned
    Sidebar.astro                     # new
    SidebarBrand.astro                # new
    SidebarNav.astro                  # new
    SidebarNavItem.astro              # new (variants: home, module)
    SidebarFooter.astro               # new
    ThemeToggle.astro                 # new
    SyncIndicator.astro               # new
    MobileDrawerTrigger.astro         # new
    MainPane.astro                    # new
    PageHeader.astro                  # new
    HomeView.astro                    # new
    TodayHero.astro                   # rewritten (replaces TodayCard)
    OverviewStats.astro               # rewritten (replaces StatsCards)
    ScheduleStrip.astro               # new (replaces SchedulePanel)
    ModuleView.astro                  # new
    ChapterSection.astro              # rewritten (replaces ChapterRow)
    LessonRow.astro                   # new (replaces VideoChip in lists)
    ProgressBar.astro                 # restyled, size variants
    Toast.astro                       # new (replaces inline div)
  lib/
    tracker.ts                        # refactored entry: imports from tracker/
    tracker/
      view.ts                         # new: view state + hash routing + transitions
      theme.ts                        # new: theme toggle + persistence
      drawer.ts                       # new: mobile drawer toggle
      undo.ts                         # new: one-step snapshot for reset
      modules.ts                      # new: helpers for module slug↔code lookups
      sidebar.ts                      # new: render sidebar progress bars / percents
      home.ts                         # new: render Today hero + overview + schedule strip
      module.ts                       # new: render module view (chapters, lessons, progress)
      auth.ts                         # new: extracted auth handling (was inline in tracker.ts)
      sync.ts                         # new: extracted sync handling
      toast.ts                        # new: toast helper with variants + undo support
    storage.ts                        # UNCHANGED
    progress.ts                       # UNCHANGED + 1 new helper added (slug helper)
    supabase.ts                       # UNCHANGED
  data/
    course.ts                         # UNCHANGED
    studyPlan.ts                      # UNCHANGED
  styles/
    global.css                        # rewritten (slim) — imports tokens.css
    tokens.css                        # new: all CSS variables
tailwind.config.mjs                   # rewritten: tokens-as-utilities
```

**Deletions (Task 28):** `Header.astro`, `ModuleCard.astro`, `SchedulePanel.astro`, `SyncPanel.astro`, `VideoChip.astro`, `TodayCard.astro`, `StatsCards.astro`, `ChapterRow.astro`.

---

## Phase 0 — Pre-flight

### Task 0: Confirm dev server runs

**Files:** none (verification only)

- [ ] **Step 1:** Run `npm install` if `node_modules/` looks incomplete.

  Run: `npm install --no-audit --no-fund`
  Expected: completes without error.

- [ ] **Step 2:** Start the dev server.

  Run: `npm run dev`
  Expected: Astro logs a local URL (e.g., `http://localhost:4321`).

- [ ] **Step 3:** Open the URL in a browser. Confirm the current site loads (auth gate visible if Supabase is configured, tracker visible otherwise).

- [ ] **Step 4:** Stop the dev server (Ctrl-C). The dev server will be re-run after each future task to verify changes.

- [ ] **Checkpoint:** Baseline established. The current site works.

---

## Phase 1 — Tokens & theming infrastructure

### Task 1: Create `src/styles/tokens.css`

**Files:**
- Create: `src/styles/tokens.css`

- [ ] **Step 1:** Create the file with the full token system.

  Write to `src/styles/tokens.css`:

  ```css
  /* Design tokens. The single source of truth for color, type, spacing, radius, shadow.
     Do not place raw hex values anywhere else in the codebase. */

  :root,
  [data-theme="light"] {
    color-scheme: light;

    --bg-canvas:      #faf8f3;
    --bg-surface:     #ffffff;
    --bg-surface-2:   #f3efe7;
    --bg-overlay:     #ffffff;

    --fg-default:     #1c1d1a;
    --fg-muted:       #5b5d57;
    --fg-subtle:      #8a8c84;
    --fg-on-accent:   #ffffff;

    --border-default: #e7e2d6;
    --border-strong:  #d3cdbc;
    --border-focus:   #5b8c6b;

    --accent:         #5b8c6b;
    --accent-hover:   #4a755a;
    --accent-soft:    #e8efe8;

    --success:        #2f7d57;
    --warning:        #b07d2a;
    --danger:         #b54e3a;

    --shadow-soft:  0 1px 2px rgba(20,20,20,.04), 0 4px 12px rgba(20,20,20,.04);
    --shadow-card:  0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.06);
    --shadow-pop:   0 8px 24px rgba(20,20,20,.12), 0 24px 60px rgba(20,20,20,.18);
  }

  [data-theme="dark"] {
    color-scheme: dark;

    --bg-canvas:      #15161a;
    --bg-surface:     #1d1e22;
    --bg-surface-2:   #26272c;
    --bg-overlay:     #23252a;

    --fg-default:     #ecebe6;
    --fg-muted:       #a8a79f;
    --fg-subtle:      #6c6b65;
    --fg-on-accent:   #15161a;

    --border-default: #2c2d32;
    --border-strong:  #3a3b41;
    --border-focus:   #8db89b;

    --accent:         #8db89b;
    --accent-hover:   #a3c8b0;
    --accent-soft:    #2a3530;

    --success:        #7fc196;
    --warning:        #d6a55a;
    --danger:         #d97a64;

    --shadow-soft:  0 1px 2px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.30);
    --shadow-card:  0 2px 4px rgba(0,0,0,.30), 0 12px 32px rgba(0,0,0,.40);
    --shadow-pop:   0 8px 24px rgba(0,0,0,.50), 0 24px 60px rgba(0,0,0,.60);
  }

  :root {
    --font-sans:    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    --font-serif:   'Instrument Serif', Georgia, 'Times New Roman', serif;
    --font-mono:    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

    --text-display:  clamp(2rem, 4vw, 2.75rem);
    --text-h1:       1.625rem;
    --text-h2:       1.25rem;
    --text-h3:       1.0625rem;
    --text-body:     0.9375rem;
    --text-small:    0.8125rem;
    --text-tiny:     0.75rem;

    --radius-sm:  8px;
    --radius-md:  12px;
    --radius-lg:  16px;
    --radius-xl:  20px;

    --sidebar-w:  280px;
  }

  @media (max-width: 1023px) {
    :root { --sidebar-w: 240px; }
  }
  ```

- [ ] **Step 2:** Save and continue. (No build verification yet — this file isn't imported anywhere yet.)

- [ ] **Checkpoint:** `tokens.css` exists.

---

### Task 2: Wire tokens into Tailwind

**Files:**
- Modify: `tailwind.config.mjs`

- [ ] **Step 1:** Replace the entire file contents.

  Write to `tailwind.config.mjs`:

  ```js
  /** @type {import('tailwindcss').Config} */
  export default {
    content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
    theme: {
      extend: {
        fontFamily: {
          sans: ["var(--font-sans)"],
          serif: ["var(--font-serif)"],
          mono: ["var(--font-mono)"],
        },
        colors: {
          canvas:      "var(--bg-canvas)",
          surface:     "var(--bg-surface)",
          "surface-2": "var(--bg-surface-2)",
          overlay:     "var(--bg-overlay)",
          "fg-default": "var(--fg-default)",
          "fg-muted":   "var(--fg-muted)",
          "fg-subtle":  "var(--fg-subtle)",
          "on-accent":  "var(--fg-on-accent)",
          accent: {
            DEFAULT: "var(--accent)",
            hover:   "var(--accent-hover)",
            soft:    "var(--accent-soft)",
          },
          success: "var(--success)",
          warning: "var(--warning)",
          danger:  "var(--danger)",
        },
        borderColor: {
          DEFAULT: "var(--border-default)",
          default: "var(--border-default)",
          strong:  "var(--border-strong)",
          focus:   "var(--border-focus)",
        },
        ringColor: {
          focus: "var(--border-focus)",
        },
        boxShadow: {
          soft: "var(--shadow-soft)",
          card: "var(--shadow-card)",
          pop:  "var(--shadow-pop)",
        },
        borderRadius: {
          sm: "var(--radius-sm)",
          md: "var(--radius-md)",
          lg: "var(--radius-lg)",
          xl: "var(--radius-xl)",
        },
        fontSize: {
          display: ["var(--text-display)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
          h1:      ["var(--text-h1)",      { lineHeight: "1.2" }],
          h2:      ["var(--text-h2)",      { lineHeight: "1.3" }],
          h3:      ["var(--text-h3)",      { lineHeight: "1.4" }],
          body:    ["var(--text-body)",    { lineHeight: "1.55" }],
          small:   ["var(--text-small)",   { lineHeight: "1.5" }],
          tiny:    ["var(--text-tiny)",    { lineHeight: "1.4" }],
        },
        spacing: {
          'sidebar': "var(--sidebar-w)",
        },
        maxWidth: {
          content: "880px",
        },
      },
    },
  };
  ```

- [ ] **Step 2:** Verify Tailwind picks up the change later when global.css imports tokens (Task 3).

- [ ] **Checkpoint:** `tailwind.config.mjs` is wired to tokens.

---

### Task 3: Rewrite `src/styles/global.css`

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1:** Replace the entire file contents.

  Write to `src/styles/global.css`:

  ```css
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap");
  @import "./tokens.css";

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    *, *::before, *::after { box-sizing: border-box; }

    html {
      background: var(--bg-canvas);
      color: var(--fg-default);
      font-family: var(--font-sans);
      font-size: var(--text-body);
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }

    body {
      min-height: 100vh;
      margin: 0;
      background: var(--bg-canvas);
      color: var(--fg-default);
    }

    button, input, textarea, select {
      font: inherit;
      color: inherit;
    }

    h1, h2, h3, h4, h5, h6 { margin: 0; }

    /* Skip link */
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 0;
      padding: 0.75rem 1rem;
      background: var(--bg-surface);
      color: var(--fg-default);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      z-index: 100;
    }
    .skip-link:focus { left: 1rem; top: 1rem; }

    /* Focus visibility — only on keyboard */
    :focus { outline: none; }
    :focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    /* Body scroll-lock when mobile drawer is open */
    html[data-drawer="open"] body { overflow: hidden; }
  }

  @layer components {
    /* Buttons — semantic, token-driven */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 2.5rem;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--fg-default);
      font-weight: 600;
      font-size: var(--text-small);
      transition: background-color 100ms ease-out, border-color 100ms ease-out, color 100ms ease-out;
    }
    .btn:hover { background: var(--bg-surface-2); border-color: var(--border-strong); }

    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--fg-on-accent);
    }
    .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn-primary:active { transform: translateY(1px); transition-duration: 60ms; }

    .btn-ghost {
      background: transparent;
      border-color: transparent;
      color: var(--fg-muted);
    }
    .btn-ghost:hover { background: var(--bg-surface-2); color: var(--fg-default); }

    .btn-danger { color: var(--danger); }
    .btn-danger:hover { background: color-mix(in oklab, var(--danger) 10%, transparent); }
  }

  @layer utilities {
    .font-display { font-family: var(--font-serif); font-weight: 400; letter-spacing: -0.01em; }
    .text-mono-feat { font-feature-settings: "tnum" 1, "ss01" 1; }
  }

  /* Reduced motion — clamp everything that animates */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* View Transitions — used when supported */
  ::view-transition-old(page-title),
  ::view-transition-new(page-title) {
    animation-duration: 180ms;
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Global styles use tokens. The tracker page won't render correctly yet (existing components reference Tailwind classes like `border-slate-200` that no longer match anything semantically), but it should still build. We replace the components in later tasks.

---

### Task 4: Add the pre-paint theme script

**Files:**
- Modify: `src/components/AppShell.astro` (small surgical edit before the full rewrite in Phase 2)

- [ ] **Step 1:** Open `src/components/AppShell.astro` and replace its contents with this transitional version. (We'll rewrite it more substantially in Phase 2; this just establishes the theme attribute now so we can verify token switching works.)

  ```astro
  ---
  import "@/styles/global.css";

  const title = "PEN-200 OSCP Progress Tracker";
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  ---

  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="generator" content={Astro.generator} />
      <link rel="icon" type="image/svg+xml" href={`${base}favicon.svg`} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <title>{title}</title>
      <script is:inline>
        (() => {
          try {
            const stored = localStorage.getItem("theme");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
            document.documentElement.dataset.theme = theme;
          } catch {
            document.documentElement.dataset.theme = "light";
          }
        })();
      </script>
    </head>
    <body>
      <a class="skip-link" href="#main">Skip to main content</a>
      <slot />
    </body>
  </html>
  ```

- [ ] **Step 2:** Run dev server.

  Run: `npm run dev`
  Expected: site builds. Open it in browser.

- [ ] **Step 3:** In the browser DevTools console:
  - Run: `document.documentElement.dataset.theme = 'dark'` → page background turns charcoal-ish (the existing components mostly hardcode old colors so the body bg flips but content stays light — that's expected).
  - Run: `document.documentElement.dataset.theme = 'light'` → flips back.
  - Run: `localStorage.setItem('theme', 'dark'); location.reload()` → page reloads with no flash, html starts with `data-theme="dark"`.
  - Run: `localStorage.removeItem('theme')` to reset.

- [ ] **Step 4:** Stop dev server.

- [ ] **Checkpoint:** Theme attribute applies pre-paint, no flash on reload.

---

## Phase 2 — Layout shell + view state

### Task 5: Create `lib/tracker/view.ts` (view state, hash routing, transitions)

**Files:**
- Create: `src/lib/tracker/view.ts`

- [ ] **Step 1:** Write the file.

  Write to `src/lib/tracker/view.ts`:

  ```ts
  // View state management for the single-page tracker.
  // Source of truth for which view is visible and reflects to the URL hash.

  export type View =
    | { kind: "home" }
    | { kind: "module"; slug: string };

  type Listener = (view: View) => void;

  let current: View = { kind: "home" };
  const listeners = new Set<Listener>();

  function reducedMotion(): boolean {
    return typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function startTransition(fn: () => void): void {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!reducedMotion() && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(fn);
    } else {
      fn();
    }
  }

  export function getView(): View {
    return current;
  }

  export function onViewChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function emit(): void {
    for (const fn of listeners) fn(current);
  }

  export function setView(next: View, options: { replace?: boolean; skipHash?: boolean } = {}): void {
    const sameKind = current.kind === next.kind;
    const sameSlug = current.kind === "module" && next.kind === "module" && current.slug === next.slug;
    if (sameKind && (current.kind === "home" || sameSlug)) return;

    const apply = () => {
      current = next;
      applyToDom(current);
      emit();
    };

    if (!options.skipHash) {
      const hash = next.kind === "home" ? "#/home" : `#/m/${next.slug}`;
      if (options.replace) history.replaceState(null, "", hash);
      else history.pushState(null, "", hash);
    }

    startTransition(apply);
  }

  function applyToDom(view: View): void {
    const main = document.getElementById("mainPane");
    if (!main) return;
    const target = view.kind === "home" ? "home" : `module-${view.slug}`;
    main.dataset.view = target;
    // Toggle hidden on each view block
    main.querySelectorAll<HTMLElement>("[data-view-block]").forEach((el) => {
      el.hidden = el.dataset.viewBlock !== target;
    });
    // Sidebar active state
    document.querySelectorAll<HTMLElement>("[data-nav-item]").forEach((el) => {
      const isActive = el.dataset.navItem === target;
      el.toggleAttribute("data-active", isActive);
      if (isActive) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    // Scroll the main pane to top on view change
    main.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  }

  function viewFromHash(): View {
    const h = location.hash;
    if (h.startsWith("#/m/")) {
      const slug = h.slice(4);
      if (slug) return { kind: "module", slug };
    }
    return { kind: "home" };
  }

  export function initView(validSlugs: Set<string>): void {
    let initial = viewFromHash();
    if (initial.kind === "module" && !validSlugs.has(initial.slug)) {
      initial = { kind: "home" };
    }
    current = initial;
    applyToDom(current);
    emit();

    window.addEventListener("hashchange", () => {
      let next = viewFromHash();
      if (next.kind === "module" && !validSlugs.has(next.slug)) {
        next = { kind: "home" };
      }
      // Only update if different. Skip hash mutation to avoid loop.
      const same = (next.kind === "home" && current.kind === "home")
        || (next.kind === "module" && current.kind === "module" && next.slug === current.slug);
      if (!same) setView(next, { skipHash: true });
    });

    window.addEventListener("popstate", () => {
      let next = viewFromHash();
      if (next.kind === "module" && !validSlugs.has(next.slug)) next = { kind: "home" };
      setView(next, { skipHash: true });
    });
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** `view.ts` is in place but not yet called from the entry. We'll wire it up in Phase 9.

---

### Task 6: Create `lib/tracker/modules.ts` (slug helpers)

**Files:**
- Create: `src/lib/tracker/modules.ts`

- [ ] **Step 1:** Write the file.

  Write to `src/lib/tracker/modules.ts`:

  ```ts
  import { COURSE, type CourseModule } from "@/data/course";

  export function moduleSlug(module: CourseModule): string {
    return module.code.toLowerCase();
  }

  export function moduleBySlug(slug: string): CourseModule | undefined {
    const upper = slug.toUpperCase();
    return COURSE.find((m) => m.code === upper);
  }

  export function allValidSlugs(): Set<string> {
    return new Set(COURSE.map(moduleSlug));
  }
  ```

  Slug = lowercased module code (e.g. `IG` → `ig`). Stable, short, and readable in the URL hash.

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Module slug helpers ready.

---

### Task 7: Create `lib/tracker/theme.ts`

**Files:**
- Create: `src/lib/tracker/theme.ts`

- [ ] **Step 1:** Write the file.

  Write to `src/lib/tracker/theme.ts`:

  ```ts
  export type Theme = "light" | "dark";

  function reducedMotion(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  export function getTheme(): Theme {
    const t = document.documentElement.dataset.theme;
    return t === "dark" ? "dark" : "light";
  }

  export function setTheme(theme: Theme): void {
    const apply = () => {
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem("theme", theme); } catch { /* ignore quota */ }
      document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((el) => {
        el.dataset.themeActive = theme;
      });
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!reducedMotion() && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }

  export function initTheme(): void {
    // The pre-paint inline script in <head> already set data-theme.
    // We just sync the toggle UI to the current value.
    const theme = getTheme();
    document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((el) => {
      el.dataset.themeActive = theme;
    });
    document.querySelectorAll<HTMLElement>("[data-theme-set]").forEach((el) => {
      el.addEventListener("click", () => {
        const next = el.dataset.themeSet === "dark" ? "dark" : "light";
        setTheme(next);
      });
    });
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Theme module ready.

---

### Task 8: Create `lib/tracker/drawer.ts`

**Files:**
- Create: `src/lib/tracker/drawer.ts`

- [ ] **Step 1:** Write the file.

  Write to `src/lib/tracker/drawer.ts`:

  ```ts
  // Mobile sidebar drawer toggle. Below 768px, the sidebar is a slide-over.
  // Visual state is driven by [data-drawer] on <html>.

  function setDrawer(open: boolean): void {
    if (open) document.documentElement.dataset.drawer = "open";
    else delete document.documentElement.dataset.drawer;
    document.querySelectorAll<HTMLElement>("[data-drawer-trigger]").forEach((el) => {
      el.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  export function initDrawer(): void {
    const triggers = document.querySelectorAll<HTMLElement>("[data-drawer-trigger]");
    const backdrop = document.getElementById("drawerBackdrop");

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const isOpen = document.documentElement.dataset.drawer === "open";
        setDrawer(!isOpen);
      });
    });

    backdrop?.addEventListener("click", () => setDrawer(false));

    // Close drawer when picking any nav item
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const navItem = target.closest("[data-nav-item]");
      if (navItem && document.documentElement.dataset.drawer === "open") {
        setDrawer(false);
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.documentElement.dataset.drawer === "open") {
        setDrawer(false);
      }
    });

    // Swipe-to-close: simple horizontal threshold on touch
    let touchStartX = 0;
    let touching = false;
    const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
    sidebar?.addEventListener("touchstart", (event) => {
      const t = event.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touching = true;
    }, { passive: true });
    sidebar?.addEventListener("touchend", (event) => {
      if (!touching) return;
      touching = false;
      const t = event.changedTouches[0];
      if (!t) return;
      if (touchStartX - t.clientX > 60) setDrawer(false);
    }, { passive: true });
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Drawer module ready.

---

### Task 9: Rewrite `AppShell.astro` to the 2-pane grid

**Files:**
- Modify: `src/components/AppShell.astro`

- [ ] **Step 1:** Replace the entire file.

  Write to `src/components/AppShell.astro`:

  ```astro
  ---
  import "@/styles/global.css";

  const title = "PEN-200 OSCP Progress Tracker";
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  ---

  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="generator" content={Astro.generator} />
      <link rel="icon" type="image/svg+xml" href={`${base}favicon.svg`} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <title>{title}</title>
      <script is:inline>
        (() => {
          try {
            const stored = localStorage.getItem("theme");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
            document.documentElement.dataset.theme = theme;
          } catch {
            document.documentElement.dataset.theme = "light";
          }
        })();
      </script>
    </head>
    <body>
      <a class="skip-link" href="#main">Skip to main content</a>
      <slot />
    </body>
  </html>

  <style is:global>
    /* Layout grid for the tracker app. AuthGate uses a different (full-viewport) layout. */
    .app-grid {
      display: grid;
      grid-template-columns: var(--sidebar-w) 1fr;
      min-height: 100vh;
    }

    @media (max-width: 767px) {
      .app-grid {
        grid-template-columns: 1fr;
      }
      [data-sidebar] {
        position: fixed;
        inset: 0 auto 0 0;
        width: 280px;
        max-width: 85vw;
        z-index: 50;
        transform: translateX(-100%);
        transition: transform 240ms cubic-bezier(0.2, 0, 0, 1);
        box-shadow: var(--shadow-pop);
      }
      html[data-drawer="open"] [data-sidebar] { transform: translateX(0); }

      #drawerBackdrop {
        position: fixed;
        inset: 0;
        background: color-mix(in oklab, var(--bg-canvas) 60%, transparent);
        backdrop-filter: blur(4px);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity 200ms ease-out;
      }
      html[data-drawer="open"] #drawerBackdrop {
        opacity: 1;
        pointer-events: auto;
      }
    }

    @media (min-width: 768px) {
      [data-sidebar] {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
      }
      #drawerBackdrop { display: none; }
    }
  </style>
  ```

- [ ] **Step 2:** Run dev server.

  Run: `npm run dev`
  Expected: builds; existing inline auth gate + tracker page still loads (the layout in `index.astro` hasn't been touched yet, so the page is still the legacy markup wrapped in the new shell).

- [ ] **Step 3:** Verify the skip link.
  - In browser, press Tab. The "Skip to main content" link should appear at the top-left.

- [ ] **Step 4:** Stop dev server.

- [ ] **Checkpoint:** AppShell is the new grid frame, ready for sidebar + main pane content.

---

## Phase 3 — Sidebar components

### Task 10: Create `SidebarBrand.astro`

**Files:**
- Create: `src/components/SidebarBrand.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
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
        <div class="font-display text-h2 text-fg-default">PEN-200</div>
        <div class="text-tiny text-fg-muted">Progress Tracker</div>
      </div>
    </div>
  </header>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Brand component done.

---

### Task 11: Create `SidebarNavItem.astro`

**Files:**
- Create: `src/components/SidebarNavItem.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  type Props = {
    target: string;        // e.g., "home" or "module-ig"
    href: string;          // e.g., "#/home" or "#/m/ig"
    label: string;
    sublabel?: string;     // optional small text under the label (e.g., module code)
    showProgress?: boolean;
    progressKey?: string;  // module code, used as data attribute for client updates
  };

  const { target, href, label, sublabel, showProgress = false, progressKey } = Astro.props;
  ---

  <a
    href={href}
    data-nav-item={target}
    data-progress-key={progressKey}
    class="group relative grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-small text-fg-muted hover:bg-surface-2 hover:text-fg-default transition-colors duration-[80ms]"
  >
    <span aria-hidden="true" class="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 origin-left scale-x-0 bg-accent transition-transform duration-[120ms] group-data-[active]:scale-x-100"></span>
    <span class="min-w-0 truncate font-semibold">
      {label}
      {sublabel && <span class="ml-2 font-mono text-tiny text-fg-subtle">{sublabel}</span>}
    </span>
    {showProgress && (
      <span class="font-mono text-tiny text-fg-subtle group-data-[active]:text-fg-muted" data-nav-pct>0%</span>
    )}
    {showProgress && (
      <span class="col-span-2 -mt-1 h-[3px] w-full overflow-hidden rounded-full bg-surface-2">
        <span class="block h-full bg-accent transition-[width] duration-[240ms]" style="width:0%" data-nav-bar></span>
      </span>
    )}
  </a>

  <style>
    a[data-active] {
      background: var(--accent-soft);
      color: var(--fg-default);
    }
  </style>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Nav item component ready.

---

### Task 12: Create `SidebarNav.astro`

**Files:**
- Create: `src/components/SidebarNav.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import { COURSE } from "@/data/course";
  import SidebarNavItem from "@/components/SidebarNavItem.astro";

  const modules = COURSE.map((m) => ({
    target: `module-${m.code.toLowerCase()}`,
    href: `#/m/${m.code.toLowerCase()}`,
    label: m.name,
    sublabel: m.code,
    code: m.code,
  }));
  ---

  <nav aria-label="Tracker views" class="flex-1 overflow-y-auto py-3">
    <SidebarNavItem target="home" href="#/home" label="Home" />

    <div class="px-4 pt-5 pb-1.5 text-tiny font-semibold uppercase tracking-wider text-fg-subtle">
      Modules
    </div>

    <ul class="m-0 list-none p-0">
      {modules.map((m) => (
        <li>
          <SidebarNavItem
            target={m.target}
            href={m.href}
            label={m.label}
            sublabel={m.sublabel}
            showProgress
            progressKey={m.code}
          />
        </li>
      ))}
    </ul>
  </nav>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Sidebar nav lists all 19 modules with progress slots.

---

### Task 13: Create `ThemeToggle.astro`

**Files:**
- Create: `src/components/ThemeToggle.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <div class="grid grid-cols-2 gap-1 rounded-md border border-default bg-surface-2 p-1" data-theme-toggle role="group" aria-label="Theme">
    <button
      type="button"
      data-theme-set="light"
      class="inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-tiny font-semibold text-fg-muted hover:text-fg-default transition-colors"
      aria-label="Use light theme"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      Light
    </button>
    <button
      type="button"
      data-theme-set="dark"
      class="inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-tiny font-semibold text-fg-muted hover:text-fg-default transition-colors"
      aria-label="Use dark theme"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
      </svg>
      Dark
    </button>
  </div>

  <style>
    [data-theme-toggle][data-theme-active="light"] [data-theme-set="light"],
    [data-theme-toggle][data-theme-active="dark"] [data-theme-set="dark"] {
      background: var(--bg-surface);
      color: var(--fg-default);
      box-shadow: var(--shadow-soft);
    }
  </style>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Theme toggle ready.

---

### Task 14: Create `SyncIndicator.astro`

**Files:**
- Create: `src/components/SyncIndicator.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <div
    id="syncStatus"
    data-sync-state="off"
    class="flex items-center gap-2 px-1 text-tiny text-fg-muted"
    role="status"
    aria-live="polite"
  >
    <span aria-hidden="true" class="inline-flex h-2 w-2 items-center justify-center">
      <span class="block h-2 w-2 rounded-full bg-fg-subtle" data-sync-dot></span>
    </span>
    <span data-sync-label>Local mode</span>
  </div>

  <style>
    [data-sync-state="ok"] [data-sync-dot]    { background: var(--accent); }
    [data-sync-state="syncing"] [data-sync-dot] {
      background: var(--accent);
      animation: sync-spin 1s linear infinite;
    }
    [data-sync-state="warn"] [data-sync-dot]  { background: var(--warning); }
    [data-sync-state="error"] [data-sync-dot] { background: var(--danger); }
    [data-sync-state="off"] [data-sync-dot]   { background: var(--fg-subtle); }

    @keyframes sync-spin {
      from { opacity: 0.4; }
      50%  { opacity: 1; }
      to   { opacity: 0.4; }
    }
  </style>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Sync indicator ready.

---

### Task 15: Create `SidebarFooter.astro`

**Files:**
- Create: `src/components/SidebarFooter.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import ThemeToggle from "@/components/ThemeToggle.astro";
  import SyncIndicator from "@/components/SyncIndicator.astro";
  ---

  <footer class="border-t border-default p-4 flex flex-col gap-3">
    <ThemeToggle />
    <SyncIndicator />
    <button
      id="signOutBtn"
      type="button"
      class="btn btn-ghost btn-danger justify-start hidden"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Sign out
    </button>
  </footer>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Sidebar footer ready.

---

### Task 16: Create `Sidebar.astro` (composes brand + nav + footer)

**Files:**
- Create: `src/components/Sidebar.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import SidebarBrand from "@/components/SidebarBrand.astro";
  import SidebarNav from "@/components/SidebarNav.astro";
  import SidebarFooter from "@/components/SidebarFooter.astro";
  ---

  <aside data-sidebar aria-label="Modules and account" class="flex flex-col bg-surface border-r border-default">
    <SidebarBrand />
    <SidebarNav />
    <SidebarFooter />
  </aside>
  <div id="drawerBackdrop" aria-hidden="true"></div>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Sidebar composition complete.

---

### Task 17: Create `MobileDrawerTrigger.astro`

**Files:**
- Create: `src/components/MobileDrawerTrigger.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <button
    type="button"
    data-drawer-trigger
    aria-label="Open navigation"
    aria-expanded="false"
    class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-default bg-surface text-fg-default hover:bg-surface-2 transition-colors"
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Mobile trigger ready.

---

## Phase 4 — Main pane content

### Task 18: Restyle `ProgressBar.astro` with size variants

**Files:**
- Modify: `src/components/ProgressBar.astro`

- [ ] **Step 1:** Open the file. Note the existing API. Then replace contents:

  ```astro
  ---
  type Size = "xs" | "sm" | "md";

  type Props = {
    size?: Size;
    percent?: number;
    label?: string;
    id?: string;
  };

  const { size = "sm", percent = 0, label, id } = Astro.props;

  const heights: Record<Size, string> = {
    xs: "h-[3px]",
    sm: "h-[6px]",
    md: "h-[10px]",
  };
  ---

  <div class="w-full">
    {label && <div class="mb-1.5 text-tiny font-semibold text-fg-muted">{label}</div>}
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin="0"
      aria-valuemax="100"
      class={`overflow-hidden w-full rounded-full bg-surface-2 ${heights[size]}`}
    >
      <div
        id={id}
        class="h-full rounded-full bg-accent transition-[width] duration-[240ms]"
        style={`width: ${percent}%`}
      ></div>
    </div>
  </div>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** ProgressBar ready with sizes.

---

### Task 19: Create `PageHeader.astro`

**Files:**
- Create: `src/components/PageHeader.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  type Props = {
    eyebrow?: string;
    eyebrowRight?: string;
    title: string;
    subtitle?: string;
  };
  const { eyebrow, eyebrowRight, title, subtitle } = Astro.props;
  ---

  <header class="pb-6 mb-6 border-b border-default">
    {(eyebrow || eyebrowRight) && (
      <div class="flex items-center justify-between text-tiny font-semibold uppercase tracking-wider text-fg-muted mb-3">
        <span>{eyebrow}</span>
        {eyebrowRight && <span class="font-mono normal-case tracking-normal">{eyebrowRight}</span>}
      </div>
    )}
    <h1 class="font-display text-display text-fg-default" style="view-transition-name: page-title">
      <slot name="title">{title}</slot>
    </h1>
    {subtitle && <p class="mt-2 text-body text-fg-muted">{subtitle}</p>}
    <slot name="below-title" />
  </header>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** PageHeader ready.

---

### Task 20: Create `LessonRow.astro`

**Files:**
- Create: `src/components/LessonRow.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import type { CourseModule } from "@/data/course";
  import type { LessonItem } from "@/lib/progress";
  import { videoKey } from "@/lib/progress";

  type Props = {
    module: CourseModule;
    chapterNum: number;
    item: LessonItem;
  };
  const { module, chapterNum, item } = Astro.props;
  const key = videoKey(module.code, chapterNum, item.num);
  const lessonNum = `${String(chapterNum).padStart(2, "0")}.${String(item.num).padStart(2, "0")}`;
  ---

  <label
    class={`group flex items-center gap-3 py-2 px-3 -mx-3 rounded-md cursor-pointer transition-colors duration-[80ms] hover:bg-surface-2 ${item.available ? "" : "opacity-60 cursor-not-allowed pointer-events-none"}`}
    data-lesson-row
    data-key={key}
    data-module={module.code}
    data-chapter={chapterNum}
  >
    <input
      type="checkbox"
      class="lesson-check h-4 w-4 shrink-0 cursor-pointer accent-accent"
      data-video-checkbox
      data-key={key}
      data-module={module.code}
      data-chapter={chapterNum}
      disabled={!item.available}
    />
    <span class="font-mono text-tiny text-fg-subtle min-w-[3.5rem]">{lessonNum}</span>
    <span class="flex-1 text-small text-fg-default group-has-[.lesson-check:checked]:text-fg-muted">
      Lesson {item.num}{item.available ? "" : " (n/a)"}
    </span>
    <span class="font-mono text-tiny text-fg-subtle">{key}</span>
  </label>
  ```

  Note: `accent-accent` uses Tailwind's `accent-color` utility with our `accent` color.

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Lesson row ready.

---

### Task 21: Create `ChapterSection.astro`

**Files:**
- Create: `src/components/ChapterSection.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import type { Chapter, CourseModule } from "@/data/course";
  import { getOrderedLessonItems } from "@/lib/progress";
  import LessonRow from "@/components/LessonRow.astro";

  type Props = {
    module: CourseModule;
    chapter: Chapter;
  };
  const { module, chapter } = Astro.props;
  const orderedLessons = getOrderedLessonItems(chapter);
  const headingId = `ch-${module.code.toLowerCase()}-${chapter.num}`;
  const totalAvailable = chapter.lessons.length;
  ---

  <section
    aria-labelledby={headingId}
    class="py-6 border-b border-default last:border-b-0"
    data-chapter-row
    data-module={module.code}
    data-chapter={chapter.num}
  >
    <header class="flex items-center justify-between gap-3 mb-3">
      <h3 id={headingId} class="text-h3 font-semibold text-fg-default">
        <span class="font-mono text-tiny text-fg-subtle mr-2">{`${String(chapter.num).padStart(2, "0")}`}</span>
        {chapter.name}
      </h3>
      <span class="flex items-center gap-2 text-tiny font-semibold text-fg-muted">
        <span data-chapter-glyph aria-hidden="true" class="inline-block h-3 w-3 rounded-full border-2 border-fg-subtle"></span>
        <span data-chapter-status>0/{totalAvailable}</span>
      </span>
    </header>

    {orderedLessons.length === 0 ? (
      <div class="text-tiny text-fg-subtle italic">No lessons in this chapter.</div>
    ) : (
      <div class="grid gap-0">
        {orderedLessons.map((item) => (
          <LessonRow module={module} chapterNum={chapter.num} item={item} />
        ))}
      </div>
    )}
  </section>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Chapter section ready.

---

### Task 22: Create `ModuleView.astro`

**Files:**
- Create: `src/components/ModuleView.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import type { CourseModule } from "@/data/course";
  import { CODE_TO_DAY } from "@/data/studyPlan";
  import PageHeader from "@/components/PageHeader.astro";
  import ProgressBar from "@/components/ProgressBar.astro";
  import ChapterSection from "@/components/ChapterSection.astro";

  type Props = {
    module: CourseModule;
  };
  const { module } = Astro.props;
  const slug = module.code.toLowerCase();
  const totalChapters = module.chapters.length;
  const totalLessons = module.chapters.reduce((sum, c) => sum + c.lessons.length, 0);
  const day = CODE_TO_DAY[module.code];
  const subtitle = `${totalChapters} chapter${totalChapters === 1 ? "" : "s"} · ${totalLessons} lesson${totalLessons === 1 ? "" : "s"}${day ? ` · Day ${day}` : ""}`;
  ---

  <article
    data-view-block={`module-${slug}`}
    data-module-card
    data-module={module.code}
    hidden
  >
    <a href="#/home" class="inline-flex items-center gap-1 text-tiny text-fg-muted hover:text-fg-default transition-colors mb-4" data-nav-item="home">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Home
    </a>

    <PageHeader
      eyebrow={`Module ${module.season}`}
      eyebrowRight={`0%`}
      title={module.name}
      subtitle={subtitle}
    >
      <Fragment slot="below-title">
        <div class="mt-5">
          <ProgressBar size="md" percent={0} id={`bar-${slug}`} />
        </div>
      </Fragment>
    </PageHeader>

    <div data-chapters>
      {module.chapters.map((chapter) => (
        <ChapterSection module={module} chapter={chapter} />
      ))}
    </div>

    <footer class="mt-8 pt-6 border-t border-default flex flex-wrap items-center gap-3">
      <button type="button" class="btn btn-ghost" data-module-mark-all={module.code}>Mark all watched</button>
      <button type="button" class="btn btn-ghost btn-danger" data-module-reset={module.code}>Reset module progress</button>
    </footer>
  </article>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Module view shell complete.

---

### Task 23: Create `TodayHero.astro` (rewritten TodayCard)

**Files:**
- Create: `src/components/TodayHero.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <section
    aria-labelledby="today-h"
    id="todayHero"
    class="rounded-lg border border-default bg-surface p-6 shadow-soft"
  >
    <header class="flex items-center justify-between gap-3 mb-4">
      <h2 id="today-h" class="text-tiny font-semibold uppercase tracking-wider text-fg-muted">Today</h2>
      <span data-today-status class="text-tiny font-semibold text-fg-subtle"></span>
    </header>

    <div data-today-empty hidden class="grid gap-3">
      <p class="text-body text-fg-muted">Set your start date to begin the 18-day study plan.</p>
      <label class="inline-flex items-center gap-3">
        <span class="text-small font-semibold text-fg-default">Start date</span>
        <input
          id="startDateInput"
          type="date"
          class="rounded-md border border-default bg-surface px-3 py-2 text-small text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </label>
    </div>

    <div data-today-content hidden>
      <div class="text-tiny font-semibold text-fg-muted mb-1" data-today-eyebrow></div>
      <div class="text-h2 font-semibold text-fg-default mb-4" data-today-title></div>
      <ul class="m-0 list-none p-0" data-today-lessons></ul>
      <footer class="mt-5 flex items-center justify-between text-tiny text-fg-muted">
        <span data-today-meta></span>
        <button type="button" class="btn btn-ghost" data-today-mark-all>Mark today watched</button>
      </footer>
    </div>

    <div data-today-complete hidden class="rounded-md border border-default bg-surface-2 p-5 text-center">
      <div class="text-h3 font-semibold text-fg-default mb-1">Course complete.</div>
      <p class="text-small text-fg-muted">Move into deeper practice and review.</p>
    </div>
  </section>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Today hero shell done.

---

### Task 24: Create `OverviewStats.astro` (rewritten StatsCards)

**Files:**
- Create: `src/components/OverviewStats.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <section aria-labelledby="overview-h">
    <h2 id="overview-h" class="text-tiny font-semibold uppercase tracking-wider text-fg-muted mb-4">Overview</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
      <div>
        <div class="font-mono text-h1 text-fg-default text-mono-feat" id="statModulesText">0 / 19</div>
        <div class="text-tiny text-fg-muted">modules done</div>
      </div>
      <div>
        <div class="font-mono text-h1 text-fg-default text-mono-feat" id="statPctText">0%</div>
        <div class="text-tiny text-fg-muted">videos watched</div>
      </div>
      <div>
        <div class="font-mono text-h1 text-fg-default text-mono-feat" id="statDayText">— / 18</div>
        <div class="text-tiny text-fg-muted">study day</div>
      </div>
      <div>
        <div class="font-mono text-h1 text-fg-default text-mono-feat" id="statWatchedText">0 / 0</div>
        <div class="text-tiny text-fg-muted">videos done</div>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Overview stats done.

---

### Task 25: Create `ScheduleStrip.astro`

**Files:**
- Create: `src/components/ScheduleStrip.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <section aria-labelledby="schedule-h">
    <h2 id="schedule-h" class="text-tiny font-semibold uppercase tracking-wider text-fg-muted mb-3">Schedule</h2>
    <div class="rounded-lg border border-default bg-surface p-5">
      <div class="overflow-hidden h-[6px] w-full rounded-full bg-surface-2">
        <div id="scheduleStripFill" class="h-full rounded-full bg-accent transition-[width] duration-[240ms]" style="width: 0%"></div>
      </div>
      <div class="mt-2 flex items-center justify-between font-mono text-tiny text-fg-subtle">
        <span id="scheduleStripStart">Day —</span>
        <span id="scheduleStripEnd">Day 18</span>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Schedule strip ready.

---

### Task 26: Create `HomeView.astro`

**Files:**
- Create: `src/components/HomeView.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import PageHeader from "@/components/PageHeader.astro";
  import TodayHero from "@/components/TodayHero.astro";
  import OverviewStats from "@/components/OverviewStats.astro";
  import ScheduleStrip from "@/components/ScheduleStrip.astro";

  const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
  ---

  <div data-view-block="home" class="grid gap-8" hidden>
    <PageHeader
      eyebrow={`Today · ${today}`}
      title="Welcome back."
      subtitle="Set your start date to begin tracking the 18-day plan."
    />
    <TodayHero />
    <OverviewStats />
    <ScheduleStrip />

    <section
      id="completeBanner"
      class="hidden rounded-lg border border-default bg-surface-2 p-5 text-center"
      role="status"
    >
      <div class="text-h3 font-semibold text-fg-default">Course complete.</div>
      <p class="text-small text-fg-muted mt-1">You're ready to move into deeper practice and review.</p>
    </section>
  </div>
  ```

  Note: PageHeader title text is updated at runtime by `home.ts` once start-date / day / state is known.

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Home view shell complete.

---

### Task 27: Create `MainPane.astro`

**Files:**
- Create: `src/components/MainPane.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import { COURSE } from "@/data/course";
  import HomeView from "@/components/HomeView.astro";
  import ModuleView from "@/components/ModuleView.astro";
  import MobileDrawerTrigger from "@/components/MobileDrawerTrigger.astro";
  ---

  <main
    id="mainPane"
    tabindex="-1"
    class="min-h-screen overflow-y-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10"
    data-view="home"
  >
    <div class="md:hidden mb-4">
      <MobileDrawerTrigger />
    </div>

    <div class="mx-auto max-w-content">
      <HomeView />
      {COURSE.map((module) => <ModuleView module={module} />)}
    </div>
  </main>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Main pane composition done.

---

## Phase 5 — Auth + Toast

### Task 28: Create `AuthGate.astro`

**Files:**
- Create: `src/components/AuthGate.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  import ThemeToggle from "@/components/ThemeToggle.astro";
  ---

  <section
    id="authGate"
    class="fixed inset-0 z-50 grid min-h-screen place-items-center bg-canvas px-4 py-8"
    aria-labelledby="auth-title"
  >
    <div class="grid w-full max-w-md gap-6">
      <div class="grid place-items-center gap-3">
        <span aria-hidden="true" class="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-on-accent">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 L4 7 v6 c0 4 3.5 7 8 8 4.5-1 8-4 8-8 V7 Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <h1 id="auth-title" class="font-display text-h1 text-fg-default">PEN-200</h1>
        <p class="text-small text-fg-muted -mt-2">Progress Tracker</p>
      </div>

      <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <div role="tablist" class="grid grid-cols-2 gap-0 mb-5 border-b border-default">
          <button
            type="button"
            role="tab"
            id="authSignInModeBtn"
            aria-selected="true"
            class="auth-tab pb-2 text-small font-semibold text-fg-default border-b-2 border-accent -mb-px"
          >Sign in</button>
          <button
            type="button"
            role="tab"
            id="authSignUpModeBtn"
            aria-selected="false"
            class="auth-tab pb-2 text-small font-semibold text-fg-muted border-b-2 border-transparent -mb-px"
          >Create account</button>
        </div>

        <form id="authForm" class="grid gap-4">
          <label class="grid gap-1.5" for="authUsernameInput">
            <span class="text-tiny font-semibold text-fg-muted">Username</span>
            <input
              id="authUsernameInput"
              class="rounded-md border border-default bg-surface px-3 py-2 text-small text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              type="text"
              autocomplete="username"
              placeholder="your_username"
              minlength="3"
              maxlength="24"
              pattern="[A-Za-z0-9_]{3,24}"
              required
            />
            <span id="authUsernameStatus" class="text-tiny text-fg-subtle min-h-[1em]"></span>
          </label>

          <label id="authEmailLabel" class="hidden gap-1.5" for="authEmailInput">
            <span class="text-tiny font-semibold text-fg-muted">Email address</span>
            <input
              id="authEmailInput"
              class="rounded-md border border-default bg-surface px-3 py-2 text-small text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
          </label>

          <label class="grid gap-1.5" for="authPasswordInput">
            <span class="text-tiny font-semibold text-fg-muted">Password</span>
            <input
              id="authPasswordInput"
              class="rounded-md border border-default bg-surface px-3 py-2 text-small text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              type="password"
              autocomplete="current-password"
              minlength="8"
              required
            />
          </label>

          <button id="authSubmitBtn" class="btn btn-primary w-full" type="submit">Sign in</button>

          <p
            id="authGateStatus"
            class="text-small text-fg-muted text-center min-h-[1.25em]"
            aria-live="polite"
            aria-atomic="true"
          >Sign in with your username and password.</p>
        </form>
      </div>

      <div class="absolute bottom-4 right-4 hidden md:block">
        <ThemeToggle />
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Auth gate redesigned.

---

### Task 29: Create `Toast.astro`

**Files:**
- Create: `src/components/Toast.astro`

- [ ] **Step 1:** Write the file.

  ```astro
  ---
  ---

  <div
    id="toast"
    role="status"
    aria-live="polite"
    class="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md opacity-0 transition-opacity duration-[180ms]"
    data-variant="info"
  >
    <div class="rounded-md border border-default bg-surface px-4 py-3 shadow-pop flex items-center gap-3 pointer-events-auto">
      <span data-toast-message class="text-small text-fg-default flex-1"></span>
      <button
        type="button"
        data-toast-undo
        class="hidden btn btn-ghost btn-danger px-3 py-1 text-tiny"
      >Undo</button>
    </div>
  </div>

  <style>
    #toast.show { opacity: 1; }
    #toast > div {
      transform: translateY(8px);
      transition: transform 180ms ease-out;
    }
    #toast.show > div { transform: translateY(0); }

    #toast[data-variant="success"] > div { border-left: 2px solid var(--success); }
    #toast[data-variant="warning"] > div { border-left: 2px solid var(--warning); }
    #toast[data-variant="danger"]  > div { border-left: 2px solid var(--danger); }
  </style>
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Toast component done.

---

## Phase 6 — Tracker logic split

### Task 30: Create `lib/tracker/toast.ts`

**Files:**
- Create: `src/lib/tracker/toast.ts`

- [ ] **Step 1:** Write the file.

  ```ts
  type Variant = "info" | "success" | "warning" | "danger";

  type ShowOptions = {
    variant?: Variant;
    duration?: number;            // ms; 0 = sticky until next call
    undo?: { label?: string; onUndo: () => void };
  };

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function elements() {
    const root = document.getElementById("toast");
    if (!root) return null;
    const message = root.querySelector<HTMLElement>("[data-toast-message]");
    const undoBtn = root.querySelector<HTMLButtonElement>("[data-toast-undo]");
    if (!message || !undoBtn) return null;
    return { root, message, undoBtn };
  }

  export function showToast(message: string, options: ShowOptions = {}): void {
    const els = elements();
    if (!els) return;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    const variant = options.variant ?? "info";
    const duration = options.duration ?? 2500;

    els.root.dataset.variant = variant;
    els.message.textContent = message;

    if (options.undo) {
      els.undoBtn.classList.remove("hidden");
      els.undoBtn.textContent = options.undo.label ?? "Undo";
      const handler = () => {
        options.undo!.onUndo();
        hideToast();
      };
      const old = els.undoBtn.dataset.handlerAttached;
      if (old) els.undoBtn.replaceWith(els.undoBtn.cloneNode(true) as HTMLButtonElement);
      const fresh = elements()?.undoBtn;
      if (fresh) {
        fresh.classList.remove("hidden");
        fresh.textContent = options.undo.label ?? "Undo";
        fresh.addEventListener("click", handler, { once: true });
        fresh.dataset.handlerAttached = "1";
      }
    } else {
      els.undoBtn.classList.add("hidden");
    }

    els.root.classList.add("show");

    if (duration > 0) {
      hideTimer = setTimeout(hideToast, duration);
    }
  }

  export function hideToast(): void {
    const els = elements();
    if (!els) return;
    els.root.classList.remove("show");
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Toast helper ready.

---

### Task 31: Create `lib/tracker/undo.ts`

**Files:**
- Create: `src/lib/tracker/undo.ts`

- [ ] **Step 1:** Write the file.

  ```ts
  import type { ProgressState } from "@/lib/progress";

  type Snapshot = {
    progress: ProgressState;
    startDate: string;
  };

  export function snapshot(state: Snapshot): Snapshot {
    return {
      progress: { ...state.progress },
      startDate: state.startDate,
    };
  }
  ```

  Tiny by design — the actual restore is handled in the caller because state lives in `tracker.ts`.

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Undo helper ready.

---

### Task 32: Create `lib/tracker/sidebar.ts`

**Files:**
- Create: `src/lib/tracker/sidebar.ts`

- [ ] **Step 1:** Write the file.

  ```ts
  import { COURSE } from "@/data/course";
  import { moduleCounts, type ProgressState } from "@/lib/progress";

  export function refreshSidebarProgress(progress: ProgressState): void {
    COURSE.forEach((module) => {
      const item = document.querySelector<HTMLElement>(`[data-progress-key="${module.code}"]`);
      if (!item) return;
      const counts = moduleCounts(module, progress);
      const bar = item.querySelector<HTMLElement>("[data-nav-bar]");
      const pct = item.querySelector<HTMLElement>("[data-nav-pct]");
      if (bar) bar.style.width = `${counts.percent}%`;
      if (pct) pct.textContent = `${counts.percent}%`;
    });
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Sidebar progress updater ready.

---

### Task 33: Create `lib/tracker/home.ts`

**Files:**
- Create: `src/lib/tracker/home.ts`

- [ ] **Step 1:** Write the file.

  ```ts
  import { COURSE } from "@/data/course";
  import { CODE_TO_DAY, STUDY_PLAN } from "@/data/studyPlan";
  import {
    calculateStats,
    currentStudyDay,
    isDayDone,
    videoKey,
    moduleCounts,
    type ProgressState,
  } from "@/lib/progress";

  export type HomeContext = {
    progress: ProgressState;
    startDate: string;
  };

  function el<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  function setText(id: string, text: string): void {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function setHomeTitle(title: string, subtitle: string): void {
    const homeBlock = document.querySelector<HTMLElement>('[data-view-block="home"]');
    if (!homeBlock) return;
    const h1 = homeBlock.querySelector<HTMLElement>("h1");
    const sub = homeBlock.querySelector<HTMLElement>("h1 + p");
    if (h1) h1.textContent = title;
    if (sub) sub.textContent = subtitle;
  }

  function renderTodayHero(ctx: HomeContext, day: number | null): void {
    const empty = document.querySelector<HTMLElement>("[data-today-empty]");
    const content = document.querySelector<HTMLElement>("[data-today-content]");
    const complete = document.querySelector<HTMLElement>("[data-today-complete]");
    const status = document.querySelector<HTMLElement>("[data-today-status]");
    const stats = calculateStats(COURSE, ctx.progress);

    [empty, content, complete].forEach((node) => node && (node.hidden = true));

    if (stats.totalAvailable > 0 && stats.percent === 100) {
      complete && (complete.hidden = false);
      status && (status.textContent = "100% complete");
      return;
    }

    if (day === null) {
      empty && (empty.hidden = false);
      status && (status.textContent = "");
      const startInput = el<HTMLInputElement>("startDateInput");
      if (startInput) startInput.value = ctx.startDate || "";
      return;
    }

    const plan = STUDY_PLAN.find((entry) => entry.day === day);
    if (!plan) {
      empty && (empty.hidden = false);
      return;
    }

    content && (content.hidden = false);
    const eyebrow = document.querySelector<HTMLElement>("[data-today-eyebrow]");
    const title = document.querySelector<HTMLElement>("[data-today-title]");
    const list = document.querySelector<HTMLElement>("[data-today-lessons]");
    const meta = document.querySelector<HTMLElement>("[data-today-meta]");

    const moduleCodesLabel = plan.modules.length > 0 ? plan.modules.join(", ") : "Review";
    if (eyebrow) eyebrow.textContent = `Day ${plan.day} · ${moduleCodesLabel}`;
    if (title) title.textContent = plan.label;
    if (list) {
      list.innerHTML = "";
      plan.modules.forEach((code) => {
        const module = COURSE.find((m) => m.code === code);
        if (!module) return;
        module.chapters.forEach((chapter) => {
          chapter.lessons.forEach((lesson) => {
            const key = videoKey(module.code, chapter.num, lesson);
            const watched = Boolean(ctx.progress[key]);
            const li = document.createElement("li");
            li.className = "flex items-center gap-3 py-1.5 text-small";
            li.innerHTML = `
              <input type="checkbox" class="h-4 w-4 cursor-pointer accent-accent" data-video-checkbox data-key="${key}" data-module="${module.code}" data-chapter="${chapter.num}" ${watched ? "checked" : ""} />
              <span class="font-mono text-tiny text-fg-subtle min-w-[3.5rem]">${String(chapter.num).padStart(2, "0")}.${String(lesson).padStart(2, "0")}</span>
              <span class="flex-1 ${watched ? "text-fg-muted" : "text-fg-default"}">Lesson ${lesson}</span>
              <span class="font-mono text-tiny text-fg-subtle">${key}</span>
            `;
            list.appendChild(li);
          });
        });
      });
    }
    if (meta) {
      const done = isDayDone(plan, COURSE, ctx.progress);
      meta.textContent = done ? "Today's plan complete." : `${plan.estHours > 0 ? `~${plan.estHours}h` : "Review"} · ${plan.modules.length} module${plan.modules.length === 1 ? "" : "s"}`;
    }
    if (status) {
      const done = isDayDone(plan, COURSE, ctx.progress);
      status.textContent = done ? "Done" : "In progress";
    }
  }

  function renderOverview(ctx: HomeContext, day: number | null): void {
    const stats = calculateStats(COURSE, ctx.progress);
    setText("statModulesText", `${stats.modulesDone} / ${COURSE.length}`);
    setText("statPctText", `${stats.percent}%`);
    setText("statDayText", day ? `${day} / 18` : "— / 18");
    setText("statWatchedText", `${stats.watched} / ${stats.totalAvailable}`);
    const banner = document.getElementById("completeBanner");
    if (banner) banner.classList.toggle("hidden", stats.percent !== 100);
  }

  function renderSchedule(day: number | null): void {
    const fill = document.getElementById("scheduleStripFill");
    if (fill) fill.style.width = `${day ? Math.min(100, Math.round((day / 18) * 100)) : 0}%`;
    setText("scheduleStripStart", day ? `Day ${day}` : "Day —");
  }

  function renderHomeHeader(ctx: HomeContext, day: number | null): void {
    if (day === null) {
      setHomeTitle("Welcome back.", "Set your start date to begin tracking the 18-day plan.");
      return;
    }
    const stats = calculateStats(COURSE, ctx.progress);
    if (stats.totalAvailable > 0 && stats.percent === 100) {
      setHomeTitle("Course complete.", "Move into deeper practice and review.");
      return;
    }
    setHomeTitle(`Day ${day} of 18.`, "Keep going. Today's plan is below.");
  }

  export function renderHome(ctx: HomeContext): void {
    const day = currentStudyDay(ctx.startDate);
    renderHomeHeader(ctx, day);
    renderTodayHero(ctx, day);
    renderOverview(ctx, day);
    renderSchedule(day);
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Home renderer ready.

---

### Task 34: Create `lib/tracker/module.ts`

**Files:**
- Create: `src/lib/tracker/module.ts`

- [ ] **Step 1:** Write the file.

  ```ts
  import { COURSE, type CourseModule } from "@/data/course";
  import { chapterCounts, moduleCounts, type ProgressState } from "@/lib/progress";

  function setText(node: HTMLElement | null, text: string): void {
    if (node) node.textContent = text;
  }

  function refreshChapter(module: CourseModule, progress: ProgressState): void {
    module.chapters.forEach((chapter) => {
      const row = document.querySelector<HTMLElement>(
        `[data-chapter-row][data-module="${module.code}"][data-chapter="${chapter.num}"]`
      );
      if (!row) return;

      const counts = chapterCounts(module, chapter, progress);
      const status = row.querySelector<HTMLElement>("[data-chapter-status]");
      const glyph = row.querySelector<HTMLElement>("[data-chapter-glyph]");
      setText(status, counts.total === 0 ? "n/a" : `${counts.watched}/${counts.total}`);
      if (glyph) {
        glyph.style.background = counts.total > 0 && counts.watched === counts.total
          ? "var(--accent)"
          : counts.watched > 0
            ? "color-mix(in oklab, var(--accent) 50%, transparent)"
            : "transparent";
        glyph.style.borderColor = counts.total === 0
          ? "var(--fg-subtle)"
          : counts.watched === counts.total
            ? "var(--accent)"
            : "var(--fg-subtle)";
      }
    });

    // Apply checkbox state for this module's lessons
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `[data-video-checkbox][data-module="${module.code}"]`
    );
    inputs.forEach((input) => {
      const key = input.dataset.key;
      input.checked = Boolean(key && progress[key]);
    });
  }

  function refreshModuleHeader(module: CourseModule, progress: ProgressState): void {
    const card = document.querySelector<HTMLElement>(
      `[data-module-card][data-module="${module.code}"]`
    );
    if (!card) return;

    const counts = moduleCounts(module, progress);
    const eyebrowRight = card.querySelector<HTMLElement>("header span.font-mono");
    setText(eyebrowRight, `${counts.percent}%`);
    const bar = card.querySelector<HTMLElement>(`#bar-${module.code.toLowerCase()}`);
    if (bar) bar.style.width = `${counts.percent}%`;
  }

  export function refreshAllModules(progress: ProgressState): void {
    COURSE.forEach((module) => {
      refreshChapter(module, progress);
      refreshModuleHeader(module, progress);
    });
  }
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Module renderer ready.

---

### Task 35: Create `lib/tracker/auth.ts` and `lib/tracker/sync.ts`

**Files:**
- Create: `src/lib/tracker/auth.ts`
- Create: `src/lib/tracker/sync.ts`

These extract the existing auth + sync logic verbatim from the current `tracker.ts` but adapted to the new DOM (sidebar footer status, auth gate). The simplest approach is to keep the shared state in `tracker.ts` and call these helpers, which is what we'll do in the rewrite (Task 38). For now, write minimal scaffolds:

- [ ] **Step 1:** Write `src/lib/tracker/auth.ts`:

  ```ts
  import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";

  export type AuthMode = "sign-in" | "sign-up";

  export function isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,24}$/.test(username);
  }

  export type UsernameAuthResponse = {
    ok?: boolean;
    session?: Session | null;
    username?: string;
    needsConfirmation?: boolean;
    error?: string;
    available?: boolean;
  };

  export async function checkUsername(username: string): Promise<{ ok: boolean; available: boolean }> {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured() || !client) return { ok: false, available: false };
    const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
      body: { action: "check-username", username },
    });
    if (error || data?.ok === false) return { ok: false, available: false };
    return { ok: true, available: Boolean(data?.available) };
  }

  export async function signIn(username: string, password: string): Promise<UsernameAuthResponse | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
      body: { action: "sign-in", username, password },
    });
    if (error) return { ok: false, error: error.message };
    return data ?? null;
  }

  export async function signUp(username: string, email: string, password: string): Promise<UsernameAuthResponse | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const redirectTo = window.location.href.split("#")[0];
    const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
      body: { action: "sign-up", username, email, password, redirectTo },
    });
    if (error) return { ok: false, error: error.message };
    return data ?? null;
  }
  ```

- [ ] **Step 2:** Write `src/lib/tracker/sync.ts`:

  ```ts
  import { getSupabaseClient, type Session, TRACKER_NAME } from "@/lib/supabase";
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

  export async function loadCloud(session: Session): Promise<CloudSnapshot | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("tracker_progress")
      .select("progress,start_date,updated_at")
      .eq("user_id", session.user.id)
      .eq("tracker_name", TRACKER_NAME)
      .maybeSingle();
    if (error || !data) return null;
    return {
      progress: (data.progress as ProgressState) ?? {},
      startDate: data.start_date ?? "",
      updatedAt: data.updated_at ?? "",
    };
  }

  export async function saveCloud(session: Session, progress: ProgressState, startDate: string): Promise<{ ok: boolean; updatedAt?: string }> {
    const client = getSupabaseClient();
    if (!client) return { ok: false };
    const updatedAt = new Date().toISOString();
    const { error } = await client.from("tracker_progress").upsert({
      user_id: session.user.id,
      tracker_name: TRACKER_NAME,
      progress,
      start_date: startDate || null,
      updated_at: updatedAt,
    }, { onConflict: "user_id,tracker_name" });
    if (error) return { ok: false };
    return { ok: true, updatedAt };
  }
  ```

- [ ] **Step 3:** Save both.

- [ ] **Checkpoint:** Auth + sync helpers extracted.

---

### Task 36: Rewrite `lib/tracker.ts` as the orchestrator

**Files:**
- Modify: `src/lib/tracker.ts`

- [ ] **Step 1:** Replace the entire file. This file is now a slim orchestrator that uses the modules in `lib/tracker/`.

  Write to `src/lib/tracker.ts`:

  ```ts
  import { COURSE } from "@/data/course";
  import { videoKey, type ProgressState } from "@/lib/progress";
  import {
    loadLastSynced,
    loadLocalUpdatedAt,
    loadProgress,
    loadStartDate,
    saveLastSynced,
    saveProgress,
    saveStartDate,
    touchLocalTimestamp,
  } from "@/lib/storage";
  import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";

  import { initView, setView, getView, onViewChange } from "@/lib/tracker/view";
  import { initTheme } from "@/lib/tracker/theme";
  import { initDrawer } from "@/lib/tracker/drawer";
  import { allValidSlugs, moduleBySlug } from "@/lib/tracker/modules";
  import { refreshSidebarProgress } from "@/lib/tracker/sidebar";
  import { renderHome } from "@/lib/tracker/home";
  import { refreshAllModules } from "@/lib/tracker/module";
  import { showToast } from "@/lib/tracker/toast";
  import { snapshot } from "@/lib/tracker/undo";
  import { isValidUsername, checkUsername, signIn, signUp, type AuthMode } from "@/lib/tracker/auth";
  import { setSyncState, loadCloud, saveCloud } from "@/lib/tracker/sync";

  // ---- State -----------------------------------------------------------------

  let progress: ProgressState = loadProgress();
  let startDate = loadStartDate();
  let localUpdatedAt = loadLocalUpdatedAt();
  let session: Session | null = null;
  let accountName = "";
  let authMode: AuthMode = "sign-in";
  let usernameAvailable: boolean | null = null;
  let usernameTimer: ReturnType<typeof setTimeout> | null = null;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Helpers ---------------------------------------------------------------

  function persistProgress(): void {
    saveProgress(progress);
    localUpdatedAt = touchLocalTimestamp();
    queueCloudSave();
    refresh();
  }

  function persistStart(value: string): void {
    startDate = value;
    saveStartDate(value);
    localUpdatedAt = touchLocalTimestamp();
    queueCloudSave();
    refresh();
  }

  function refresh(): void {
    refreshSidebarProgress(progress);
    refreshAllModules(progress);
    renderHome({ progress, startDate });
  }

  function queueCloudSave(): void {
    if (!isSupabaseConfigured() || !session) return;
    if (syncTimer) clearTimeout(syncTimer);
    setSyncState("syncing", "Syncing…");
    syncTimer = setTimeout(async () => {
      const result = await saveCloud(session!, progress, startDate);
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
    const cloud = await loadCloud(session);
    if (!cloud) {
      setSyncState("error", "Sync failed");
      return;
    }
    const cloudHasData = Object.keys(cloud.progress).length > 0 || Boolean(cloud.startDate);
    const cloudNewer = cloud.updatedAt && (!localUpdatedAt || new Date(cloud.updatedAt) > new Date(localUpdatedAt));
    const localHasData = Object.keys(progress).length > 0 || Boolean(startDate);

    if (cloudHasData && cloudNewer) {
      progress = cloud.progress;
      startDate = cloud.startDate;
      saveProgress(progress);
      saveStartDate(startDate);
      localUpdatedAt = touchLocalTimestamp(cloud.updatedAt);
      saveLastSynced(cloud.updatedAt);
      setSyncState("ok", "Loaded cloud progress");
      refresh();
      return;
    }
    if (localHasData || !cloudHasData) {
      const result = await saveCloud(session, progress, startDate);
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
    const password = document.getElementById("authPasswordInput") as HTMLInputElement | null;

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

    if (submit) submit.textContent = mode === "sign-in" ? "Sign in" : "Create account";
    if (emailLabel) {
      emailLabel.classList.toggle("hidden", mode === "sign-in");
      emailLabel.classList.toggle("grid", mode === "sign-up");
    }
    if (email) email.required = mode === "sign-up";
    if (password) password.autocomplete = mode === "sign-in" ? "current-password" : "new-password";
    setUsernameStatus("");
    setAuthStatus(mode === "sign-in"
      ? "Sign in with your username and password."
      : "Create an account with a username and a password (8+ characters).");
  }

  function setAuthStatus(message: string): void {
    const node = document.getElementById("authGateStatus");
    if (node) node.textContent = message;
  }

  function setUsernameStatus(message: string): void {
    const node = document.getElementById("authUsernameStatus");
    if (node) node.textContent = message;
  }

  function showAuth(show: boolean): void {
    const gate = document.getElementById("authGate");
    const tracker = document.getElementById("trackerApp");
    if (gate) gate.classList.toggle("hidden", !show);
    if (tracker) tracker.classList.toggle("hidden", show);
    document.body.classList.toggle("overflow-hidden", show);
  }

  function setSignedInUI(signedIn: boolean): void {
    const signOut = document.getElementById("signOutBtn");
    if (signOut) signOut.classList.toggle("hidden", !signedIn);
  }

  function bindAuthEvents(): void {
    document.getElementById("authSignInModeBtn")?.addEventListener("click", () => setAuthMode("sign-in"));
    document.getElementById("authSignUpModeBtn")?.addEventListener("click", () => {
      setAuthMode("sign-up");
      queueUsernameCheck();
    });
    document.getElementById("authUsernameInput")?.addEventListener("input", () => {
      if (authMode === "sign-up") queueUsernameCheck();
    });
    document.getElementById("authForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitAuth();
    });
    document.getElementById("signOutBtn")?.addEventListener("click", () => void doSignOut());
  }

  function queueUsernameCheck(): void {
    if (usernameTimer) clearTimeout(usernameTimer);
    usernameTimer = setTimeout(async () => {
      const input = document.getElementById("authUsernameInput") as HTMLInputElement | null;
      const value = input?.value.trim() ?? "";
      if (!value) { setUsernameStatus(""); return; }
      if (!isValidUsername(value)) { setUsernameStatus("Use 3–24 letters, numbers, or underscores."); return; }
      setUsernameStatus("Checking…");
      const { ok, available } = await checkUsername(value);
      if (!ok) { setUsernameStatus("Could not check right now."); return; }
      usernameAvailable = available;
      setUsernameStatus(available ? "Username is available." : "Username is already taken.");
    }, 450);
  }

  async function submitAuth(): Promise<void> {
    const username = (document.getElementById("authUsernameInput") as HTMLInputElement | null)?.value.trim() ?? "";
    const email = (document.getElementById("authEmailInput") as HTMLInputElement | null)?.value.trim() ?? "";
    const password = (document.getElementById("authPasswordInput") as HTMLInputElement | null)?.value ?? "";
    if (!isValidUsername(username)) { setAuthStatus("Username must be 3–24 letters, numbers, or underscores."); return; }
    if (authMode === "sign-up" && usernameAvailable === false) { setAuthStatus("Choose another username."); return; }
    if (authMode === "sign-up" && !email) { setAuthStatus("Enter your email address."); return; }
    if (password.length < 8) { setAuthStatus("Password must be at least 8 characters."); return; }

    setAuthStatus(authMode === "sign-in" ? "Signing in…" : "Creating account…");
    const data = authMode === "sign-in"
      ? await signIn(username, password)
      : await signUp(username, email, password);

    if (!data || data.ok === false || data.error) {
      setAuthStatus(data?.error ?? "Authentication failed.");
      return;
    }

    if (data.session?.access_token && data.session.refresh_token) {
      const client = getSupabaseClient();
      if (!client) return;
      const { data: setRes, error } = await client.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (error || !setRes.session) {
        setAuthStatus("Authentication failed. Try again.");
        return;
      }
      session = setRes.session;
      accountName = data.username ?? username;
      showAuth(false);
      setSignedInUI(true);
      setSyncState("ok", `Signed in as ${accountName}`);
      await loadOrMergeCloud();
      showToast(authMode === "sign-in" ? "Signed in." : "Account created.", { variant: "success" });
      return;
    }

    if (authMode === "sign-up") {
      setAuthMode("sign-in");
      setAuthStatus("Account created. Confirm your email if required, then sign in.");
      return;
    }
    setAuthStatus("Sign-in did not return a session.");
  }

  async function doSignOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    session = null;
    accountName = "";
    setSignedInUI(false);
    setSyncState(isSupabaseConfigured() ? "warn" : "off", isSupabaseConfigured() ? "Sign in required" : "Local mode");
    if (isSupabaseConfigured()) showAuth(true);
    showToast("Signed out.");
  }

  async function initSupabase(): Promise<void> {
    if (!isSupabaseConfigured()) {
      setSyncState("off", "Local mode");
      showAuth(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;

    const { data } = await client.auth.getSession();
    session = data.session;
    accountName = session?.user.user_metadata?.username ?? "";
    showAuth(!session);
    setSignedInUI(Boolean(session));
    setSyncState(session ? "ok" : "warn", session ? `Signed in as ${accountName || "user"}` : "Sign in required");

    client.auth.onAuthStateChange(async (_event, next) => {
      session = next;
      accountName = next?.user.user_metadata?.username ?? "";
      showAuth(!next);
      setSignedInUI(Boolean(next));
      if (next) await loadOrMergeCloud();
    });

    if (session) await loadOrMergeCloud();
  }

  // ---- Tracker bindings ------------------------------------------------------

  function bindTrackerEvents(): void {
    // Lesson checkboxes
    document.body.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target?.matches?.("[data-video-checkbox]")) return;
      const key = target.dataset.key;
      if (!key) return;
      if (target.checked) progress[key] = true;
      else delete progress[key];
      persistProgress();
    });

    // Start date
    document.body.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | null;
      if (target?.id === "startDateInput") {
        persistStart(target.value);
        showToast("Start date saved.", { variant: "success" });
      }
    });

    // Today: mark all
    document.querySelector<HTMLElement>("[data-today-mark-all]")?.addEventListener("click", () => {
      const view = getView();
      if (view.kind !== "home") return;
      const lessonInputs = document.querySelectorAll<HTMLInputElement>("[data-today-lessons] [data-video-checkbox]");
      lessonInputs.forEach((input, idx) => {
        setTimeout(() => {
          if (!input.checked) {
            input.checked = true;
            const key = input.dataset.key;
            if (key) progress[key] = true;
          }
        }, idx * 30);
      });
      setTimeout(() => persistProgress(), lessonInputs.length * 30 + 50);
    });

    // Module: mark all watched
    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const code = target?.dataset?.moduleMarkAll;
      if (!code) return;
      const module = COURSE.find((m) => m.code === code);
      if (!module) return;
      module.chapters.forEach((chapter) => {
        chapter.lessons.forEach((lesson) => {
          progress[videoKey(module.code, chapter.num, lesson)] = true;
        });
      });
      persistProgress();
      showToast(`Marked ${module.name} watched.`, { variant: "success" });
    });

    // Module: reset progress (with undo)
    document.body.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const code = target?.dataset?.moduleReset;
      if (!code) return;
      const module = COURSE.find((m) => m.code === code);
      if (!module) return;
      const before = snapshot({ progress, startDate });
      module.chapters.forEach((chapter) => {
        chapter.lessons.forEach((lesson) => {
          delete progress[videoKey(module.code, chapter.num, lesson)];
        });
      });
      persistProgress();
      showToast(`Reset ${module.name}.`, {
        variant: "danger",
        duration: 6000,
        undo: {
          onUndo: () => {
            progress = before.progress;
            startDate = before.startDate;
            persistProgress();
            showToast("Restored.", { variant: "success" });
          },
        },
      });
    });
  }

  // ---- Boot ------------------------------------------------------------------

  function boot(): void {
    initTheme();
    initDrawer();
    initView(allValidSlugs());
    bindAuthEvents();
    bindTrackerEvents();
    setAuthMode("sign-in");

    refresh();
    void initSupabase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Re-render on view change so the home/module specific updates apply (most are static prerendered, this is a no-op safety call)
  onViewChange(() => {
    refresh();
  });
  ```

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Tracker orchestrator rebuilt against the new components.

---

## Phase 7 — Page wiring

### Task 37: Rewrite `pages/index.astro`

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1:** Replace the file.

  Write to `src/pages/index.astro`:

  ```astro
  ---
  import AppShell from "@/components/AppShell.astro";
  import AuthGate from "@/components/AuthGate.astro";
  import Sidebar from "@/components/Sidebar.astro";
  import MainPane from "@/components/MainPane.astro";
  import Toast from "@/components/Toast.astro";
  ---

  <AppShell>
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

- [ ] **Step 2:** Save.

- [ ] **Checkpoint:** Page composition done.

---

### Task 38: First end-to-end build & smoke test

**Files:** none (verification)

- [ ] **Step 1:** Run dev server.

  Run: `npm run dev`
  Expected: builds without errors. Open the site.

- [ ] **Step 2:** Inspect the page:
  - **No Supabase configured** path: auth gate is hidden, tracker shows immediately.
  - **Supabase configured** path: auth gate appears. Submit invalid credentials → inline status updates.
  - Sidebar lists 19 modules with progress bars at 0%.
  - Click "Information Gathering" → URL becomes `#/m/ig`, main pane shows the module view, sidebar item is highlighted.
  - Click "Home" → URL becomes `#/home`, main pane shows the home view.
  - Toggle a lesson checkbox → sidebar progress for that module updates.
  - Set a start date → home title updates to "Day N of 18.", today hero shows lessons.
  - Toggle theme via sidebar footer → entire UI flips to dark with a crossfade. Reload → no flash, dark persists.
  - Resize to <768px → sidebar disappears, hamburger appears top-left of main pane. Click it → sidebar slides in. Tap backdrop → closes. Tap a module → drawer closes and view changes.
  - Press Tab from the address bar → "Skip to main content" link appears.
  - Open `<site>/#/m/sqli` directly → loads to SQL Injection module.

- [ ] **Step 3:** Fix any visual bugs spotted (typically: leftover Tailwind classes from old design, contrast mistakes, missing aria attributes).

- [ ] **Step 4:** Stop dev server.

- [ ] **Checkpoint:** End-to-end flow works in both themes.

---

## Phase 8 — Cleanup

### Task 39: Delete dead components

**Files:**
- Delete: `src/components/Header.astro`
- Delete: `src/components/ModuleCard.astro`
- Delete: `src/components/SchedulePanel.astro`
- Delete: `src/components/SyncPanel.astro`
- Delete: `src/components/VideoChip.astro`
- Delete: `src/components/TodayCard.astro`
- Delete: `src/components/StatsCards.astro`
- Delete: `src/components/ChapterRow.astro`

- [ ] **Step 1:** Verify none of these files are imported anywhere.

  Run: `grep -RIn "Header\|ModuleCard\|SchedulePanel\|SyncPanel\|VideoChip\|TodayCard\|StatsCards\|ChapterRow" src/`
  Expected: only references in the files being deleted, or zero hits.

- [ ] **Step 2:** Delete the files.

  Run (Unix bash via this project's shell):
  ```
  rm src/components/Header.astro src/components/ModuleCard.astro src/components/SchedulePanel.astro src/components/SyncPanel.astro src/components/VideoChip.astro src/components/TodayCard.astro src/components/StatsCards.astro src/components/ChapterRow.astro
  ```

- [ ] **Step 3:** Run the dev server.

  Run: `npm run dev`
  Expected: builds cleanly.

- [ ] **Step 4:** Stop dev server.

- [ ] **Checkpoint:** Dead components removed.

---

### Task 40: Delete the legacy `PEN-200_Progress_Tracker_Light_Modern_v2.html`

**Files:**
- Delete: `PEN-200_Progress_Tracker_Light_Modern_v2.html`

- [ ] **Step 1:** Confirm the file is the legacy mock-up referenced in the README (not part of the live build). It's not imported by Astro.

- [ ] **Step 2:** Delete it.

  Run: `rm "PEN-200_Progress_Tracker_Light_Modern_v2.html"`

- [ ] **Checkpoint:** Legacy mock-up removed.

---

## Phase 9 — Verification & polish

### Task 41: Production build & preview

**Files:** none (verification)

- [ ] **Step 1:** Run a production build.

  Run: `npm run build`
  Expected: completes with no errors. Look for warnings about unused imports — fix any obvious ones.

- [ ] **Step 2:** Preview the build.

  Run: `npm run preview`
  Expected: serves on a local port; site loads at the BASE_URL path.

- [ ] **Step 3:** Walk through every state in **light theme** then **dark theme**:
  - Auth gate (if Supabase configured)
  - Home view: empty (no start date), with start date set, course-complete (set every key in localStorage manually for testing if you can't actually finish 19 modules — see Step 4)
  - Each of the 19 modules
  - Lesson check / uncheck
  - Mark-all / Reset / Undo on a module
  - Today: mark today watched
  - Sign in / sign out (if Supabase configured)

- [ ] **Step 4:** Course-complete simulation. In DevTools console:

  ```js
  const data = {};
  // Call into the data we already shipped, available via the window? It isn't —
  // simplest path: copy the COURSE codes/chapter numbers from src/data/course.ts and seed.
  // OR: set every existing video key by iterating the DOM:
  document.querySelectorAll('[data-video-checkbox]').forEach(cb => {
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  ```
  Expected: progress reaches 100%, completion banner appears on home, today hero swaps to "Course complete." Reset back via:
  ```js
  localStorage.removeItem("pen200_progress_v2");
  location.reload();
  ```

- [ ] **Step 5:** Reduced-motion verification.
  - macOS: System Settings → Accessibility → Display → Reduce motion.
  - Or in DevTools: Rendering panel → "Emulate CSS media feature `prefers-reduced-motion`" → reduce.
  - Toggle theme: should flip instantly, no crossfade.
  - Switch between Home and a module: should swap instantly, no shared-element morph.

- [ ] **Step 6:** Mobile drawer.
  - Resize the window <768px.
  - Hamburger appears.
  - Open / close the drawer (backdrop, Escape, swipe-left, picking a module).

- [ ] **Step 7:** Screen reader sanity check (optional but recommended).
  - macOS VoiceOver (Cmd-F5): tab through, verify h1 is the page title, sidebar reads as "Modules and account, Tracker views".
  - Toast announces on save (turn on "Speak status messages").

- [ ] **Step 8:** Stop preview server.

- [ ] **Checkpoint:** Production build verified across themes, breakpoints, motion preferences.

---

### Task 42: Lighthouse audit

**Files:** none (verification)

- [ ] **Step 1:** Restart preview.

  Run: `npm run preview`

- [ ] **Step 2:** Open DevTools → Lighthouse tab → run a "Performance + Accessibility + Best Practices" audit on Mobile.

- [ ] **Step 3:** Record the scores. Targets:
  - Performance ≥ 95
  - Accessibility ≥ 95
  - Best Practices = 100

- [ ] **Step 4:** Address any flagged issues that are easy wins (missing alt text, contrast nits, missing `lang`, etc.). Skip micro-perf chasing if it would cost UX (e.g., removing the serif font).

- [ ] **Step 5:** Stop preview.

- [ ] **Checkpoint:** Lighthouse passes target thresholds.

---

### Task 43: Final smoke test

**Files:** none

- [ ] **Step 1:** `npm run dev`. Walk the entire app once more, both themes. Look at it like a stranger.

- [ ] **Step 2:** Check console for warnings/errors. Address any you can attribute to this redesign.

- [ ] **Step 3:** Stop dev server.

- [ ] **Checkpoint:** Redesign complete.

---

## Self-review notes (for the author of this plan)

- ✅ Spec coverage: every section of the spec maps to a task. Tokens (T1–T3), theme persistence pre-paint (T4), AppShell grid (T9), sidebar (T10–T17), main pane composition (T19, T22, T26, T27), home view (T23–T26), module view (T22), auth gate (T28), toast + undo (T29, T31), view state + hash routing + transitions (T5), drawer (T8), tracker orchestrator (T36), page wiring (T37), cleanup (T39), verification (T38, T41–T43).
- ✅ Placeholder scan: all "implement later" / "TBD" — none.
- ✅ Type consistency: `View` type matches between `view.ts` callers; `Session` from `lib/supabase` reused; `ProgressState` reused; `AuthMode` defined once in `lib/tracker/auth.ts` and imported into `tracker.ts`.
- ⚠️ Known accepted gap: per-chapter collapse is in the spec ("ship without by default") and not implemented in this plan. The Expand All/Collapse All footer buttons mentioned in the spec are intentionally not part of any task — chapters are flat by default per the spec's note. If wanted, add as Task 44 later.
- ⚠️ Note: the `Toast.astro` undo handler attaches a fresh listener via clone-replace each call to avoid duplicate handlers. Slightly hacky but correct; document in code comment if rewriting.
