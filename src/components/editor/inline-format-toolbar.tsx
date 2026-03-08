"use client";

import { useState, useRef, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import type { RangeStyles } from "@/types/rich-text";

export interface InlineFormatToolbarProps {
  position: { x: number; y: number };
  selectedStyles: RangeStyles;
  onFormat: (property: string, value: unknown) => void;
}

/**
 * Floating inline formatting toolbar for rich text editing.
 * Displays Bold, Italic, Font Size, Color, Underline, and Strikethrough controls.
 * Shows active/pressed states for applied styles and indeterminate state for mixed styles.
 */
export default function InlineFormatToolbar({
  position,
  selectedStyles,
  onFormat,
}: InlineFormatToolbarProps) {
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  // Close color popover on click outside
  useEffect(() => {
    if (!colorPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPopoverRef.current &&
        !colorPopoverRef.current.contains(e.target as Node) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(e.target as Node)
      ) {
        setColorPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPopoverOpen]);

  // Handle toggle button clicks
  const handleBoldToggle = () => {
    const newValue = selectedStyles.fontWeight.uniform && selectedStyles.fontWeight.value === "bold"
      ? "normal"
      : "bold";
    onFormat("fontWeight", newValue);
  };

  const handleItalicToggle = () => {
    const newValue = selectedStyles.fontStyle.uniform && selectedStyles.fontStyle.value === "italic"
      ? "normal"
      : "italic";
    onFormat("fontStyle", newValue);
  };

  const handleUnderlineToggle = () => {
    const currentDecoration = selectedStyles.textDecoration.uniform
      ? selectedStyles.textDecoration.value || "none"
      : "none";
    const hasUnderline = currentDecoration.includes("underline");
    const hasStrikethrough = currentDecoration.includes("line-through");

    let newDecoration: string;
    if (hasUnderline) {
      newDecoration = hasStrikethrough ? "line-through" : "none";
    } else {
      newDecoration = hasStrikethrough ? "underline line-through" : "underline";
    }
    onFormat("textDecoration", newDecoration);
  };

  const handleStrikethroughToggle = () => {
    const currentDecoration = selectedStyles.textDecoration.uniform
      ? selectedStyles.textDecoration.value || "none"
      : "none";
    const hasUnderline = currentDecoration.includes("underline");
    const hasStrikethrough = currentDecoration.includes("line-through");

    let newDecoration: string;
    if (hasStrikethrough) {
      newDecoration = hasUnderline ? "underline" : "none";
    } else {
      newDecoration = hasUnderline ? "underline line-through" : "line-through";
    }
    onFormat("textDecoration", newDecoration);
  };

  // Font size handlers
  const currentFontSize = selectedStyles.fontSize.uniform && selectedStyles.fontSize.value
    ? selectedStyles.fontSize.value!
    : 16;

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(1, Math.min(500, currentFontSize + delta));
    onFormat("fontSize", newSize);
  };

  // Color handling
  const currentColor = selectedStyles.fill.uniform && selectedStyles.fill.value
    ? selectedStyles.fill.value!
    : "#000000";

  const handleColorChange = (color: string) => {
    onFormat("fill", color);
    setColorPopoverOpen(false);
  };

  // Determine if styles are mixed (indeterminate state)
  const isBoldMixed = !selectedStyles.fontWeight.uniform;
  const isBoldActive = selectedStyles.fontWeight.uniform && selectedStyles.fontWeight.value === "bold";

  const isItalicMixed = !selectedStyles.fontStyle.uniform;
  const isItalicActive = selectedStyles.fontStyle.uniform && selectedStyles.fontStyle.value === "italic";

  const isUnderlineMixed = !selectedStyles.textDecoration.uniform;
  const isUnderlineActive =
    !!(selectedStyles.textDecoration.uniform &&
    selectedStyles.textDecoration.value?.includes("underline"));

  const isStrikethroughMixed = !selectedStyles.textDecoration.uniform;
  const isStrikethroughActive =
    !!(selectedStyles.textDecoration.uniform &&
    selectedStyles.textDecoration.value?.includes("line-through"));

  // Button base classes
  const buttonBase = "flex items-center justify-center w-8 h-8 rounded border transition-colors text-sm";
  const buttonActive = "bg-blue-500/30 border-blue-400/50 text-white";
  const buttonInactive = "bg-[#444] border-[#555] text-gray-300 hover:border-[#666]";
  const buttonMixed = "bg-yellow-500/20 border-yellow-400/50 text-yellow-200";

  const getButtonClass = (isActive: boolean, isMixed: boolean) => {
    if (isMixed) return `${buttonBase} ${buttonMixed}`;
    if (isActive) return `${buttonBase} ${buttonActive}`;
    return `${buttonBase} ${buttonInactive}`;
  };

  return (
    <div
      className="absolute z-[1100] flex items-center gap-1 bg-[#2a2a2a] border border-[#444] rounded-lg px-2 py-1.5 shadow-xl"
      style={{ left: position.x, top: position.y }}
      // Prevent textarea blur when clicking toolbar
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Bold */}
      <button
        type="button"
        onClick={handleBoldToggle}
        className={getButtonClass(isBoldActive, isBoldMixed)}
        title={isBoldMixed ? "Bold (mixed)" : isBoldActive ? "Remove Bold" : "Bold"}
        aria-label="Bold"
        aria-pressed={isBoldActive}
      >
        <span className="font-bold">B</span>
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={handleItalicToggle}
        className={getButtonClass(isItalicActive, isItalicMixed)}
        title={isItalicMixed ? "Italic (mixed)" : isItalicActive ? "Remove Italic" : "Italic"}
        aria-label="Italic"
        aria-pressed={isItalicActive}
      >
        <span className="italic">I</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[#555] mx-1" />

      {/* Font Size */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => handleFontSizeChange(-1)}
          className="flex items-center justify-center w-6 h-7 rounded border bg-[#444] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
          title="Decrease Font Size"
          aria-label="Decrease Font Size"
        >
          <Minus size={14} />
        </button>
        <span
          className="min-w-[2rem] text-center text-xs text-gray-300"
          title={selectedStyles.fontSize.uniform ? `Font Size: ${currentFontSize}px` : "Font Size (mixed)"}
        >
          {selectedStyles.fontSize.uniform ? currentFontSize : "—"}
        </span>
        <button
          type="button"
          onClick={() => handleFontSizeChange(1)}
          className="flex items-center justify-center w-6 h-7 rounded border bg-[#444] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
          title="Increase Font Size"
          aria-label="Increase Font Size"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#555] mx-1" />

      {/* Color */}
      <div className="relative">
        <button
          ref={colorButtonRef}
          type="button"
          onClick={() => setColorPopoverOpen(!colorPopoverOpen)}
          className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
            colorPopoverOpen ? "bg-blue-500/30 border-blue-400/50" : "bg-[#444] border-[#555] hover:border-[#666]"
          }`}
          title={selectedStyles.fill.uniform ? `Color: ${currentColor}` : "Color (mixed)"}
          aria-label="Text Color"
          aria-haspopup="true"
          aria-expanded={colorPopoverOpen}
        >
          <div
            className="w-4 h-4 rounded-sm border border-[#666]"
            style={{
              backgroundColor: selectedStyles.fill.uniform ? currentColor : "#888",
            }}
          />
        </button>

        {/* Color Picker Popover */}
        {colorPopoverOpen && (
          <div
            ref={colorPopoverRef}
            className="absolute z-[1200] top-full left-0 mt-1 p-2 bg-[#2a2a2a] border border-[#444] rounded shadow-lg"
          >
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-16 h-8 cursor-pointer rounded border border-[#555]"
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#555] mx-1" />

      {/* Underline */}
      <button
        type="button"
        onClick={handleUnderlineToggle}
        className={getButtonClass(isUnderlineActive, isUnderlineMixed)}
        title={isUnderlineMixed ? "Underline (mixed)" : isUnderlineActive ? "Remove Underline" : "Underline"}
        aria-label="Underline"
        aria-pressed={isUnderlineActive}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={handleStrikethroughToggle}
        className={getButtonClass(isStrikethroughActive, isStrikethroughMixed)}
        title={isStrikethroughMixed ? "Strikethrough (mixed)" : isStrikethroughActive ? "Remove Strikethrough" : "Strikethrough"}
        aria-label="Strikethrough"
        aria-pressed={isStrikethroughActive}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </button>
    </div>
  );
}
