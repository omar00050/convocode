"use client";

import { Edit2 } from "lucide-react";
import type { ShapeObject } from "@/types/editor";
import { DEFAULT_PATTERN } from "@/types/pattern";
import { useEditorStore } from "@/stores/editor-store";
import NumericInput from "@/components/ui/numeric-input";
import ColorPicker from "@/components/ui/color-picker";
import SliderInput from "@/components/ui/slider-input";
import BlendModeSelect from "@/components/ui/blend-mode-select";
import ShadowPanel from "@/components/ui/shadow-panel";

interface ShapePropertiesProps {
  obj: ShapeObject;
}

export default function ShapeProperties({ obj }: ShapePropertiesProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const setEditingCustomShapeId = useEditorStore((state) => state.setEditingCustomShapeId);

  const handlePositionChange = (field: "x" | "y", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleSizeChange = (field: "width" | "height", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleRotationChange = (value: number) => {
    updateObject(obj.id, { rotation: value });
  };

  const handleFillChange = (color: string) => {
    updateObject(obj.id, { fill: color } as Partial<ShapeObject>);
  };

  const handleStrokeColorChange = (color: string) => {
    updateObject(obj.id, { stroke: color } as Partial<ShapeObject>);
  };

  const handleStrokeWidthChange = (value: number) => {
    updateObject(obj.id, { strokeWidth: value } as Partial<ShapeObject>);
  };

  const handleCornerRadiusChange = (value: number) => {
    updateObject(obj.id, { cornerRadius: value } as Partial<ShapeObject>);
  };

  const handleOpacityChange = (value: number) => {
    // Skip history during live slider drag
    updateObject(obj.id, { opacity: value / 100 }, true);
  };

  const handleOpacityChangeEnd = (value: number) => {
    // Commit to history on slider release
    updateObject(obj.id, { opacity: value / 100 });
  };

  const handleFillTypeChange = (fillType: "solid" | "pattern") => {
    if (fillType === "pattern") {
      updateObject(obj.id, {
        fillType: "pattern",
        fillPattern: obj.fillPattern ?? DEFAULT_PATTERN,
      } as Partial<ShapeObject>);
    } else {
      updateObject(obj.id, { fillType: "solid" } as Partial<ShapeObject>);
    }
  };

  const handlePatternChange = (partial: Partial<typeof DEFAULT_PATTERN>) => {
    updateObject(obj.id, {
      fillPattern: { ...(obj.fillPattern ?? DEFAULT_PATTERN), ...partial },
    } as Partial<ShapeObject>);
  };

  const currentFillType = obj.fillType ?? "solid";

  return (
    <div className="space-y-4">
      {/* Icon name label - only for icon shapes */}
      {obj.shapeType === "icon" && obj.iconName && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Icon</h4>
          <p className="text-xs text-gray-400 font-mono bg-[#1a1a1a] px-2 py-1.5 rounded border border-[#333]">
            {obj.iconName}
          </p>
        </div>
      )}

      {/* Custom shape controls */}
      {obj.shapeType === "custom" && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custom Shape</h4>
          <button
            type="button"
            onClick={() => setEditingCustomShapeId(obj.id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
          >
            <Edit2 size={14} />
            Edit Points
          </button>
        </div>
      )}

      {/* Position & Size Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Position & Size
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
            label="Height"
            value={obj.height}
            onChange={(v) => handleSizeChange("height", v)}
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
      </div>

      {/* Fill Type Section - hidden for icons */}
      {obj.shapeType !== "icon" && (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Fill Type
        </h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleFillTypeChange("solid")}
            className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
              currentFillType === "solid"
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
            }`}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => handleFillTypeChange("pattern")}
            className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
              currentFillType === "pattern"
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
            }`}
          >
            Pattern
          </button>
        </div>
      </div>
      )}

      {/* Icon color - stroke-based fill */}
      {obj.shapeType === "icon" && (
        <div className="space-y-2">
          <ColorPicker
            label="Icon Color"
            color={obj.fill}
            onChange={handleFillChange}
          />
        </div>
      )}

      {/* Fill Section - Solid color */}
      {obj.shapeType !== "icon" && currentFillType === "solid" && (
        <div className="space-y-2">
          <ColorPicker
            label="Fill Color"
            color={obj.fill}
            onChange={handleFillChange}
          />
        </div>
      )}

      {/* Pattern Fill Section - hidden for icons */}
      {obj.shapeType !== "icon" && currentFillType === "pattern" && (
        <div className="space-y-3">
          {/* Pattern Preview */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Pattern</label>
            <select
              value={obj.fillPattern?.patternType ?? "dots"}
              onChange={(e) => handlePatternChange({ patternType: e.target.value as typeof DEFAULT_PATTERN.patternType })}
              className="w-full px-2 py-1.5 bg-[#333] border border-[#555] rounded text-sm text-gray-200
                focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="dots">Dots</option>
              <option value="horizontalLines">Horizontal Lines</option>
              <option value="verticalLines">Vertical Lines</option>
              <option value="diagonalLines">Diagonal Lines</option>
              <option value="diagonalLinesReverse">Diagonal Lines Reverse</option>
              <option value="crosshatch">Crosshatch</option>
              <option value="diagonalCrosshatch">Diagonal Crosshatch</option>
              <option value="grid">Grid</option>
              <option value="chevron">Chevron</option>
              <option value="waves">Waves</option>
            </select>
          </div>

          {/* Pattern Colors */}
          <div className="grid grid-cols-2 gap-2">
            <ColorPicker
              label="Pattern Color"
              color={obj.fillPattern?.foregroundColor ?? "#000000"}
              onChange={(color) => handlePatternChange({ foregroundColor: color })}
            />
            <ColorPicker
              label="Background"
              color={obj.fillPattern?.backgroundColor ?? "transparent"}
              onChange={(color) => handlePatternChange({ backgroundColor: color })}
            />
          </div>

          {/* Scale */}
          <SliderInput
            label="Scale"
            value={(obj.fillPattern?.scale ?? 1) * 10}
            onChange={(v) => handlePatternChange({ scale: v / 10 })}
            min={5}
            max={30}
            step={1}
            suffix="x"
          />

          {/* Rotation */}
          <SliderInput
            label="Rotation"
            value={obj.fillPattern?.rotation ?? 0}
            onChange={(v) => handlePatternChange({ rotation: v })}
            min={0}
            max={360}
            step={1}
            suffix="°"
          />
        </div>
      )}

      {/* Stroke Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Stroke
        </h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <ColorPicker
              label="Color"
              color={obj.stroke}
              onChange={handleStrokeColorChange}
            />
          </div>
          <NumericInput
            label="Width"
            value={obj.strokeWidth}
            onChange={handleStrokeWidthChange}
            min={0}
            max={50}
          />
        </div>
      </div>

      {/* Corner Radius Section - Only for rectangles (hidden for icons) */}
      {obj.shapeType === "rect" && (
        <div className="space-y-2">
          <NumericInput
            label="Corner Radius"
            value={obj.cornerRadius ?? 0}
            onChange={handleCornerRadiusChange}
            min={0}
            max={100}
          />
        </div>
      )}

      {/* Opacity Section */}
      <div className="space-y-2">
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
          onChange={(value) => updateObject(obj.id, { blendMode: value } as Partial<ShapeObject>)}
        />
      </div>

      {/* Shadow Section */}
      <ShadowPanel
        shadowEnabled={obj.shadowEnabled}
        shadowColor={obj.shadowColor}
        shadowBlur={obj.shadowBlur}
        shadowOffsetX={obj.shadowOffsetX}
        shadowOffsetY={obj.shadowOffsetY}
        onChange={(partial) => updateObject(obj.id, partial as Partial<ShapeObject>)}
      />
    </div>
  );
}
