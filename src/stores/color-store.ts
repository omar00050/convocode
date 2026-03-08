import { create } from "zustand";

interface ColorStoreState {
  recentColors: string[];  // max 20, ordered by recency (index 0 = most recent)
  savedColors: string[];   // user-curated, no duplicates, max 50
}

interface ColorStoreActions {
  addRecentColor: (hex: string) => void;
  addSavedColor: (hex: string) => void;
  removeSavedColor: (hex: string) => void;
}

export const useColorStore = create<ColorStoreState & ColorStoreActions>((set) => ({
  recentColors: [],
  savedColors: [],

  addRecentColor: (hex: string) => {
    if (!hex || hex === "transparent") return;
    set((state) => {
      const filtered = state.recentColors.filter((c) => c !== hex);
      return { recentColors: [hex, ...filtered].slice(0, 20) };
    });
  },

  addSavedColor: (hex: string) => {
    if (!hex || hex === "transparent") return;
    set((state) => {
      if (state.savedColors.includes(hex)) return state;
      if (state.savedColors.length >= 50) return state;
      return { savedColors: [...state.savedColors, hex] };
    });
  },

  removeSavedColor: (hex: string) => {
    set((state) => ({
      savedColors: state.savedColors.filter((c) => c !== hex),
    }));
  },
}));
