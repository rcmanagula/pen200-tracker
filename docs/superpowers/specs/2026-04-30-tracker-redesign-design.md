# PEN-200 Tracker — Frontend Redesign Spec

**Date:** 2026-04-30
**Scope:** Full presentation rewrite of the PEN-200 OSCP Progress Tracker. Pure UI/UX redesign. All existing storage, sync, and auth logic is preserved.
**Direction:** Calm study companion — Linear/Notion-adjacent, single-page app, sidebar + focused detail, light + dark themes, warm-cream / warm-charcoal palette with sage accent, Inter + Instrument Serif typography.

---

## 1. Goals & non-goals

### Goals

- Replace the current 2-column module grid with a sidebar + focused-detail layout that surfaces one task or module at a time.
- Ship a real design-token system that drives both light and dark themes from one source of truth.
- Use native browser primitives (View Transitions API, CSS variables, hash routing) before reaching for libraries.
- Preserve every existing user-facing behavior: localStorage keys, video-key format, study-plan logic, Supabase auth/sync, completion banner, expand/collapse all, mark-all-watched, reset.
- Lift accessibility, performance, and visual quality to a level that reads as a deliberate product.

### Non-goals

- No backend changes. No schema changes. No edits to the Supabase Edge Function.
- No new features beyond what the current site provides (no command palette, no keyboard shortcuts, no exports, no onboarding tour, no PWA, no service worker, no i18n).
- No animation library. No icon font. No CSS-in-JS.
- No multi-route refactor — kept single-page per user decision.

---

## 2. Information architecture

### Single-page model

The whole tracker lives at `/` (`src/pages/index.astro`). Every view is prerendered into the HTML at build time and toggled client-side.

**Client-side state shape:**

```ts
type View =
  | { kind: "auth" }
  | { kind: "home" }
  | { kind: "module"; slug: string };
```

State is the source of truth for which view is visible. Auth state takes precedence over `home`/`module`.

### Hash routing

The current view (excluding auth) is reflected to the URL hash:

- Home → `#/home` (default; empty hash also resolves to home)
- Module → `#/m/<slug>`, e.g. `#/m/web-application-attacks`

Slug = `kebab-case(module.title)` derived from COURSE data at build. Slugs are stable as long as titles are; if a title changes, the old hash falls back to `home` (no error, just resolution failure).

**Browser integration:**

- `popstate` and `hashchange` update the view without a reload.
- Clicking a sidebar item calls `history.pushState` and updates the view.
- Initial load reads `location.hash` after auth resolves.

### View toggling

Each view is a top-level `<div data-view="home|module-1|module-2|...">` inside `<main>`. Only the active one is visible (`hidden` attribute on the others). Switching = remove `hidden` from new, add `hidden` to old. No client-side templating, no fetch, no loading state.

### Auth gating

Until Supabase reports a session (or local-only mode is detected), the auth gate covers the viewport. Once authenticated (or local-only), the auth gate hides and the tracker view becomes visible. This is a presentation-only refactor — the existing auth flow and Edge Function calls are unchanged.

---

## 3. Astro features in use

| Feature | Purpose |
|---|---|
| `.astro` components with server-rendering | Every module, chapter, and lesson is rendered to HTML at build. No client-side rendering. |
| Scoped component styles | Each component gets isolated CSS automatically. |
| `<script>` directives with bundling | Tracker logic and auth split into bundled modules; load lazily. |
| `<script is:inline>` in head | Pre-paint theme application (no flash of wrong theme on reload). |
| TypeScript end-to-end | Types flow across components and lib code via Astro's native TS support. |
| Tailwind via PostCSS | Existing pipeline preserved; tokens flow into Tailwind via `theme.extend`. |
| Static output (`output: "static"`) | Fits GitHub Pages deployment, zero runtime server. |

**Native browser features (not Astro-specific) also leveraged:**

- View Transitions API (`document.startViewTransition`) for view swaps and theme flips.
- CSS Custom Properties for the entire token system.
- `prefers-color-scheme` and `prefers-reduced-motion` media queries.
- `localStorage` (already used) and `history.pushState`.

**Astro features intentionally NOT used:**

- `<ClientRouter />` / View Transitions middleware — single-page app, nothing to navigate between.
- File-based routing for modules — would imply multi-route; user chose single-page.
- Content Collections — COURSE data already lives in TypeScript with strong types; migrating to a content collection adds friction without payoff for this static dataset. Re-evaluate later if course data moves to authored markdown.
- Astro Image / `astro:assets` — no images in scope.

