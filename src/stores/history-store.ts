import { create } from "zustand";
import type { HistorySnapshot } from "@/types/editor";

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  isPaused: boolean;
}

interface HistoryActions {
  pushState: (snapshot: HistorySnapshot) => void;
  undo: (currentSnapshot: HistorySnapshot) => HistorySnapshot | null;
  redo: (currentSnapshot: HistorySnapshot) => HistorySnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pauseHistory: () => void;
  resumeHistory: () => void;
  clearHistory: () => void;
}

type HistoryStore = HistoryState & HistoryActions;

const MAX_HISTORY_DEPTH = 50;

/**
 * Zustand store for undo/redo history management.
 * Tracks deep-cloned snapshots of design-level state.
 */
export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  isPaused: false,

  pushState: (snapshot: HistorySnapshot) => {
    set((state) => {
      const newPast = [...state.past, snapshot];
      // Trim oldest entries if exceeding max depth
      if (newPast.length > MAX_HISTORY_DEPTH) {
        newPast.shift();
      }
      return {
        past: newPast,
        future: [], // Clear redo stack on new action
      };
    });
  },

  undo: (currentSnapshot: HistorySnapshot) => {
    const state = get();
    if (state.past.length === 0) {
      return null;
    }

    const newPast = [...state.past];
    const restoredSnapshot = newPast.pop()!;

    set({
      past: newPast,
      future: [...state.future, currentSnapshot],
    });

    return restoredSnapshot;
  },

  redo: (currentSnapshot: HistorySnapshot) => {
    const state = get();
    if (state.future.length === 0) {
      return null;
    }

    const newFuture = [...state.future];
    const restoredSnapshot = newFuture.pop()!;

    set({
      past: [...state.past, currentSnapshot],
      future: newFuture,
    });

    return restoredSnapshot;
  },

  canUndo: () => {
    return get().past.length > 0;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  pauseHistory: () => {
    set({ isPaused: true });
  },

  resumeHistory: () => {
    set({ isPaused: false });
  },

  clearHistory: () => {
    set({ past: [], future: [] });
  },
}));
