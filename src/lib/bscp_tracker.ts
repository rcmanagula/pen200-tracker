import {
  BSCP_TOPICS,
  BSCP_TOTAL_LABS,
  type LabLevel,
} from "@/data/bscp";
import type { ProgressState } from "@/lib/progress";
import { makeStorageKeys } from "@/lib/storage";
import { getSupabaseClient, isSupabaseConfigured, type Session } from "@/lib/supabase";
import { isValidUsername, checkUsername, signIn, signUp, type AuthMode } from "@/lib/tracker/auth";
import { initDrawer } from "@/lib/tracker/drawer";
import { loadCloud, saveCloud, setSyncState } from "@/lib/tracker/sync";
import { initTheme } from "@/lib/tracker/theme";
import { showToast } from "@/lib/tracker/toast";

const TRACKER_NAME = "bscp";
const KEYS = makeStorageKeys(TRACKER_NAME);

type LevelFilter = "all" | LabLevel;

let progress: ProgressState = loadProgress();
let localUpdatedAt = loadLocalUpdatedAt();
let session: Session | null = null;
let accountName = "";
let authMode: AuthMode = "sign-in";
let usernameAvailable: boolean | null = null;
let usernameTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEYS.progressKey);
    return raw ? JSON.parse(raw) as ProgressState : {};
  } catch {
    return {};
  }
}

function saveProgressLocal(value: ProgressState): void {
  localStorage.setItem(KEYS.progressKey, JSON.stringify(value));
}

function loadLocalUpdatedAt(): string {
  return localStorage.getItem(KEYS.updatedAtKey) || "";
}

function touchLocalTimestamp(updatedAt = new Date().toISOString()): string {
  localStorage.setItem(KEYS.updatedAtKey, updatedAt);
  return updatedAt;
}

function saveLastSynced(updatedAt: string): void {
  localStorage.setItem(KEYS.lastSyncedKey, updatedAt);
}

function setText(node: HTMLElement | null, text: string): void {
  if (node) node.textContent = text;
}

function countDone(): number {
  return Object.values(progress).filter(Boolean).length;
}

function refreshOverallProgress(): void {
  const done = countDone();
  const percent = BSCP_TOTAL_LABS > 0 ? Math.round((done / BSCP_TOTAL_LABS) * 100) : 0;
  const eyebrowRight = document.querySelector<HTMLElement>("header .font-mono");
  setText(eyebrowRight, `${done} / ${BSCP_TOTAL_LABS}`);
  const bar = document.getElementById("bscpOverallBar");
  if (bar) bar.style.width = `${percent}%`;
}

function refreshTopicProgress(): void {
  BSCP_TOPICS.forEach((topic) => {
    const done = topic.labs.filter((lab) => progress[lab.id]).length;
    const total = topic.labs.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const count = document.querySelector<HTMLElement>(`[data-bscp-topic-count="${topic.id}"]`);
    const bar = document.querySelector<HTMLElement>(`[data-bscp-topic-bar="${topic.id}"]`);
    const navBar = document.querySelector<HTMLElement>(`[data-bscp-nav-bar="${topic.id}"]`);

    setText(count, `${done}/${total}`);
    if (bar) bar.style.width = `${percent}%`;
    if (navBar) navBar.style.width = `${percent}%`;
  });
}

function refreshCheckboxes(): void {
  document.querySelectorAll<HTMLInputElement>("[data-bscp-checkbox]").forEach((input) => {
    const key = input.dataset.key;
    input.checked = Boolean(key && progress[key]);
  });
}

function refresh(): void {
  refreshCheckboxes();
  refreshOverallProgress();
  refreshTopicProgress();
}

function persistProgress(): void {
  saveProgressLocal(progress);
  localUpdatedAt = touchLocalTimestamp();
  queueCloudSave();
  refresh();
}

