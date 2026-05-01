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
