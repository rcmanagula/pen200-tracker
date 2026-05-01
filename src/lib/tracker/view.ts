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