function applyFilter(level: LevelFilter): void {
  document.querySelectorAll<HTMLElement>("[data-bscp-filter]").forEach((button) => {
    const active = button.dataset.bscpFilter === level;
    button.classList.toggle("border-accent", active);
    button.classList.toggle("bg-accent", active);
    button.classList.toggle("text-on-accent", active);
    button.classList.toggle("border-default", !active);
    button.classList.toggle("text-fg-muted", !active);
  });

  document.querySelectorAll<HTMLElement>("[data-bscp-lab]").forEach((row) => {
    row.classList.toggle("hidden", level !== "all" && row.dataset.bscpLevel !== level);
  });
}

function bindTopicAccordions(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-bscp-topic-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const topicId = button.dataset.bscpTopicToggle;
      if (!topicId) return;
      const body = document.querySelector<HTMLElement>(`[data-bscp-topic-body="${topicId}"]`);
      const chevron = document.querySelector<HTMLElement>(`[data-bscp-topic-chevron="${topicId}"]`);
      if (!body) return;

      const shouldOpen = body.classList.contains("hidden");
      body.classList.toggle("hidden", !shouldOpen);
      button.setAttribute("aria-expanded", String(shouldOpen));
      if (chevron) chevron.style.transform = shouldOpen ? "rotate(180deg)" : "";
    });
  });
}

function bindSidebarNav(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-bscp-nav-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const topicId = button.dataset.bscpNavItem;
      if (!topicId) return;
      const body = document.querySelector<HTMLElement>(`[data-bscp-topic-body="${topicId}"]`);
      const toggle = document.querySelector<HTMLButtonElement>(`[data-bscp-topic-toggle="${topicId}"]`);
      const section = document.querySelector<HTMLElement>(`[data-bscp-topic="${topicId}"]`);

      if (body?.classList.contains("hidden")) toggle?.click();
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.documentElement.dataset.drawer = "closed";
    });
  });
}

function queueCloudSave(): void {
  if (!isSupabaseConfigured() || !session) return;
  if (syncTimer) clearTimeout(syncTimer);
  setSyncState("syncing", "Syncing...");
  syncTimer = setTimeout(async () => {
    const result = await saveCloud(session!, progress, "", TRACKER_NAME);
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
  setSyncState("syncing", "Syncing...");
  const cloud = await loadCloud(session, TRACKER_NAME);
  if (!cloud) {
    setSyncState("error", "Sync failed");
    return;
  }

  const cloudHasData = Object.keys(cloud.progress).length > 0;
  const cloudNewer = cloud.updatedAt && (!localUpdatedAt || new Date(cloud.updatedAt) > new Date(localUpdatedAt));
  const localHasData = Object.keys(progress).length > 0;

  if (cloudHasData && cloudNewer) {
    progress = cloud.progress;
    saveProgressLocal(progress);
    localUpdatedAt = touchLocalTimestamp(cloud.updatedAt);
    saveLastSynced(cloud.updatedAt);
    setSyncState("ok", "Loaded cloud progress");
    refresh();
    return;
  }

  if (localHasData || !cloudHasData) {
    const result = await saveCloud(session, progress, "", TRACKER_NAME);
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

function setAuthStatus(message: string): void {
  setText(document.getElementById("authGateStatus"), message);
}

function setUsernameStatus(message: string): void {
  setText(document.getElementById("authUsernameStatus"), message);
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

function bindTrackerEvents(): void {
  document.body.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target?.matches?.("[data-bscp-checkbox]")) return;
    const key = target.dataset.key;
    if (!key) return;
    if (target.checked) progress[key] = true;
    else delete progress[key];
    persistProgress();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-bscp-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter((button.dataset.bscpFilter ?? "all") as LevelFilter);
    });
  });
}

function boot(): void {
  initTheme();
  initDrawer();
  bindTopicAccordions();
  bindSidebarNav();
  bindAuthEvents();
  bindTrackerEvents();
  setAuthMode("sign-in");
  applyFilter("all");
  refresh();
  void initSupabase();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
