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
  const eyebrowRight = card.querySelector<HTMLElement>("header .font-mono");
  setText(eyebrowRight, `${counts.percent}%`);
  const bar = document.getElementById(`bar-${module.code.toLowerCase()}`);
  if (bar) bar.style.width = `${counts.percent}%`;
}

export function refreshAllModules(progress: ProgressState): void {
  COURSE.forEach((module) => {
    refreshChapter(module, progress);
    refreshModuleHeader(module, progress);
  });
}
