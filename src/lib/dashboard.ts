import { COURSES } from "@/data/courses";
import type { ProgressState } from "@/lib/progress";
import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";
import { checkUsername, isValidUsername, signIn, signUp, type AuthMode } from "@/lib/tracker/auth";
import { showToast } from "@/lib/tracker/toast";

type ProgressRow = {
  tracker_name: string;
  progress: ProgressState | null;
  updated_at: string | null;
};

let authMode: AuthMode = "sign-in";
let usernameAvailable: boolean | null = null;
let usernameTimer: ReturnType<typeof setTimeout> | null = null;
let dashboardHydrated = false;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function countComplete(progress: ProgressState): number {
  return Object.values(progress).filter(Boolean).length;
}

function setText(id: string, text: string): void {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function setAuthStatus(message: string): void {
  setText("authGateStatus", message);
}

function setUsernameStatus(message: string): void {
  setText("authUsernameStatus", message);
}

function showAuth(show: boolean): void {
  const gate = document.getElementById("authGate");
  const dashboard = document.getElementById("dashboardApp");
  if (gate) gate.classList.toggle("hidden", !show);
  if (dashboard) dashboard.classList.toggle("hidden", show);
  document.body.classList.toggle("overflow-hidden", show);
}

function renderCourseProgress(courseId: string, done: number, total: number, updatedAt: string | null): void {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const percentEl = document.querySelector<HTMLElement>(`[data-course-percent="${courseId}"]`);
  const doneEl = document.querySelector<HTMLElement>(`[data-course-done="${courseId}"]`);
  const barEl = document.querySelector<HTMLElement>(`[data-course-bar="${courseId}"]`);
  const lastEl = document.querySelector<HTMLElement>(`[data-course-last="${courseId}"]`);

  if (percentEl) percentEl.textContent = `${percent}%`;
  if (doneEl) doneEl.textContent = `${done} / ${total}`;
  if (barEl) barEl.style.width = `${percent}%`;
  if (lastEl) lastEl.textContent = updatedAt ? `Last: ${formatDate(updatedAt)}` : "No activity";
}

function renderGreeting(session: Session): void {
  const displayName =
    (typeof session.user.user_metadata?.username === "string" && session.user.user_metadata.username)
    || session.user.email
    || "there";
  const greeting = document.getElementById("dashGreeting");
  const signOut = document.getElementById("dashSignOut");

  if (greeting) {
    greeting.textContent = `Hi, ${displayName}`;
    greeting.classList.remove("hidden");
  }
  if (signOut) signOut.classList.remove("hidden");
}

async function hydrateDashboard(session: Session): Promise<void> {
  if (dashboardHydrated) return;
  dashboardHydrated = true;
  const client = getSupabaseClient();
  if (!client) return;

  renderGreeting(session);
  showAuth(false);

  const { data, error } = await client
    .from("tracker_progress")
    .select("tracker_name,progress,updated_at")
    .eq("user_id", session.user.id)
    .in("tracker_name", COURSES.map((course) => course.id));

  if (error || !data) return;
  const rows = data as ProgressRow[];

  COURSES.forEach((course) => {
    const row = rows.find((item) => item.tracker_name === course.id);
    renderCourseProgress(
      course.id,
      countComplete(row?.progress ?? {}),
      course.totalItems,
      row?.updated_at ?? null,
    );
  });
}

function setAuthMode(mode: AuthMode): void {
  authMode = mode;
  usernameAvailable = null;
  const signInBtn = document.getElementById("authSignInModeBtn");
  const signUpBtn = document.getElementById("authSignUpModeBtn");
  const submit = document.getElementById("authSubmitBtn") as HTMLButtonElement | null;
  const emailLabel = document.getElementById("authEmailLabel");
  const email = document.getElementById("authEmailInput") as HTMLInputElement | null;
  const password = document.getElementById("authPasswordInput") as HTMLInputElement | null;

  signInBtn?.setAttribute("aria-selected", mode === "sign-in" ? "true" : "false");
  signUpBtn?.setAttribute("aria-selected", mode === "sign-up" ? "true" : "false");
  signInBtn?.classList.toggle("text-fg-default", mode === "sign-in");
  signInBtn?.classList.toggle("text-fg-muted", mode !== "sign-in");
  signInBtn?.classList.toggle("border-accent", mode === "sign-in");
  signInBtn?.classList.toggle("border-transparent", mode !== "sign-in");
  signUpBtn?.classList.toggle("text-fg-default", mode === "sign-up");
  signUpBtn?.classList.toggle("text-fg-muted", mode !== "sign-up");
  signUpBtn?.classList.toggle("border-accent", mode === "sign-up");
  signUpBtn?.classList.toggle("border-transparent", mode !== "sign-up");

  if (submit) submit.textContent = mode === "sign-in" ? "Sign in" : "Create account";
  if (emailLabel) {
    emailLabel.classList.toggle("hidden", mode === "sign-in");
    emailLabel.classList.toggle("grid", mode === "sign-up");
  }
  if (email) email.required = mode === "sign-up";
  if (password) password.autocomplete = mode === "sign-in" ? "current-password" : "new-password";
  setUsernameStatus("");
  setAuthStatus(mode === "sign-in"
    ? "Sign in with your username and password."
    : "Create an account with a username and a password (8+ characters).");
}

function queueUsernameCheck(): void {
  if (usernameTimer) clearTimeout(usernameTimer);
  usernameTimer = setTimeout(async () => {
    const input = document.getElementById("authUsernameInput") as HTMLInputElement | null;
    const value = input?.value.trim() ?? "";
    if (!value) { setUsernameStatus(""); return; }
    if (!isValidUsername(value)) { setUsernameStatus("Use 3-24 letters, numbers, or underscores."); return; }
    setUsernameStatus("Checking...");
    const { ok, available } = await checkUsername(value);
    if (!ok) { setUsernameStatus("Could not check right now."); return; }
    usernameAvailable = available;
    setUsernameStatus(available ? "Username is available." : "Username is already taken.");
  }, 450);
}

async function submitAuth(): Promise<void> {
  const username = (document.getElementById("authUsernameInput") as HTMLInputElement | null)?.value.trim() ?? "";
  const email = (document.getElementById("authEmailInput") as HTMLInputElement | null)?.value.trim() ?? "";
  const password = (document.getElementById("authPasswordInput") as HTMLInputElement | null)?.value ?? "";
  if (!isValidUsername(username)) { setAuthStatus("Username must be 3-24 letters, numbers, or underscores."); return; }
  if (authMode === "sign-up" && usernameAvailable === false) { setAuthStatus("Choose another username."); return; }
  if (authMode === "sign-up" && !email) { setAuthStatus("Enter your email address."); return; }
  if (password.length < 8) { setAuthStatus("Password must be at least 8 characters."); return; }

  setAuthStatus(authMode === "sign-in" ? "Signing in..." : "Creating account...");
  const data = authMode === "sign-in"
    ? await signIn(username, password)
    : await signUp(username, email, password);

  if (!data || data.ok === false || data.error) {
    setAuthStatus(data?.error ?? "Authentication failed.");
    return;
  }

  if (data.session?.access_token && data.session.refresh_token) {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: setRes, error } = await client.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (error || !setRes.session) {
      setAuthStatus("Authentication failed. Try again.");
      return;
    }
    showToast(authMode === "sign-in" ? "Signed in." : "Account created.", { variant: "success" });
    await hydrateDashboard(setRes.session);
    return;
  }

  if (authMode === "sign-up") {
    setAuthMode("sign-in");
    setAuthStatus("Account created. Confirm your email if required, then sign in.");
    return;
  }
  setAuthStatus("Sign-in did not return a session.");
}

function bindAuthEvents(): void {
  document.getElementById("authSignInModeBtn")?.addEventListener("click", () => setAuthMode("sign-in"));
  document.getElementById("authSignUpModeBtn")?.addEventListener("click", () => {
    setAuthMode("sign-up");
    queueUsernameCheck();
  });
  document.getElementById("authUsernameInput")?.addEventListener("input", () => {
    if (authMode === "sign-up") queueUsernameCheck();
  });
  document.getElementById("authForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitAuth();
  });
  document.getElementById("dashSignOut")?.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    window.location.reload();
  });
}

async function boot(): Promise<void> {
  bindAuthEvents();
  setAuthMode("sign-in");

  if (!isSupabaseConfigured()) {
    showAuth(false);
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;
  const {
    data: { session },
  } = await client.auth.getSession();

  if (session) {
    await hydrateDashboard(session);
  } else {
    showAuth(true);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
} else {
  void boot();
}
