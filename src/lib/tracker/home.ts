import { COURSE } from "@/data/course";
import { STUDY_PLAN } from "@/data/studyPlan";
import {
  calculateStats,
  currentStudyDay,
  isDayDone,
  videoKey,
  type ProgressState,
} from "@/lib/progress";

export type HomeContext = {
  progress: ProgressState;
  startDate: string;
};

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
    if (complete) complete.hidden = false;
    if (status) status.textContent = "100% complete";
    return;
  }

  if (day === null) {
    if (empty) empty.hidden = false;
    if (status) status.textContent = "";
    const startInput = document.getElementById("startDateInput") as HTMLInputElement | null;
    if (startInput) startInput.value = ctx.startDate || "";
    return;
  }

  const plan = STUDY_PLAN.find((entry) => entry.day === day);
  if (!plan) {
    if (empty) empty.hidden = false;
    return;
  }

  if (content) content.hidden = false;
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
    meta.textContent = done
      ? "Today's plan complete."
      : `${plan.estHours > 0 ? `~${plan.estHours}h` : "Review"} · ${plan.modules.length} module${plan.modules.length === 1 ? "" : "s"}`;
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