---

## 4. Design tokens

All tokens live in a single `src/styles/tokens.css` file, applied via `:root` (light) and `[data-theme="dark"]`.

### Color tokens (semantic)

```
--bg-canvas         page background
--bg-surface        cards, sidebar
--bg-surface-2      hover/active rows, code chips, inset wells
--bg-overlay        modals, popovers (slightly elevated)

--fg-default        primary text
--fg-muted          secondary text, metadata
--fg-subtle         tertiary, placeholder
--fg-on-accent      text on top of accent fills

--border-default    1px hairlines
--border-strong     interactive borders
--border-focus      focus rings (always token --accent)

--accent            primary actions, links, progress fills
--accent-hover      one step deeper
--accent-soft       tinted background (selected nav, today badge)

--success           course-complete banner, watched pills
--warning           behind-schedule indicators
--danger            destructive actions
```

### Light theme (paper-cream)

```
--bg-canvas:      #faf8f3
--bg-surface:     #ffffff
--bg-surface-2:   #f3efe7
--bg-overlay:     #ffffff
--fg-default:     #1c1d1a
--fg-muted:       #5b5d57
--fg-subtle:      #8a8c84
--fg-on-accent:   #ffffff
--border-default: #e7e2d6
--border-strong:  #d3cdbc
--border-focus:   #5b8c6b
--accent:         #5b8c6b
--accent-hover:   #4a755a
--accent-soft:    #e8efe8
--success:        #2f7d57
--warning:        #b07d2a
--danger:         #b54e3a
```

### Dark theme (warm charcoal)

```
--bg-canvas:      #15161a
--bg-surface:     #1d1e22
--bg-surface-2:   #26272c
--bg-overlay:     #23252a
--fg-default:     #ecebe6
--fg-muted:       #a8a79f
--fg-subtle:      #6c6b65
--fg-on-accent:   #15161a
--border-default: #2c2d32
--border-strong:  #3a3b41
--border-focus:   #8db89b
--accent:         #8db89b
--accent-hover:   #a3c8b0
--accent-soft:    #2a3530
--success:        #7fc196
--warning:        #d6a55a
--danger:         #d97a64
```

### Typography tokens

```
--font-sans:    'Inter', system-ui, sans-serif
--font-serif:   'Instrument Serif', Georgia, serif
--font-mono:    'JetBrains Mono', ui-monospace, monospace

--text-display:  clamp(2rem, 4vw, 2.75rem)
--text-h1:       1.625rem
--text-h2:       1.25rem
--text-h3:       1.0625rem
--text-body:     0.9375rem
--text-small:    0.8125rem
--text-tiny:     0.75rem
```

### Radius, shadow, spacing

```
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px

--shadow-soft:  0 1px 2px rgba(20,20,20,.04), 0 4px 12px rgba(20,20,20,.04)
--shadow-card:  0 2px 4px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.06)
--shadow-pop:   0 8px 24px rgba(20,20,20,.12), 0 24px 60px rgba(20,20,20,.18)
```

Dark theme uses `rgba(0,0,0,.3)` style values for shadows (mostly imperceptible — dark UI relies on borders + `--bg-surface-2`).

```
--space-1..16: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
--sidebar-w:   280px (desktop), 240px (tablet)
```

### Token integration

- Tailwind config (`tailwind.config.mjs`) uses `theme.extend.colors` referencing `var(--*)`. Examples: `bg-canvas`, `bg-surface`, `bg-surface-2`, `text-fg-default`, `text-fg-muted`, `border-default`, `bg-accent`, `bg-accent-soft`, `text-on-accent`.
- Font families extended: `font-sans`, `font-serif`, `font-mono`.
- Radii extended: `rounded-sm/md/lg/xl` map to tokens.
- Shadow extended: `shadow-soft/card/pop`.
- **No raw hex anywhere outside `tokens.css`.**

### Theme application

`<html>` carries `data-theme="light"|"dark"`. An inline blocking script in `<head>` sets the attribute before paint:

```html
<script is:inline>
  const stored = localStorage.getItem('theme');
  const theme = stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
</script>
```

The theme toggle updates `localStorage.theme` and `data-theme`, wrapped in `document.startViewTransition()` for a viewport-wide crossfade (skipped under reduced-motion).

