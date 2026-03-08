"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

interface ZoomMenuProps {
  zoom: number;
  hasSelection: boolean;
  onZoomToFit: () => void;
  onZoomToSelection: () => void;
  onSetZoom: (level: number) => void;
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export default function ZoomMenu({
  zoom,
  hasSelection,
  onZoomToFit,
  onZoomToSelection,
  onSetZoom,
}: ZoomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Find nearest preset within ±2%
  const currentPreset = ZOOM_PRESETS.find(
    (p) => Math.abs(p - zoom) <= 0.02
  ) ?? null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-white px-2 font-mono cursor-pointer hover:bg-[#333333] rounded transition"
        title="Zoom options"
      >
        {Math.round(zoom * 100)}%
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded shadow-lg min-w-[180px] z-50 py-1"
        >
          {/* Zoom to Fit */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-[#3a3a3a] transition"
            onClick={() => {
              onZoomToFit();
              setIsOpen(false);
            }}
          >
            <span>Zoom to Fit</span>
            <span className="text-xs text-gray-500">Ctrl+0</span>
          </button>

          {/* Zoom to Selection */}
          <button
            type="button"
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition ${
              hasSelection
                ? "text-gray-300 hover:bg-[#3a3a3a] cursor-pointer"
                : "text-gray-600 cursor-default"
            }`}
            onClick={() => {
              if (!hasSelection) return;
              onZoomToSelection();
              setIsOpen(false);
            }}
          >
            <span>Zoom to Selection</span>
            <span className={`text-xs ${hasSelection ? "text-gray-500" : "text-gray-700"}`}>
              Ctrl+Shift+0
            </span>
          </button>

          {/* Separator */}
          <div className="border-t border-[#444] my-1" />

          {/* Preset zoom levels */}
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-[#3a3a3a] transition"
              onClick={() => {
                onSetZoom(preset);
                setIsOpen(false);
              }}
            >
              <span className="w-3 flex items-center justify-center">
                {currentPreset === preset && <Check size={12} className="text-blue-400" />}
              </span>
              <span className="font-mono">{Math.round(preset * 100)}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
