"use client";

import { AlignLeft, AlignCenter, AlignRight, RotateCcw } from "lucide-react";
import type { TextObject } from "@/types/editor";
import { hasStyleOverrides } from "@/types/rich-text";
import { useEditorStore } from "@/stores/editor-store";
import TextPathPanel from "@/components/editor/text-path-panel";
import { getEffectiveFont, getDefaultAlignForDirection } from "@/lib/font-utils";
import NumericInput from "@/components/ui/numeric-input";
import ColorPicker from "@/components/ui/color-picker";
import SliderInput from "@/components/ui/slider-input";
import FontSelector from "@/components/editor/font-selector";
import ToggleButton from "@/components/ui/toggle-button";
import BlendModeSelect from "@/components/ui/blend-mode-select";
import ShadowPanel from "@/components/ui/shadow-panel";

interface TextPropertiesProps {
  obj: TextObject;
}

export default function TextProperties({ obj }: TextPropertiesProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const globalFont = useEditorStore((state) => state.globalFont);
  const builtInFonts = useEditorStore((state) => state.builtInFonts);
  const uploadedFonts = useEditorStore((state) => state.uploadedFonts);

  const effectiveFont = getEffectiveFont(obj, { globalFont });
  const availableFonts = [...builtInFonts, ...uploadedFonts];

  // Position handlers
  const handlePositionChange = (field: "x" | "y", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleSizeChange = (field: "width", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleRotationChange = (value: number) => {
    updateObject(obj.id, { rotation: value });
  };

  // Font handlers
  const handleFontSizeChange = (value: number) => {
    updateObject(obj.id, { fontSize: value } as Partial<Omit<TextObject, "type">>);
  };

  const handleBoldToggle = () => {
    updateObject(obj.id, {
      fontWeight: obj.fontWeight === "bold" ? "normal" : "bold",
    } as Partial<Omit<TextObject, "type">>);
  };

  const handleItalicToggle = () => {
    updateObject(obj.id, {
      fontStyle: obj.fontStyle === "italic" ? "normal" : "italic",
    } as Partial<Omit<TextObject, "type">>);
  };

  // Color & Stroke handlers
  const handleFillChange = (color: string) => {
    updateObject(obj.id, { fill: color } as Partial<Omit<TextObject, "type">>);
  };

  const handleStrokeToggle = () => {
    updateObject(obj.id, {
      strokeEnabled: !obj.strokeEnabled,
    } as Partial<Omit<TextObject, "type">>);
  };

  const handleStrokeColorChange = (color: string) => {
    updateObject(obj.id, { strokeColor: color } as Partial<Omit<TextObject, "type">>);
  };

  const handleStrokeWidthChange = (value: number) => {
    updateObject(obj.id, { strokeWidth: value } as Partial<Omit<TextObject, "type">>);
  };

  // Text Style handlers
  const hasUnderline = obj.textDecoration.includes("underline");
  const hasStrikethrough = obj.textDecoration.includes("line-through");

  const handleUnderlineToggle = () => {
    let newDecoration: string;
    if (hasUnderline) {
      // Remove underline
      newDecoration = hasStrikethrough ? "line-through" : "none";
    } else {
      // Add underline
      newDecoration = hasStrikethrough ? "underline line-through" : "underline";
    }
    updateObject(obj.id, { textDecoration: newDecoration } as Partial<Omit<TextObject, "type">>);
  };

  const handleStrikethroughToggle = () => {
    let newDecoration: string;
    if (hasStrikethrough) {
      // Remove strikethrough
      newDecoration = hasUnderline ? "underline" : "none";
    } else {
      // Add strikethrough
      newDecoration = hasUnderline ? "underline line-through" : "line-through";
    }
    updateObject(obj.id, { textDecoration: newDecoration } as Partial<Omit<TextObject, "type">>);
  };

  const handleLetterSpacingChange = (value: number) => {
    updateObject(obj.id, { letterSpacing: value } as Partial<Omit<TextObject, "type">>);
  };

  const handleLineHeightChange = (value: number) => {
    updateObject(obj.id, { lineHeight: value } as Partial<Omit<TextObject, "type">>);
  };

  // Alignment & Direction handlers
  const handleAlignmentChange = (alignment: "left" | "center" | "right") => {
    updateObject(obj.id, { textAlign: alignment } as Partial<Omit<TextObject, "type">>);
  };

  const handleDirectionChange = (direction: "auto" | "rtl" | "ltr") => {
    // Auto-alignment convenience: adjust alignment when switching direction
    // only if currently at the "expected default" for the previous direction
    const resolvedDirection = obj.direction === "auto"
      ? (direction === "auto" ? "ltr" : direction) // simplified: treat auto as ltr for default check
      : obj.direction;

    const defaultAlign = getDefaultAlignForDirection(resolvedDirection === "rtl" ? "rtl" : "ltr");
    const newDefaultAlign = getDefaultAlignForDirection(direction === "auto" ? "ltr" : direction);

    // If current align matches old default, switch to new default
    // Preserve center alignment explicitly
    if (obj.textAlign === "center") {
      updateObject(obj.id, { direction } as Partial<Omit<TextObject, "type">>);
    } else if (direction === "rtl" && obj.textAlign === "left") {
      updateObject(obj.id, { direction, textAlign: "right" } as Partial<Omit<TextObject, "type">>);
    } else if ((direction === "ltr" || direction === "auto") && obj.textAlign === "right") {
      updateObject(obj.id, { direction, textAlign: "left" } as Partial<Omit<TextObject, "type">>);
    } else {
      updateObject(obj.id, { direction } as Partial<Omit<TextObject, "type">>);
    }
  };

  // Opacity handler
  const handleOpacityChange = (value: number) => {
    // Skip history during live slider drag
    updateObject(obj.id, { opacity: value / 100 }, true);
  };

  const handleOpacityChangeEnd = (value: number) => {
    // Commit to history on slider release
    updateObject(obj.id, { opacity: value / 100 });
  };

  return (
    <div className="space-y-4">
      {/* Rich text indicator - shown when object has style overrides */}
      {hasStyleOverrides(obj.richContent) && (
        <div className="flex items-center justify-between gap-2 py-1.5 px-2 bg-amber-500/10 border border-amber-500/30 rounded">
          <span className="text-xs text-amber-400">Rich text: styles vary</span>
          <button
            type="button"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => updateObject(obj.id, { richContent: null } as any)}
            className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
          >
            Clear Formatting
          </button>
        </div>
      )}

      {/* FONT Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Font
        </h4>
        {/* Font Family - Interactive selector with cascade context */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Font Family</label>
          <div className="flex items-center gap-1">
            <div className="flex-1">
              <FontSelector
                currentFont={obj.fontFamily}
                globalFont={globalFont}
                onChange={(family) => updateObject(obj.id, { fontFamily: family } as Partial<Omit<TextObject, "type">>)}
                availableFonts={availableFonts}
              />
            </div>
            {obj.fontFamily !== null && (
              <button
                type="button"
                onClick={() => updateObject(obj.id, { fontFamily: null } as Partial<Omit<TextObject, "type">>)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Reset to Global Font"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumericInput
            label="Size"
            value={obj.fontSize}
            onChange={handleFontSizeChange}
            min={1}
            max={500}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Style</label>
            <div className="flex gap-1">
              <ToggleButton
                isActive={obj.fontWeight === "bold"}
                onClick={handleBoldToggle}
                title="Bold"
              >
                <span className="font-bold text-sm">B</span>
              </ToggleButton>
              <ToggleButton
                isActive={obj.fontStyle === "italic"}
                onClick={handleItalicToggle}
                title="Italic"
              >
                <span className="italic text-sm">I</span>
              </ToggleButton>
            </div>
          </div>
        </div>
      </div>

      {/* COLOR & STROKE Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Color & Stroke
        </h4>
        <ColorPicker
          label="Fill"
          color={obj.fill}
          onChange={handleFillChange}
        />
        {/* Stroke subsection */}
        <div className="flex items-center gap-2">
          <ToggleButton
            isActive={obj.strokeEnabled}
            onClick={handleStrokeToggle}
            title="Toggle Stroke"
            className="flex-shrink-0"
          >
            <span className="text-xs">S</span>
          </ToggleButton>
          <div
            className={`flex-1 flex gap-2 items-center ${
              !obj.strokeEnabled ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <div className="flex-1">
              <ColorPicker
                label="Color"
                color={obj.strokeColor}
                onChange={handleStrokeColorChange}
              />
            </div>
            <NumericInput
              label="Width"
              value={obj.strokeWidth}
              onChange={handleStrokeWidthChange}
              min={0}
              max={20}
            />
          </div>
        </div>
      </div>

      {/* TEXT STYLE Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Text Style
        </h4>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Decoration</label>
          <div className="flex gap-1">
            <ToggleButton
              isActive={hasUnderline}
              onClick={handleUnderlineToggle}
              title="Underline"
            >
              <span style={{ textDecoration: "underline" }} className="text-sm">U</span>
            </ToggleButton>
            <ToggleButton
              isActive={hasStrikethrough}
              onClick={handleStrikethroughToggle}
              title="Strikethrough"
            >
              <span style={{ textDecoration: "line-through" }} className="text-sm">S</span>
            </ToggleButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumericInput
            label="Letter Spacing"
            value={obj.letterSpacing}
            onChange={handleLetterSpacingChange}
            min={-10}
            max={50}
            step={1}
          />
          <NumericInput
            label="Line Height"
            value={obj.lineHeight}
            onChange={handleLineHeightChange}
            min={0.5}
            max={3.0}
            step={0.1}
          />
        </div>
      </div>

      {/* ALIGNMENT & DIRECTION Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Alignment & Direction
        </h4>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Alignment</label>
          <div className="flex gap-1">
            <ToggleButton
              isActive={obj.textAlign === "left"}
              onClick={() => handleAlignmentChange("left")}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToggleButton>
            <ToggleButton
              isActive={obj.textAlign === "center"}
              onClick={() => handleAlignmentChange("center")}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToggleButton>
            <ToggleButton
              isActive={obj.textAlign === "right"}
              onClick={() => handleAlignmentChange("right")}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </ToggleButton>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Direction</label>
          <div className="flex gap-1">
            <ToggleButton
              isActive={obj.direction === "auto"}
              onClick={() => handleDirectionChange("auto")}
              title="Auto Direction"
            >
              <span className="text-xs">Auto</span>
            </ToggleButton>
            <ToggleButton
              isActive={obj.direction === "rtl"}
              onClick={() => handleDirectionChange("rtl")}
              title="Right to Left"
            >
              <span className="text-xs">RTL</span>
            </ToggleButton>
            <ToggleButton
              isActive={obj.direction === "ltr"}
              onClick={() => handleDirectionChange("ltr")}
              title="Left to Right"
            >
              <span className="text-xs">LTR</span>
            </ToggleButton>
          </div>
        </div>
      </div>

      {/* POSITION & TRANSFORM Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Position & Transform
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <NumericInput
            label="X"
            value={obj.x}
            onChange={(v) => handlePositionChange("x", v)}
          />
          <NumericInput
            label="Y"
            value={obj.y}
            onChange={(v) => handlePositionChange("y", v)}
          />
          <NumericInput
            label="Width"
            value={obj.width}
            onChange={(v) => handleSizeChange("width", v)}
            min={1}
          />
          <NumericInput
            label="Rotation"
            value={obj.rotation}
            onChange={handleRotationChange}
            min={0}
            max={360}
            suffix="°"
          />
        </div>
        <SliderInput
          label="Opacity"
          value={Math.round(obj.opacity * 100)}
          onChange={handleOpacityChange}
          onChangeEnd={handleOpacityChangeEnd}
        />
      </div>

      {/* Blend Mode Section */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Blend Mode
        </label>
        <BlendModeSelect
          value={obj.blendMode}
          onChange={(value) => updateObject(obj.id, { blendMode: value } as Partial<Omit<TextObject, "type">>)}
        />
      </div>

      {/* Shadow Section */}
      <ShadowPanel
        shadowEnabled={obj.shadowEnabled}
        shadowColor={obj.shadowColor}
        shadowBlur={obj.shadowBlur}
        shadowOffsetX={obj.shadowOffsetX}
        shadowOffsetY={obj.shadowOffsetY}
        onChange={(partial) => updateObject(obj.id, partial as Partial<Omit<TextObject, "type">>)}
      />

      {/* Text Path Section */}
      <TextPathPanel obj={obj} />
    </div>
  );
}
