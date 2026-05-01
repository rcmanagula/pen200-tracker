import { createClient } from "jsr:@supabase/supabase-js@2";

type AuthAction = "check-username" | "sign-in" | "sign-up";

type AuthRequest = {
  action?: AuthAction;
  username?: string;
  email?: string;
  password?: string;
  redirectTo?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let payload: AuthRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const action = payload.action;
  const username = String(payload.username ?? "").trim();
  const usernameNormalized = normalizeUsername(username);
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  const origin = request.headers.get("origin") ?? "";
  const redirectTo = String(payload.redirectTo ?? "");

  if (action !== "check-username" && action !== "sign-in" && action !== "sign-up") {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  if (!usernamePattern.test(username)) {
    return jsonResponse({ error: "Username must be 3-24 characters and use only letters, numbers, or underscores." }, 400);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "check-username") {
    const { data: existingProfile, error: lookupError } = await service
      .from("user_profiles")
      .select("user_id")
      .eq("username_normalized", usernameNormalized)
      .maybeSingle();

    if (lookupError) {
      console.error("Username availability lookup failed:", lookupError);
      return jsonResponse({ ok: false, error: "Unable to check username right now." });
    }

    return jsonResponse({
      ok: true,
      available: !existingProfile,
    });
  }

  if (password.length < 8) {
    return jsonResponse({ error: "Password must be at least 8 characters." }, 400);
  }

  if (action === "sign-up") {
    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: "Enter a valid email address." });
    }

    const safeRedirectTo = redirectTo && origin && redirectTo.startsWith(origin)
      ? redirectTo
      : origin || undefined;

    const { data: existingProfile, error: lookupError } = await service
      .from("user_profiles")
      .select("user_id")
      .eq("username_normalized", usernameNormalized)
      .maybeSingle();

    if (lookupError) {
      console.error("Username lookup failed:", lookupError);
      return jsonResponse({ error: "Unable to create account right now." }, 500);
    }

    if (existingProfile) {
      return jsonResponse({ ok: false, error: "Username is unavailable." });
    }

    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: safeRedirectTo,
      },
    });

    if (signUpError || !signUpData.user) {
      console.error("Sign-up failed:", signUpError);
      if (signUpError?.status === 429 || signUpError?.message?.toLowerCase().includes("rate limit")) {
        return jsonResponse({ ok: false, error: "Too many confirmation emails were sent. Wait a few minutes, then try again." });
      }
      return jsonResponse({ ok: false, error: "Unable to create account with those details." });
    }

    if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      return jsonResponse({ ok: false, error: "Unable to create account with those details." });
    }

    const { error: profileError } = await service
      .from("user_profiles")
      .insert({
        user_id: signUpData.user.id,
        username,
      });

    if (profileError) {
      console.error("Profile insert failed:", profileError);
      await service.auth.admin.deleteUser(signUpData.user.id);
      return jsonResponse({ ok: false, error: "Username is unavailable." });
    }

    return jsonResponse({
      ok: true,
      session: signUpData.session,
      user: signUpData.user,
      username,
      needsConfirmation: !signUpData.session,
    });
  }

  const genericAuthError = { ok: false, error: "Sign-in failed. Check your username and password." };

  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .select("user_id, username")
    .eq("username_normalized", usernameNormalized)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup failed:", profileError);
    return jsonResponse(genericAuthError);
  }

  if (!profile) {
    return jsonResponse(genericAuthError);
  }

  const { data: userData, error: userError } = await service.auth.admin.getUserById(profile.user_id);
  const userEmail = userData.user?.email;
  if (userError || !userEmail) {
    console.error("User lookup failed:", userError);
    return jsonResponse(genericAuthError);
  }

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: userEmail,
    password,
  });

  if (signInError || !signInData.session) {
    return jsonResponse(genericAuthError);
  }

  return jsonResponse({
    ok: true,
    session: signInData.session,
    user: signInData.user,
    username: profile.username,
  });
});
