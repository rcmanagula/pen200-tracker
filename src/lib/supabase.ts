import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { ProgressState } from "@/lib/progress";

export const TRACKER_NAME = "pen200";

export type TrackerProgressRecord = {
  progress: ProgressState | null;
  start_date: string | null;
  updated_at: string | null;
};

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url
    && anonKey
    && !String(url).includes("PASTE_")
    && !String(anonKey).includes("PASTE_"),
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  return client;
}

export type { Session };
