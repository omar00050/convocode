"use client";

import { X } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import FontSelector from "./font-selector";

/**
 * Global font setting row for the right panel.
 * Displays a compact font selector with a clear button.
 */
export default function GlobalFontSetting() {
  const globalFont = useEditorStore((state) => state.globalFont);
  const setGlobalFont = useEditorStore((state) => state.setGlobalFont);
  const builtInFonts = useEditorStore((state) => state.builtInFonts);
  const uploadedFonts = useEditorStore((state) => state.uploadedFonts);

  const availableFonts = [...builtInFonts, ...uploadedFonts];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333333]">
      <label className="text-xs text-gray-400 flex-shrink-0">Global Font</label>
      <div className="flex-1 flex items-center gap-1">
        <div className="flex-1">
          <FontSelector
            currentFont={globalFont}
            globalFont={null}
            onChange={(family) => setGlobalFont(family)}
            availableFonts={availableFonts}
            compact
          />
        </div>
        {globalFont !== null && (
          <button
            type="button"
            onClick={() => setGlobalFont(null)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Clear global font"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