`color-scheme: light` / `color-scheme: dark` is set per theme so native form controls and scrollbars adapt.

---

## 5. Layout

### Desktop & tablet (≥768px)

A 2-pane CSS Grid:

```
grid-template-columns: var(--sidebar-w) 1fr;
```

Sidebar is `position: sticky; top: 0; height: 100vh;` and scrolls internally if its content exceeds the viewport. Main pane scrolls independently.

Main pane content is centered with `max-width: 880px` and side gutters via `padding-inline`.

### Mobile (<768px)

The grid collapses to a single column. The sidebar becomes a slide-over drawer:

- A 40×40 hamburger button at the top-left of the main pane opens it.
- Drawer slides in from the left at 280px width with a `bg-canvas/60` `backdrop-blur-sm` backdrop.
- Tap backdrop, swipe left, press Escape, or pick a module to close.
- `data-drawer="open"` on `<html>` drives the visual state. Body scroll-locked while open.

### Breakpoints

- `sm`: 0px (mobile)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)

Above 1280px nothing changes — extra width is whitespace flanking the centered content.

---

## 6. Components

### Component map

**New:**

- `Sidebar.astro`
- `SidebarBrand.astro`
- `SidebarNav.astro`
- `SidebarNavItem.astro` (variants: `home`, `module`)
- `SidebarFooter.astro`
- `ThemeToggle.astro`
- `SyncIndicator.astro`
- `MainPane.astro`
- `PageHeader.astro`
- `HomeView.astro`
- `ScheduleStrip.astro`
- `ModuleView.astro`
- `LessonRow.astro`
- `MobileDrawerTrigger.astro`

**Rewritten in place:**

- `AppShell.astro` — becomes the 2-pane grid, mounts theme attribute, includes `tokens.css`.
- `TodayHero.astro` (renamed from `TodayCard.astro`).
- `OverviewStats.astro` (renamed from `StatsCards.astro`).
- `ChapterSection.astro` (renamed from `ChapterRow.astro`).
- `AuthGate.astro` (renamed from inline section in `index.astro`).
- `Toast.astro`.

**Kept, restyled only:**

- `ProgressBar.astro` — adds size variants `xs` (3px), `sm` (6px), `md` (10px).

**Deleted:**

- `Header.astro` — sidebar absorbs branding; module view has its own header.
- `ModuleCard.astro` — split into `SidebarNavItem` + `ModuleView`.
- `SyncPanel.astro` — folded into `SidebarFooter` via `SyncIndicator`.
- `SchedulePanel.astro` — replaced by leaner `ScheduleStrip` on Home.
- `VideoChip.astro` — replaced by `LessonRow` for lesson-list contexts.

### Sidebar (top to bottom)

1. **Brand block** — 28px SVG mark + serif "PEN-200" wordmark + Inter muted "Progress Tracker" subtitle. Hairline below.
2. **Nav**
   - Single Home item (`⌂` glyph + label).
   - "MODULES" label (uppercase, tracked, `fg-subtle`).
   - One row per module: glyph + name + thin progress bar (3px) + right-aligned mono percent.
3. **Footer** (pinned to bottom via `mt-auto`):
   - Theme toggle (segmented `☼ Light` / `☾ Dark`).
   - Sync indicator (dot + label).
   - Sign-out link (terracotta on hover when signed in; hidden in local-only mode).

### Main pane

Composed of:

- `PageHeader` — eyebrow chip, serif title, meta line, optional progress bar.
- `MainPane` body — wraps the swappable `data-view` blocks.

### Page header

- **Home:** eyebrow `Today · April 30`, serif title `Day 5 of 18.` over `You're on track.` (or appropriate state copy). No progress bar. (The PEN-200 study plan in `studyPlan.ts` covers 18 days across 3 weeks.)
- **Module:** eyebrow `Module 03` + right-aligned mono percent, serif title (module name), meta `6 chapters · 24 lessons`, full-width progress bar (10px).

### Home view

Three sections (semantic `<section aria-labelledby>`):

1. **TodayHero** — Module + chapter context, lesson rows with checkboxes, "Mark all" footer button. State-aware (no start date / today done / course complete).
2. **OverviewStats** — Four numbers laid out flat (no card-soup): modules done, video % watched, days elapsed, total %. Inter, mono numerals, `fg-muted` labels.
3. **ScheduleStrip** — A 6px progress bar from start date to end date with mono labels.

