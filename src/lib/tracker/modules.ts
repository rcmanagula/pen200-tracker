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
