"use client";

import { useState, useEffect, useRef } from "react";
import { useColorStore } from "@/stores/color-store";
import ColorPaletteSection from "./color-palette-section";
import EyedropperButton from "./eyedropper-button";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "transparent",
];

export default function ColorPicker({
  color,
  onChange,
  label,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const { addRecentColor } = useColorStore();

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        swatchRef.current &&
        !swatchRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleColorChange = (newColor: string) => {
    onChange(newColor);
    if (newColor !== "transparent") addRecentColor(newColor);
  };

  const handlePresetClick = (presetColor: string) => {
    handleColorChange(presetColor);
    setIsOpen(false);
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  };

  const handlePaletteChange = (hex: string) => {
    // palette/recent/saved swatches: apply color but do NOT close popover
    onChange(hex);
    addRecentColor(hex);
  };

  const displayColor = color === "transparent" ? "transparent" : color;

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <div className="relative">
        <button
          ref={swatchRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-[#333] border border-[#555] rounded px-2 py-1.5 hover:border-[#666] transition-colors"
        >
          <div
            className="w-5 h-5 rounded border border-[#444]"
            style={{
              backgroundColor: color === "transparent" ? "#444" : displayColor,
              backgroundImage:
                color === "transparent"
                  ? "linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)"
                  : "none",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            }}
          />
          <span className="text-xs text-gray-300">
            {color === "transparent" ? "None" : color.toUpperCase()}
          </span>
        </button>

        {isOpen && (
          <div
            ref={popoverRef}
            className="absolute z-50 top-full left-0 mt-1 p-3 bg-[#2a2a2a] border border-[#444] rounded shadow-lg min-w-[200px] overflow-y-auto"
            style={{ maxHeight: "350px" }}
          >
            {/* Native color picker */}
            <div className="mb-2">
              <input
                type="color"
                value={color === "transparent" ? "#000000" : color}
                onChange={handleNativeChange}
                className="w-full h-8 cursor-pointer rounded border border-[#555]"
              />
            </div>

            {/* Hex display + eyedropper */}
            <div className="flex items-center gap-1 mb-2">
              <span className="flex-1 text-xs text-gray-300 font-mono">
                {color === "transparent" ? "None" : color.toUpperCase()}
              </span>
              <EyedropperButton onChange={handleColorChange} />
            </div>

            {/* Preset swatches */}
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => handlePresetClick(presetColor)}
                  className="w-5 h-5 rounded border border-[#555] hover:border-blue-500 transition-colors"
                  style={{
                    backgroundColor:
                      presetColor === "transparent" ? "#444" : presetColor,
                    backgroundImage:
                      presetColor === "transparent"
                        ? "linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)"
                        : "none",
                    backgroundSize: "6px 6px",
                    backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                  }}
                  title={presetColor === "transparent" ? "None" : presetColor}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-[#444] my-2" />

            {/* Palette section: recent, saved, preset palettes */}
            <ColorPaletteSection
              currentColor={color}
              onChange={handlePaletteChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