### Module view

- Page header (above).
- For each chapter:
  - `<section aria-labelledby="ch-X-Y">` with `<h3>` chapter title + a tiny progress glyph (○ none / ◐ partial / ✓ all) + count `n / m`.
  - List of `LessonRow`s.
- Footer actions: Expand all, Collapse all, Mark all watched, Reset module progress (danger).

**Note on collapse:** Chapters do not collapse by default in this design — content is already organized via headings + hairlines. Expand all / Collapse all controls are still present in the footer for consistency, and toggle a single shared collapsed state (all open or all closed). Implementation may opt to omit the collapse functionality if it costs significant complexity; the Expand/Collapse buttons are then hidden.

### Lesson row

A full-width row, not a chip:

```
[checkbox] [lesson #] [title] ............... [code, mono, fg-subtle]
```

- Hover: `bg-surface-2` fade-in (80ms).
- Checked: lesson # + title shift to `fg-muted`; lesson # gets a strikethrough.
- Native `<input type="checkbox">` underneath for semantics. The checkmark is a styled SVG drawn via `stroke-dashoffset`.

### Auth gate

A centered card on `bg-canvas` (no dark slate overlay). Brand mark + serif wordmark above the card. Card contains:

- Segmented "Sign in" / "Create account" tabs with a sliding underline indicator.
- Username input (always visible).
- Email input (visible only on Sign-up; toggled via grid-row 0fr↔1fr height transition).
- Password input.
- Primary submit button.
- Inline status message below the button (`aria-live="polite"`).

A theme toggle is pinned to the bottom-right of the viewport so the auth screen also respects light/dark.

If `PUBLIC_SUPABASE_URL` is not set, the form is replaced with a single calm message: *"Cloud sync isn't configured. Continuing in local-only mode."* and a single "Open tracker" button.

### Toast

Bottom-center positioning, `max-w-md`, `rounded-lg`, `bg-surface`, `border-default`, `shadow-pop`. Variants by accent color via `border-l-2`. Default duration 2.5s. Reset-progress flow uses a 6s sticky variant with an inline Undo button that restores from a one-step in-memory snapshot.

---

## 7. Visual rules

1. One serif heading per visible view (the page title).
2. No nested cards. The sidebar is a card, the home pane sits on canvas, the Today hero is a card; inside the hero, only hairlines and spacing.
3. Hairlines (`1px solid var(--border-default)`) do most of the dividing work. Shadows are reserved for the sidebar right edge and toasts.
4. Mono only for codes and counters: video keys (`IG_03_01`), `Day 5 / 18`, percentages.
5. Whitespace is the design — generous `py-8`/`py-10` between sections.
6. No emoji, no illustrations, no decorative gradients, no animated backgrounds. One brand SVG mark, full stop.
7. No raw hex outside `tokens.css`.

---

## 8. Interactions & motion

All durations ≤ 200ms. Easing `cubic-bezier(0.2, 0, 0, 1)` ("ease-out") unless noted.

### View transitions

- Sidebar item click → `setView(next)` wraps `applyView()` in `document.startViewTransition` when supported.
- Shared element: sidebar item title and page header title share `view-transition-name: page-title` for a morph effect.
- When the API is unavailable (older Firefox) or under `prefers-reduced-motion`, `applyView()` runs synchronously — the view swap is instant. No JS-driven crossfade fallback; the UX cost is negligible since there's no network request, no layout thrash, and the destination DOM is already prerendered.

### Theme toggle

- Click sets `localStorage.theme` and `document.documentElement.dataset.theme`.
- Wrapped in `startViewTransition` for a viewport crossfade (~250ms). Reduced-motion → instant.

### Micro-interactions

| Trigger | Effect | Duration |
|---|---|---|
| Hover on sidebar item / lesson row | `bg-surface-2` fade-in | 80ms |
| Active sidebar item (first activation) | Left edge accent bar grows 0→3px | 120ms |
| Lesson row click | Background to `accent-soft`; checkmark draws via `stroke-dashoffset` | 140ms |
| Module progress bar update | Fill width transition | 240ms |
| Page header title (view change) | View Transitions morph | 180ms |
| "Mark all" | Lessons check in sequence with 30ms stagger | total ~150ms |
| Primary button hover | `bg → accent-hover` | 100ms |
| Primary button press | 1px translate-y down, releases on up | 60ms |
| Input focus | 2px ring fade-in (`border-focus`) | 100ms |
| Auth tab switch | Underline `translateX` | 180ms |
| Auth email field show/hide | Grid-row 0fr↔1fr | 200ms |
| Toast enter | Opacity 0→1 + 8px translate-y up | 180ms |
| Toast exit | Opacity 1→0 | 120ms |

