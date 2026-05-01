import { COURSE } from "@/data/course";
import { videoKey, type ProgressState } from "@/lib/progress";
import {
  loadLastSynced,
  loadLocalUpdatedAt,
  loadProgress,
  loadStartDate,
  saveLastSynced,
  saveProgress,
  saveStartDate,
  touchLocalTimestamp,
} from "@/lib/storage";
import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";

import { initView, getView, onViewChange } from "@/lib/tracker/view";
import { initTheme } from "@/lib/tracker/theme";
import { initDrawer } from "@/lib/tracker/drawer";
import { allValidSlugs } from "@/lib/tracker/modules";
import { refreshSidebarProgress } from "@/lib/tracker/sidebar";
import { renderHome } from "@/lib/tracker/home";
import { refreshAllModules } from "@/lib/tracker/module";
import { showToast } from "@/lib/tracker/toast";
import { snapshot } from "@/lib/tracker/undo";
import { isValidUsername, checkUsername, signIn, signUp, type AuthMode } from "@/lib/tracker/auth";
import { setSyncState, loadCloud, saveCloud } from "@/lib/tracker/sync";

// ---- State -----------------------------------------------------------------

let progress: ProgressState = loadProgress();
let startDate = loadStartDate();
let localUpdatedAt = loadLocalUpdatedAt();
let session: Session | null = null;
let accountName = "";
let authMode: AuthMode = "sign-in";
let usernameAvailable: boolean | null = null;
let usernameTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

// ---- Helpers ---------------------------------------------------------------

function persistProgress(): void {
  saveProgress(progress);
  localUpdatedAt = touchLocalTimestamp();
  queueCloudSave();
  refresh();
}

function persistStart(value: string): void {
  startDate = value;
  saveStartDate(value);
  localUpdatedAt = touchLocalTimestamp();
  queueCloudSave();
  refresh();
}

function refresh(): void {
  refreshSidebarProgress(progress);
  refreshAllModules(progress);
  renderHome({ progress, startDate });
}

function queueCloudSave(): void {
  if (!isSupabaseConfigured() || !session) return;
  if (syncTimer) clearTimeout(syncTimer);
  setSyncState("syncing", "Syncing…");
  syncTimer = setTimeout(async () => {
    const result = await saveCloud(session!, progress, startDate);
    if (result.ok && result.updatedAt) {
      localUpdatedAt = touchLocalTimestamp(result.updatedAt);
      saveLastSynced(result.updatedAt);
      setSyncState("ok", "Synced just now");
    } else {
      setSyncState("error", "Sync failed");
    }
  }, 500);
}

async function loadOrMergeCloud(): Promise<void> {
  if (!session) return;
  setSyncState("syncing", "Syncing…");
  const cloud = await loadCloud(session);
  if (!cloud) {
    setSyncState("error", "Sync failed");
    return;
  }
  const cloudHasData = Object.keys(cloud.progress).length > 0 || Boolean(cloud.startDate);
  const cloudNewer = cloud.updatedAt && (!localUpdatedAt || new Date(cloud.updatedAt) > new Date(localUpdatedAt));
  const localHasData = Object.keys(progress).length > 0 || Boolean(startDate);

  if (cloudHasData && cloudNewer) {
    progress = cloud.progress;
    startDate = cloud.startDate;
    saveProgress(progress);
    saveStartDate(startDate);
    localUpdatedAt = touchLocalTimestamp(cloud.updatedAt);
    saveLastSynced(cloud.updatedAt);
    setSyncState("ok", "Loaded cloud progress");
    refresh();
    return;
  }
  if (localHasData || !cloudHasData) {
    const result = await saveCloud(session, progress, startDate);
    if (result.ok && result.updatedAt) {
      localUpdatedAt = touchLocalTimestamp(result.updatedAt);
      saveLastSynced(result.updatedAt);
      setSyncState("ok", "Synced just now");
    } else {
      setSyncState("error", "Sync failed");
    }
  } else {
    setSyncState("ok", "Up to date");
  }
}

// ---- Auth gate UI ----------------------------------------------------------

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

function setAuthStatus(message: string): void {
  const node = document.getElementById("authGateStatus");
  if (node) node.textContent = message;
}

function setUsernameStatus(message: string): void {
  const node = document.getElementById("authUsernameStatus");
  if (node) node.textContent = message;
}

function showAuth(show: boolean): void {
  const gate = document.getElementById("authGate");
  const tracker = document.getElementById("trackerApp");
  if (gate) gate.classList.toggle("hidden", !show);
  if (tracker) tracker.classList.toggle("hidden", show);
  document.body.classList.toggle("overflow-hidden", show);
}

function setSignedInUI(signedIn: boolean): void {
  const signOut = document.getElementById("signOutBtn");
  if (signOut) signOut.classList.toggle("hidden", !signedIn);
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
  document.getElementById("signOutBtn")?.addEventListener("click", () => void doSignOut());
}

