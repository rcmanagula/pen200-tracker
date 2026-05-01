import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";

export type AuthMode = "sign-in" | "sign-up";

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username);
}

export type UsernameAuthResponse = {
  ok?: boolean;
  session?: Session | null;
  username?: string;
  needsConfirmation?: boolean;
  error?: string;
  available?: boolean;
};

export async function checkUsername(username: string): Promise<{ ok: boolean; available: boolean }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client) return { ok: false, available: false };
  const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
    body: { action: "check-username", username },
  });
  if (error || data?.ok === false) return { ok: false, available: false };
  return { ok: true, available: Boolean(data?.available) };
}

export async function signIn(username: string, password: string): Promise<UsernameAuthResponse | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
    body: { action: "sign-in", username, password },
  });
  if (error) return { ok: false, error: error.message };
  return data ?? null;
}

export async function signUp(username: string, email: string, password: string): Promise<UsernameAuthResponse | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const redirectTo = window.location.href.split("#")[0];
  const { data, error } = await client.functions.invoke<UsernameAuthResponse>("username-auth", {
    body: { action: "sign-up", username, email, password, redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return data ?? null;
}
