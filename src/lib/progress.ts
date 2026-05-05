import type { Chapter, CourseModule } from "@/data/course";
import type { StudyDay } from "@/data/studyPlan";

export type ProgressState = Record<string, boolean>;

export type LessonItem = {
  num: number;
  available: boolean;
};

export type TrackerStats = {
  watched: number;
  totalAvailable: number;
  modulesDone: number;
  percent: number;
};

export function videoKey(code: string, chapterNumber: number, lessonNumber: number): string {
  return `${code}_${String(chapterNumber).padStart(2, "0")}_${String(lessonNumber).padStart(2, "0")}`;
}

export function getOrderedLessonItems(chapter: Chapter): LessonItem[] {
  const lessons = chapter.lessons.map((num) => ({ num, available: true }));
  const missing = (chapter.missing ?? []).map((num) => ({ num, available: false }));

  return [...lessons, ...missing].sort((a, b) => a.num - b.num);
}

export function isModuleComplete(module: CourseModule, progress: ProgressState): boolean {
  const total = module.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  if (total === 0) return false;

  const watched = module.chapters.reduce((sum, chapter) => {
    return sum + chapter.lessons.filter((lesson) => progress[videoKey(module.code, chapter.num, lesson)]).length;
  }, 0);

  return watched === total;
}

export function moduleCounts(module: CourseModule, progress: ProgressState): { watched: number; total: number; percent: number } {
  const total = module.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  const watched = module.chapters.reduce((sum, chapter) => {
    return sum + chapter.lessons.filter((lesson) => progress[videoKey(module.code, chapter.num, lesson)]).length;
  }, 0);
  const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
  return { watched, total, percent };
}

export function chapterCounts(module: CourseModule, chapter: Chapter, progress: ProgressState): { watched: number; total: number } {
  return {
    total: chapter.lessons.length,
    watched: chapter.lessons.filter((lesson) => progress[videoKey(module.code, chapter.num, lesson)]).length,
  };
}

export function fmtSecDuration(seconds: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function fmtMinDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

export function chapterTotalSeconds(chapter: Chapter): number {
  return (chapter.durations ?? []).reduce((sum, d) => sum + d, 0);
}

export function moduleTotalSeconds(module: CourseModule): number {
  return module.chapters.reduce((sum, ch) => sum + chapterTotalSeconds(ch), 0);
}

export function courseTotalSeconds(course: CourseModule[]): number {
  return course.reduce((sum, mod) => sum + moduleTotalSeconds(mod), 0);
}

export function watchedSeconds(course: CourseModule[], progress: ProgressState): number {
  let total = 0;
  course.forEach((mod) => {
    mod.chapters.forEach((ch) => {
      ch.lessons.forEach((lesson, idx) => {
        if (progress[videoKey(mod.code, ch.num, lesson)]) {
          total += ch.durations?.[idx] ?? 0;
        }
      });
    });
  });
  return total;
}

export function watchedModuleSeconds(module: CourseModule, progress: ProgressState): number {
  let total = 0;
  module.chapters.forEach((ch) => {
    ch.lessons.forEach((lesson, idx) => {
      if (progress[videoKey(module.code, ch.num, lesson)]) {
        total += ch.durations?.[idx] ?? 0;
      }
    });
  });
  return total;
}

export function calculateStats(course: CourseModule[], progress: ProgressState): TrackerStats {
  let watched = 0;
  let totalAvailable = 0;
  let modulesDone = 0;

  course.forEach((module) => {
    const counts = moduleCounts(module, progress);
    watched += counts.watched;
    totalAvailable += counts.total;
    if (counts.total > 0 && counts.watched === counts.total) modulesDone += 1;
  });

  return {
    watched,
    totalAvailable,
    modulesDone,
    percent: totalAvailable > 0 ? Math.round((watched / totalAvailable) * 100) : 0,
  };
}

function parseLocalDate(dateValue: string): Date | null {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function currentStudyDay(startDate: string, todayDate = new Date()): number | null {
  const start = parseLocalDate(startDate);
  if (!start) return null;

  const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  return diff >= 1 ? Math.min(diff, 18) : 1;
}

export function isDayDone(dayEntry: StudyDay, course: CourseModule[], progress: ProgressState): boolean {
  if (dayEntry.isReview || dayEntry.isFinal) return false;
  return dayEntry.modules.length > 0
    && dayEntry.modules.every((code) => {
      const module = course.find((item) => item.code === code);
      return Boolean(module && isModuleComplete(module, progress));
    });
}
