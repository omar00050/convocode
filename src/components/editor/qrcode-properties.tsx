"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { QRCodeObject } from "@/types/editor";
import { useEditorStore } from "@/stores/editor-store";
import NumericInput from "@/components/ui/numeric-input";
import SliderInput from "@/components/ui/slider-input";
import BlendModeSelect from "@/components/ui/blend-mode-select";
import ShadowPanel from "@/components/ui/shadow-panel";
import ColorPicker from "@/components/ui/color-picker";

interface QRCodePropertiesProps {
  obj: QRCodeObject;
}

// Maximum capacity at level M for version 10
const MAX_CAPACITY_M = 213;

// Capacity at each EC level for version 10
const CAPACITY_BY_LEVEL: Record<string, number> = {
  L: 271,
  M: 213,
  Q: 151,
  H: 119,
};

export default function QRCodeProperties({ obj }: QRCodePropertiesProps) {
  const updateObject = useEditorStore((state) => state.updateObject);

  // Debounced data input
  const [localData, setLocalData] = useState(obj.data);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when obj.data changes externally
  useEffect(() => {
    setLocalData(obj.data);
  }, [obj.data]);

  // Debounced data update (300ms)
  const debouncedUpdateData = useCallback((value: string) => {
    setLocalData(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateObject(obj.id, { data: value } as Partial<Omit<QRCodeObject, "type">>);
    }, 300);
  }, [obj.id, updateObject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handlePositionChange = (field: "x" | "y", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleSizeChange = (field: "width" | "height", value: number) => {
    updateObject(obj.id, { [field]: value });
  };

  const handleRotationChange = (value: number) => {
    updateObject(obj.id, { rotation: value });
  };

  const handleOpacityChange = (value: number) => {
    updateObject(obj.id, { opacity: value / 100 }, true);
  };

  const handleOpacityChangeEnd = (value: number) => {
    updateObject(obj.id, { opacity: value / 100 });
  };

  const handleECLevelChange = (value: "L" | "M" | "Q" | "H") => {
    updateObject(obj.id, { errorCorrectionLevel: value } as Partial<Omit<QRCodeObject, "type">>);
  };

  const handleForegroundColorChange = (value: string) => {
    updateObject(obj.id, { foregroundColor: value } as Partial<Omit<QRCodeObject, "type">>);
  };

  const handleBackgroundColorChange = (value: string) => {
    updateObject(obj.id, { backgroundColor: value } as Partial<Omit<QRCodeObject, "type">>);
  };

  const handleStyleChange = (value: "square" | "rounded" | "dots") => {
    updateObject(obj.id, { style: value } as Partial<Omit<QRCodeObject, "type">>);
  };

  const handlePaddingChange = (value: number) => {
    updateObject(obj.id, { padding: value } as Partial<Omit<QRCodeObject, "type">>);
  };

  // Calculate capacity and check if data is too long
  const maxCapacity = CAPACITY_BY_LEVEL[obj.errorCorrectionLevel];
  const dataLength = new TextEncoder().encode(localData).length;
  const isOverCapacity = dataLength > maxCapacity;

  return (
    <div className="space-y-4">
      {/* Data Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          QR Data
        </h4>
        <textarea
          value={localData}
          onChange={(e) => debouncedUpdateData(e.target.value)}
          placeholder="Enter URL or text..."
          rows={3}
          className="w-full px-2 py-1.5 bg-[#333] border border-[#555] rounded text-sm text-gray-200 placeholder-gray-500 resize-none focus:border-blue-500 focus:outline-none"
        />
        <div className="flex justify-between text-xs">
          <span className={isOverCapacity ? "text-red-400" : "text-gray-500"}>
            {dataLength} / {maxCapacity} bytes
          </span>
          <span className="text-gray-500">
            Level {obj.errorCorrectionLevel}
          </span>
        </div>
        {isOverCapacity && (
          <p className="text-xs text-red-400">
            Data too long for QR code. Reduce text or lower error correction level.
          </p>
        )}
      </div>

      {/* Error Correction Level */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Error Correction
        </h4>
        <div className="flex gap-1">
          {(["L", "M", "Q", "H"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleECLevelChange(level)}
              className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                obj.errorCorrectionLevel === level
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
              }`}
            >
              {level === "L" && "Low"}
              {level === "M" && "Medium"}
              {level === "Q" && "Quartile"}
              {level === "H" && "High"}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Colors
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker
            label="Foreground"
            color={obj.foregroundColor}
            onChange={handleForegroundColorChange}
          />
          <ColorPicker
            label="Background"
            color={obj.backgroundColor}
            onChange={handleBackgroundColorChange}
          />
        </div>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Style
        </h4>
        <div className="flex gap-1">
          {(["square", "rounded", "dots"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => handleStyleChange(style)}
              className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors capitalize ${
                obj.style === style
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <SliderInput
          label="Padding (modules)"
          value={obj.padding}
          onChange={handlePaddingChange}
          min={0}
          max={4}
          step={1}
        />
      </div>

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
            min={10}
          />
          <NumericInput
            label="Height"
            value={obj.height}
            onChange={(v) => handleSizeChange("height", v)}
            min={10}
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
          onChange={(value) => updateObject(obj.id, { blendMode: value } as Partial<Omit<QRCodeObject, "type">>)}
        />
      </div>

      {/* Shadow Section */}
      <ShadowPanel
        shadowEnabled={obj.shadowEnabled}
        shadowColor={obj.shadowColor}
        shadowBlur={obj.shadowBlur}
        shadowOffsetX={obj.shadowOffsetX}
        shadowOffsetY={obj.shadowOffsetY}
        onChange={(partial) => updateObject(obj.id, partial as Partial<Omit<QRCodeObject, "type">>)}
      />
    </div>
  );
}
