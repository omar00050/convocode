"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { TargetLibrary } from "@/types/editor";

const LIBRARY_OPTIONS: {
  value: TargetLibrary;
  label: string;
  subtitle: string;
}[] = [
  { value: "node-canvas", label: "node-canvas", subtitle: "Canvas 2D API" },
  { value: "sharp", label: "sharp", subtitle: "High-performance compositing" },
  { value: "jimp", label: "jimp", subtitle: "Pure JS (limited text/shapes)" },
  { value: "skia-canvas", label: "skia-canvas", subtitle: "Canvas 2D + GPU acceleration" },
];

export default function LibrarySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { targetLibrary, generatedCode, setTargetLibrary, generateCode } = useEditorStore();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (lib: TargetLibrary) => {
    setTargetLibrary(lib);
    // Auto-regenerate if code already exists
    if (generatedCode) {
      generateCode();
    }
    setIsOpen(false);
  };

  const currentOption = LIBRARY_OPTIONS.find((opt) => opt.value === targetLibrary);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-3 rounded text-sm text-gray-300 hover:bg-[#3a3a45] transition"
        style={{ backgroundColor: isOpen ? "#3a3a45" : "transparent" }}
      >
        <span className="font-medium">{currentOption?.label || targetLibrary}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown popover */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 min-w-[220px] rounded-md shadow-lg border border-[#444] overflow-hidden z-50"
          style={{ backgroundColor: "#2a2a35" }}
        >
          {LIBRARY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#3a3a45] transition ${
                option.value === targetLibrary ? "bg-[#3a3a45]" : ""
              }`}
            >
              {/* Check icon for selected option */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {option.value === targetLibrary ? (
                  <Check size={14} className="text-blue-400" />
                ) : null}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">{option.label}</span>
                <span className="text-xs text-gray-500">{option.subtitle}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
