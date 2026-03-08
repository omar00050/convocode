"use client";

import { useRef, useState, useCallback } from "react";
import type { GradientDef, GradientStop } from "@/types/gradient";
import {
  GRADIENT_PRESETS,
  DEFAULT_LINEAR_GRADIENT,
  DEFAULT_RADIAL_GRADIENT,
} from "@/types/gradient";
import AnglePicker from "./angle-picker";
import ColorPicker from "./color-picker";
import NumericInput from "./numeric-input";

interface GradientEditorProps {
  value: GradientDef;
  onChange: (g: GradientDef) => void;
  showAngle?: boolean;
  showCenter?: boolean;
  showPresets?: boolean;
}

/**
 * Helper to convert gradient stops to CSS gradient string
 */
function stopsToCSS(stops: GradientStop[]): string {
  return stops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(", ");
}

/**
 * Interpolate color between two hex colors at a given position
 */
function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const hex1 = color1.replace("#", "");
  const hex2 = color2.replace("#", "");

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default function GradientEditor({
  value,
  onChange,
  showAngle = true,
  showCenter = true,
  showPresets = true,
}: GradientEditorProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Compute CSS gradient for preview bar
  const previewGradient =
    value.type === "linear"
      ? `linear-gradient(${90 + value.angle}deg, ${stopsToCSS(value.stops)})`
      : `radial-gradient(circle at ${value.centerX * 100}% ${value.centerY * 100}%, ${stopsToCSS(value.stops)})`;

  // Handle stop drag
  const handleStopMouseDown = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.preventDefault();
      setSelectedStopIndex(idx);

      const bar = barRef.current;
      if (!bar) return;

      const onMove = (me: MouseEvent) => {
        const rect = bar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));

        const newStops = [...value.stops];
        newStops[idx] = { ...newStops[idx], position: pos };
        // Sort stops by position
        newStops.sort((a, b) => a.position - b.position);

        onChange({ ...value, stops: newStops });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [value, onChange]
  );

  // Handle color change for selected stop
  const handleStopColorChange = useCallback(
    (color: string) => {
      const newStops = [...value.stops];
      newStops[selectedStopIndex] = { ...newStops[selectedStopIndex], color };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange, selectedStopIndex]
  );

  // Add a new stop at midpoint
  const handleAddStop = useCallback(() => {
    if (value.stops.length >= 10) return;

    // Find the largest gap between stops
    let maxGap = 0;
    let gapIndex = 0;
    for (let i = 0; i < value.stops.length - 1; i++) {
      const gap = value.stops[i + 1].position - value.stops[i].position;
      if (gap > maxGap) {
        maxGap = gap;
        gapIndex = i;
      }
    }

    const stop1 = value.stops[gapIndex];
    const stop2 = value.stops[gapIndex + 1];
    const newPos = (stop1.position + stop2.position) / 2;
    const t = (newPos - stop1.position) / (stop2.position - stop1.position);
    const newColor = interpolateColor(stop1.color, stop2.color, t);

    const newStops = [...value.stops, { color: newColor, position: newPos }];
    newStops.sort((a, b) => a.position - b.position);

    onChange({ ...value, stops: newStops });
    setSelectedStopIndex(newStops.findIndex((s) => s.position === newPos));
  }, [value, onChange]);

  // Remove selected stop
  const handleRemoveStop = useCallback(() => {
    if (value.stops.length <= 2) return;

    const newStops = value.stops.filter((_, idx) => idx !== selectedStopIndex);
    onChange({ ...value, stops: newStops });
    setSelectedStopIndex(Math.min(selectedStopIndex, newStops.length - 1));
  }, [value, onChange, selectedStopIndex]);

  // Handle angle change
  const handleAngleChange = useCallback(
    (angle: number) => {
      onChange({ ...value, angle });
    },
    [value, onChange]
  );

  // Handle center/radius change for radial
  const handleCenterXChange = useCallback(
    (val: number) => {
      onChange({ ...value, centerX: val / 100 });
    },
    [value, onChange]
  );

  const handleCenterYChange = useCallback(
    (val: number) => {
      onChange({ ...value, centerY: val / 100 });
    },
    [value, onChange]
  );

  const handleRadiusChange = useCallback(
    (val: number) => {
      onChange({ ...value, radius: val / 100 });
    },
    [value, onChange]
  );

  // Handle preset click
  const handlePresetClick = useCallback(
    (preset: (typeof GRADIENT_PRESETS)[number]) => {
      const { name: _, ...gradientDef } = preset;
      onChange(gradientDef);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Preview bar */}
      <div
        className="w-full h-6 rounded-md border border-[#555]"
        style={{ background: previewGradient }}
      />

      {/* Stop markers row */}
      <div
        ref={barRef}
        className="relative h-5 w-full bg-[#333] rounded border border-[#555]"
      >
        {value.stops.map((stop, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedStopIndex(idx)}
            onMouseDown={(e) => handleStopMouseDown(idx, e)}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-pointer transition-transform ${
              idx === selectedStopIndex
                ? "border-blue-500 scale-110 z-10"
                : "border-gray-400 hover:scale-105"
            }`}
            style={{
              left: `${stop.position * 100}%`,
              backgroundColor: stop.color,
            }}
            title={`${stop.color} at ${Math.round(stop.position * 100)}%`}
          />
        ))}
      </div>

      {/* Selected stop color picker */}
      {value.stops[selectedStopIndex] && (
        <ColorPicker
          label="Stop Color"
          color={value.stops[selectedStopIndex].color}
          onChange={handleStopColorChange}
        />
      )}

      {/* Add/Remove buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAddStop}
          disabled={value.stops.length >= 10}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-[#333] text-gray-300 hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Add Stop
        </button>
        <button
          type="button"
          onClick={handleRemoveStop}
          disabled={value.stops.length <= 2}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-[#333] text-gray-300 hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Remove Stop
        </button>
      </div>

      {/* Angle control (linear only) */}
      {showAngle && value.type === "linear" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Angle</span>
          <AnglePicker value={value.angle} onChange={handleAngleChange} />
          <NumericInput
            label=""
            value={value.angle}
            onChange={handleAngleChange}
            min={0}
            max={360}
            suffix="°"
          />
        </div>
      )}

      {/* Center/Radius controls (radial only) */}
      {showCenter && value.type === "radial" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400">Center & Radius</span>
          <div className="flex gap-3">
            <NumericInput
              label="Center X"
              value={Math.round(value.centerX * 100)}
              onChange={handleCenterXChange}
              min={0}
              max={100}
              suffix="%"
            />
            <NumericInput
              label="Center Y"
              value={Math.round(value.centerY * 100)}
              onChange={handleCenterYChange}
              min={0}
              max={100}
              suffix="%"
            />
            <NumericInput
              label="Radius"
              value={Math.round(value.radius * 100)}
              onChange={handleRadiusChange}
              min={1}
              max={100}
              suffix="%"
            />
          </div>
        </div>
      )}

      {/* Presets row */}
      {showPresets && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400">Presets</span>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {GRADIENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="flex-shrink-0 w-8 h-6 rounded border border-[#555] hover:border-blue-500 transition-colors"
                style={{
                  background: `linear-gradient(${90 + preset.angle}deg, ${stopsToCSS(preset.stops)})`,
                }}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export constants for convenience
export { DEFAULT_LINEAR_GRADIENT, DEFAULT_RADIAL_GRADIENT };
