import type { ProgressState } from "@/lib/progress";

type Snapshot = {
  progress: ProgressState;
  startDate: string;
};

export function snapshot(state: Snapshot): Snapshot {
  return {
    progress: { ...state.progress },
    startDate: state.startDate,
  };
}
