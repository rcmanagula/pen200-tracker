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
