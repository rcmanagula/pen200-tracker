import type { ProgressState } from "@/lib/progress";

export const STORAGE_KEY = "pen200_progress_v2";
export const STARTDATE_KEY = "pen200_startdate";
export const UPDATED_AT_KEY = "pen200_updated_at";
export const LAST_SYNCED_KEY = "pen200_last_synced";

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as ProgressState : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function loadStartDate(): string {
  return localStorage.getItem(STARTDATE_KEY) || "";
}

export function saveStartDate(startDate: string): void {
  localStorage.setItem(STARTDATE_KEY, startDate);
}

export function loadLocalUpdatedAt(): string {
  return localStorage.getItem(UPDATED_AT_KEY) || "";
}

export function touchLocalTimestamp(updatedAt = new Date().toISOString()): string {
  localStorage.setItem(UPDATED_AT_KEY, updatedAt);
  return updatedAt;
}

export function loadLastSynced(): string {
  return localStorage.getItem(LAST_SYNCED_KEY) || "";
}

export function saveLastSynced(updatedAt: string): void {
  localStorage.setItem(LAST_SYNCED_KEY, updatedAt);
}
