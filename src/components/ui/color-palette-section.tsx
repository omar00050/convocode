"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { useColorStore } from "@/stores/color-store";
import { PRESET_PALETTES } from "@/lib/color-palettes";

interface ColorPaletteSectionProps {
  currentColor: string;
  onChange: (hex: string) => void;
}

interface SwatchProps {
  color: string;
  onClick: () => void;
  onRemove?: () => void;
}

function Swatch({ color, onClick, onRemove }: SwatchProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onRemove) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <button
        type="button"
        title={color}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className="w-4 h-4 rounded border border-[#555] hover:border-blue-500 hover:scale-110 transition"
        style={{ backgroundColor: color }}
      />
      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-9998"
            onClick={() => setMenuPos(null)}
          />
          <div
            className="fixed z-9999 bg-zinc-900 border border-zinc-700 rounded shadow-lg py-1 min-w-[100px]"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              onClick={() => { onRemove?.(); setMenuPos(null); }}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </>
  );
}

export default function ColorPaletteSection({ currentColor, onChange }: ColorPaletteSectionProps) {
  const { recentColors, savedColors, addSavedColor, removeSavedColor, addRecentColor } = useColorStore();
  const [expandedPalette, setExpandedPalette] = useState<string | null>(null);

  const handleSwatchClick = (hex: string) => {
    addRecentColor(hex);
    onChange(hex);
  };

  return (
    <div className="space-y-2">
      {/* Saved Colors */}
      <div>
        <div className="flex items-center justify-between mt-2 mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Saved Colors</span>
          <button
            type="button"
            title="Save current color"
            onClick={() => addSavedColor(currentColor)}
            className="w-4 h-4 flex items-center justify-center rounded border border-dashed border-[#666] hover:border-blue-500 text-[10px] text-gray-400 hover:text-blue-400 transition"
          >
            +
          </button>
        </div>
        {savedColors.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {savedColors.map((color) => (
              <Swatch
                key={color}
                color={color}
                onClick={() => handleSwatchClick(color)}
                onRemove={() => removeSavedColor(color)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-600 italic">None saved yet</p>
        )}
      </div>

      {/* Recent Colors */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-2 mb-1">Recent Colors</p>
        {recentColors.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {recentColors.map((color) => (
              <Swatch
                key={color}
                color={color}
                onClick={() => handleSwatchClick(color)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-600 italic">No recent colors</p>
        )}
      </div>

      {/* Preset Palettes Accordion */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-2 mb-1">Palettes</p>
        <div className="space-y-0.5">
          {PRESET_PALETTES.map((palette) => {
            const isExpanded = expandedPalette === palette.name;
            return (
              <div key={palette.name}>
                {/* Palette header row */}
                <button
                  type="button"
                  onClick={() => setExpandedPalette(isExpanded ? null : palette.name)}
                  className="w-full flex items-center gap-2 py-0.5 hover:bg-[#333] rounded px-1 transition"
                >
                  <span className="text-[10px] text-gray-400 flex-1 text-left truncate">{palette.name}</span>
                  {/* 5-color preview strip */}
                  <div className="flex gap-0.5">
                    {palette.colors.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
                {/* Expanded palette swatches */}
                {isExpanded && (
                  <div className="flex flex-wrap gap-1 px-1 py-1 bg-[#222] rounded mb-1">
                    {palette.colors.map((color) => (
                      <Swatch
                        key={color}
                        color={color}
                        onClick={() => handleSwatchClick(color)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
