type Variant = "info" | "success" | "warning" | "danger";

type ShowOptions = {
  variant?: Variant;
  duration?: number;
  undo?: { label?: string; onUndo: () => void };
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function elements() {
  const root = document.getElementById("toast");
  if (!root) return null;
  const message = root.querySelector<HTMLElement>("[data-toast-message]");
  const undoBtn = root.querySelector<HTMLButtonElement>("[data-toast-undo]");
  if (!message || !undoBtn) return null;
  return { root, message, undoBtn };
}

export function showToast(message: string, options: ShowOptions = {}): void {
  const els = elements();
  if (!els) return;
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  const variant = options.variant ?? "info";
  const duration = options.duration ?? 2500;

  els.root.dataset.variant = variant;
  els.message.textContent = message;

  if (options.undo) {
    const undoCb = options.undo.onUndo;
    const undoLabel = options.undo.label ?? "Undo";
    // Clone button to remove stale listeners
    const fresh = els.undoBtn.cloneNode(true) as HTMLButtonElement;
    els.undoBtn.replaceWith(fresh);
    fresh.classList.remove("hidden");
    fresh.textContent = undoLabel;
    fresh.addEventListener("click", () => {
      undoCb();
      hideToast();
    }, { once: true });
  } else {
    els.undoBtn.classList.add("hidden");
  }

  els.root.classList.add("show");

  if (duration > 0) {
    hideTimer = setTimeout(hideToast, duration);
  }
}

export function hideToast(): void {
  const els = elements();
  if (!els) return;
  els.root.classList.remove("show");
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}