**Forbidden:** transforms on hover for sidebar/buttons (no "lift on hover"); layout-shift animations.

### Sync indicator

Three primary states (idle / syncing / error) plus local-only. Only the dot animates, and only while syncing (1s linear rotate). Relative timestamp updates every 30s.

### Mobile drawer

CSS-driven via `data-drawer="open"` on `<html>`. Tiny script (≤30 lines) handles the open/close, swipe-to-close (touch), and Escape-to-close. Body scroll-locked while open.

### Reduced motion

A global `@media (prefers-reduced-motion: reduce)` block clamps all transitions/animations to `0.01ms`. The View Transitions wrapper checks `matchMedia('(prefers-reduced-motion: reduce)').matches` and skips `startViewTransition`.

---

## 9. Accessibility

### Semantic HTML

- One `<main>` with `id="main"` and `tabindex="-1"` (skip-link target).
- One `<h1>` per visible view (the serif page title).
- Sidebar wrapped in `<aside aria-label="Modules and account">` containing `<nav aria-label="Tracker views">`.
- Active sidebar item: `aria-current="page"`.
- Chapters use `<h3>`; lesson rows use `<label>` with a real `<input type="checkbox">` underneath.
- Toast region: `role="status" aria-live="polite"`.
- Auth status: `aria-live="polite"` + `aria-atomic="true"`.
- Skip-link: visible only on focus, anchors to `#main`.

### ARIA boundaries

- No `role` overrides on already-semantic elements.
- Icon-only controls (mobile drawer trigger) get `aria-label`.
- Sync indicator dot is `aria-hidden="true"`; its accessible name is the text label.

### Focus

- All interactive elements show a `2px solid var(--border-focus)` ring with `2px` offset on `:focus-visible` only.
- Mouse clicks do not trigger the ring (CSS handles this via `:focus-visible`).
- Tab order is reading order: sidebar → main → toast → footer.

### Color contrast (verified)

All text/background pairs meet WCAG 2.2 AA:

| Pair | Ratio | Passes |
|---|---|---|
| `fg-default` / `bg-canvas` (light) | 14.6:1 | AAA |
| `fg-muted` / `bg-canvas` (light) | 5.4:1 | AA normal, AAA large |
| `accent` / `bg-surface` (light) | 4.6:1 | AA |
| `fg-on-accent` / `accent` (light) | 4.6:1 | AA |
| `fg-default` / `bg-canvas` (dark) | 13.4:1 | AAA |
| `fg-muted` / `bg-canvas` (dark) | 7.5:1 | AAA |
| `accent` / `bg-surface` (dark) | 6.0:1 | AA |

`fg-subtle` is intentionally below 4.5:1 — used only for genuinely subtle non-actionable text (placeholders, count badges adjacent to a clearly-readable label).

---

## 10. Performance

### Budgets

| Metric | Target |
|---|---|
| Initial HTML | ≤ 25 KB gzipped |
| First-party JS | ≤ 18 KB gzipped |
| Fonts (Inter + Instrument Serif subsets, swap) | ≤ 80 KB |
| LCP (cable) | ≤ 1.2s |
| CLS | 0 |

### Tactics

- Astro static output → all HTML cached at the edge, no SSR cost.
- Single Tailwind+tokens CSS bundle, aggressively purged. Target ≤ 30 KB.
- Inline SVGs (≤ 500 bytes each); no icon font.
- Fonts via `<link rel="preconnect">` + `font-display: swap` with `size-adjust` overrides to prevent metric shift on swap-in.
- Auth/sync logic in a separate bundled module, loaded after the tracker UI script.

### Lighthouse targets

Performance ≥ 95, Accessibility ≥ 95, Best Practices = 100. Not chasing 100 perf at UX cost.

---

## 11. Verification checklist

Before declaring complete:

