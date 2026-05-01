import { getSupabaseClient, type Session } from "@/lib/supabase";
import type { ProgressState } from "@/lib/progress";

type SyncState = "off" | "ok" | "syncing" | "warn" | "error";

export function setSyncState(state: SyncState, label?: string): void {
  const root = document.getElementById("syncStatus");
  if (!root) return;
  root.dataset.syncState = state;
  const labelEl = root.querySelector<HTMLElement>("[data-sync-label]");
  if (labelEl && label !== undefined) labelEl.textContent = label;
}

export type CloudSnapshot = {
  progress: ProgressState;
  startDate: string;
  updatedAt: string;
};

export async function loadCloud(session: Session, trackerName: string): Promise<CloudSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("tracker_progress")
    .select("progress,start_date,updated_at")
    .eq("user_id", session.user.id)
    .eq("tracker_name", trackerName)
    .maybeSingle();
  if (error) return null;
  if (!data) {
    return {
      progress: {},
      startDate: "",
      updatedAt: "",
    };
  }
  return {
    progress: (data.progress as ProgressState) ?? {},
    startDate: data.start_date ?? "",
    updatedAt: data.updated_at ?? "",
  };
}

export async function saveCloud(
  session: Session,
  progress: ProgressState,
  startDate: string,
  trackerName: string
): Promise<{ ok: boolean; updatedAt?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false };
  const updatedAt = new Date().toISOString();
  const { error } = await client.from("tracker_progress").upsert({
    user_id: session.user.id,
    tracker_name: trackerName,
    progress,
    start_date: startDate || null,
    updated_at: updatedAt,
  }, { onConflict: "user_id,tracker_name" });
  if (error) return { ok: false };
  return { ok: true, updatedAt };
}
