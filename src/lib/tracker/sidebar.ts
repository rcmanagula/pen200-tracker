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