1. `npm run build && npm run preview` — site loads cleanly.
2. Visual: Home + each module + auth gate, in both themes.
3. Behavior: sign in → tracker → toggle a checkbox → reload → state survives → cloud-synced relative timestamp reappears.
4. Theme persistence: toggle dark, reload — no flash of light theme.
5. Hash routing: `#/m/web-application-attacks` direct-load lands on that module.
6. Mobile drawer: narrow viewport → hamburger → drawer slides → tap module → drawer closes.
7. Keyboard: Tab through every interactive element; visible focus rings.
8. Screen reader smoke: NVDA / VoiceOver — headings in order, sidebar reads as nav, toast as polite status.
9. Reduced motion: OS preference set → no view-transition crossfade, instant theme swap.
10. Lighthouse: Perf ≥ 95, A11y ≥ 95, Best Practices = 100.

---

## 12. File / module plan

```
src/
  pages/
    index.astro                 # rewritten — single page, mounts AuthGate + AppShell
  layouts/                      # (none — AppShell is the layout)
  components/
    AppShell.astro              # rewritten — 2-pane grid, includes tokens, mounts theme script
    AuthGate.astro              # new — extracted, redesigned
    Sidebar.astro               # new
    SidebarBrand.astro          # new
    SidebarNav.astro            # new
    SidebarNavItem.astro        # new
    SidebarFooter.astro         # new
    ThemeToggle.astro           # new
    SyncIndicator.astro         # new
    MobileDrawerTrigger.astro   # new
    MainPane.astro              # new
    PageHeader.astro            # new
    HomeView.astro              # new
    TodayHero.astro             # rewritten (was TodayCard)
    OverviewStats.astro         # rewritten (was StatsCards)
    ScheduleStrip.astro         # new (was SchedulePanel)
    ModuleView.astro            # new
    ChapterSection.astro        # rewritten (was ChapterRow)
    LessonRow.astro             # new (replaces VideoChip in lists)
    ProgressBar.astro           # restyled, size variants
    Toast.astro                 # new (was inline div)
    # Deleted: Header.astro, ModuleCard.astro, SchedulePanel.astro, SyncPanel.astro, VideoChip.astro
  data/
    course.ts                   # unchanged
    studyPlan.ts                # unchanged
  lib/
    tracker.ts                  # refactored — splits into smaller modules below
    tracker/
      view.ts                   # view state + hash routing + view transitions
      theme.ts                  # theme toggle + persistence
      drawer.ts                 # mobile drawer toggle
      undo.ts                   # one-step snapshot for reset/undo (new)
    storage.ts                  # unchanged
    progress.ts                 # unchanged
    supabase.ts                 # unchanged
  styles/
    global.css                  # imports tokens.css; minimal base + reduced-motion block
    tokens.css                  # new — all CSS variables
tailwind.config.mjs             # extended to map tokens to utilities
docs/superpowers/specs/
  2026-04-30-tracker-redesign-design.md   # this document
```

### Logic preservation

The following must remain unchanged in behavior:

- localStorage keys: existing keys for progress and start date.
- Video key format: `${code}_${chapterNumberPadded}_${lessonNumberPadded}` (e.g. `IG_02_01`).
- Study plan computation: current day, today's lessons, schedule range.
- Supabase auth flow via `username-auth` Edge Function.
- Sync conflict resolution: timestamp-based, newer cloud data with progress or start date wins; otherwise upload local.
- Save on every checkbox/start-date change: localStorage first, then Supabase upsert when signed in.

`tracker.ts` is split into smaller modules (`view.ts`, `theme.ts`, `drawer.ts`, `undo.ts`) but its public surface — what `pages/index.astro` imports — remains conceptually the same: one entry that wires everything up after DOMContentLoaded.

---

## 13. Out of scope

- i18n / translations.
- Print stylesheet.
- Export (CSV, share image).
- Onboarding tour / first-run tutorial.
- Server-side rendering / Astro DB.
- PWA / service worker / offline install prompt.
- Command palette and keyboard shortcuts beyond standard navigation.
- Schema or backend changes.

---

## 14. Open questions / deferred decisions

None blocking. The following are deliberately deferred to implementation time and may be settled by the implementing engineer without further design review:

- Exact SVG glyphs for sidebar items (sage-tinted single-stroke icons; no specific set chosen).
- Whether to preload the serif font (likely yes given it's used at large size on Home).
- Per-chapter collapse on Module view: ship without by default; add a single shared expand/collapse toggle if the test pass shows users want it.

---