function queueUsernameCheck(): void {
  if (usernameTimer) clearTimeout(usernameTimer);
  usernameTimer = setTimeout(async () => {
    const input = document.getElementById("authUsernameInput") as HTMLInputElement | null;
    const value = input?.value.trim() ?? "";
    if (!value) { setUsernameStatus(""); return; }
    if (!isValidUsername(value)) { setUsernameStatus("Use 3–24 letters, numbers, or underscores."); return; }
    setUsernameStatus("Checking…");
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
  if (!isValidUsername(username)) { setAuthStatus("Username must be 3–24 letters, numbers, or underscores."); return; }
  if (authMode === "sign-up" && usernameAvailable === false) { setAuthStatus("Choose another username."); return; }
  if (authMode === "sign-up" && !email) { setAuthStatus("Enter your email address."); return; }
  if (password.length < 8) { setAuthStatus("Password must be at least 8 characters."); return; }

  setAuthStatus(authMode === "sign-in" ? "Signing in…" : "Creating account…");
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
    session = setRes.session;
    accountName = data.username ?? username;
    showAuth(false);
    setSignedInUI(true);
    setSyncState("ok", `Signed in as ${accountName}`);
    await loadOrMergeCloud();
    showToast(authMode === "sign-in" ? "Signed in." : "Account created.", { variant: "success" });
    return;
  }

  if (authMode === "sign-up") {
    setAuthMode("sign-in");
    setAuthStatus("Account created. Confirm your email if required, then sign in.");
    return;
  }
  setAuthStatus("Sign-in did not return a session.");
}

async function doSignOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  session = null;
  accountName = "";
  setSignedInUI(false);
  setSyncState(isSupabaseConfigured() ? "warn" : "off", isSupabaseConfigured() ? "Sign in required" : "Local mode");
  if (isSupabaseConfigured()) showAuth(true);
  showToast("Signed out.");
}

async function initSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    setSyncState("off", "Local mode");
    showAuth(false);
    return;
  }
  const client = getSupabaseClient();
  if (!client) return;

  const { data } = await client.auth.getSession();
  session = data.session;
  accountName = session?.user.user_metadata?.username ?? "";
  showAuth(!session);
  setSignedInUI(Boolean(session));
  setSyncState(session ? "ok" : "warn", session ? `Signed in as ${accountName || "user"}` : "Sign in required");

  client.auth.onAuthStateChange(async (_event, next) => {
    session = next;
    accountName = next?.user.user_metadata?.username ?? "";
    showAuth(!next);
    setSignedInUI(Boolean(next));
    if (next) await loadOrMergeCloud();
  });

  if (session) await loadOrMergeCloud();
}

// ---- Tracker bindings ------------------------------------------------------

function bindTrackerEvents(): void {
  // Lesson checkboxes
  document.body.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target?.matches?.("[data-video-checkbox]")) return;
    const key = target.dataset.key;
    if (!key) return;
    if (target.checked) progress[key] = true;
    else delete progress[key];
    persistProgress();
  });

  // Start date
  document.body.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | null;
    if (target?.id === "startDateInput") {
      persistStart(target.value);
      showToast("Start date saved.", { variant: "success" });
    }
  });

  // Today: mark all
  document.querySelector<HTMLElement>("[data-today-mark-all]")?.addEventListener("click", () => {
    const view = getView();
    if (view.kind !== "home") return;
    const lessonInputs = document.querySelectorAll<HTMLInputElement>("[data-today-lessons] [data-video-checkbox]");
    lessonInputs.forEach((input, idx) => {
      setTimeout(() => {
        if (!input.checked) {
          input.checked = true;
          const key = input.dataset.key;
          if (key) progress[key] = true;
        }
      }, idx * 30);
    });
    setTimeout(() => persistProgress(), lessonInputs.length * 30 + 50);
  });

  // Module: mark all watched
  document.body.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const code = target?.dataset?.moduleMarkAll;
    if (!code) return;
    const module = COURSE.find((m) => m.code === code);
    if (!module) return;
    module.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        progress[videoKey(module.code, chapter.num, lesson)] = true;
      });
    });
    persistProgress();
    showToast(`Marked ${module.name} watched.`, { variant: "success" });
  });

  // Module: reset progress (with undo)
  document.body.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const code = target?.dataset?.moduleReset;
    if (!code) return;
    const module = COURSE.find((m) => m.code === code);
    if (!module) return;
    const before = snapshot({ progress, startDate });
    module.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        delete progress[videoKey(module.code, chapter.num, lesson)];
      });
    });
    persistProgress();
    showToast(`Reset ${module.name}.`, {
      variant: "danger",
      duration: 6000,
      undo: {
        onUndo: () => {
          progress = before.progress;
          startDate = before.startDate;
          persistProgress();
          showToast("Restored.", { variant: "success" });
        },
      },
    });
  });
}

// ---- Boot ------------------------------------------------------------------

function boot(): void {
  initTheme();
  initDrawer();
  initView(allValidSlugs());
  bindAuthEvents();
  bindTrackerEvents();
  setAuthMode("sign-in");

  refresh();
  void initSupabase();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

onViewChange(() => {
  refresh();
});
