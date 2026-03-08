"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { BUILT_IN_FONTS } from "@/lib/fonts";

interface UseFontLoaderResult {
  fontsLoaded: boolean;
  fontsError: string | null;
}

/**
 * Hook that loads all built-in fonts via the FontFace API on mount.
 * Uses Promise.allSettled to ensure individual font failures don't block others.
 * Populates the store's builtInFonts array on completion.
 */
export function useFontLoader(): UseFontLoaderResult {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontsError, setFontsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      const fontsToLoad = BUILT_IN_FONTS.filter((font) => font.url);

      const loadPromises = fontsToLoad.map(async (font) => {
        try {
          const fontFace = new FontFace(font.family, `url(${font.url})`);
          document.fonts.add(fontFace);
          await fontFace.load();
          return { family: font.family, status: "fulfilled" as const };
        } catch (error) {
          console.warn(`Failed to load font "${font.family}":`, error);
          return { family: font.family, status: "rejected" as const, error };
        }
      });

      const results = await Promise.allSettled(loadPromises);

      if (!mounted) return;

      // Log warnings for any rejected fonts
      const failedFonts: string[] = [];
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.status === "rejected") {
          failedFonts.push(result.value.family);
        }
      });

      if (failedFonts.length > 0) {
        console.warn(`Some fonts failed to load: ${failedFonts.join(", ")}`);
      }

      // Populate the store with all built-in fonts (including those that failed to load)
      useEditorStore.getState().setBuiltInFonts(BUILT_IN_FONTS);

      setFontsLoaded(true);
      if (failedFonts.length > 0) {
        setFontsError(`Some fonts failed to load: ${failedFonts.join(", ")}`);
      }
    }

    loadFonts();

    return () => {
      mounted = false;
    };
  }, []);

  return { fontsLoaded, fontsError };
}
