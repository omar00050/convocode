"use client";

import { useState } from "react";
import { Minus, Spline, Circle, Waves, ChevronDown, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import SliderInput from "@/components/ui/slider-input";
import AnglePicker from "@/components/ui/angle-picker";
import type { TextObject } from "@/types/editor";

interface TextPathPanelProps {
  obj: TextObject;
}

type PathType = "none" | "arc" | "circle" | "wave";

export default function TextPathPanel({ obj }: TextPathPanelProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const [collapsed, setCollapsed] = useState(true);

  const currentType: PathType = obj.textPathType ?? "none";

  const handleTypeChange = (type: PathType) => {
    updateObject(obj.id, { textPathType: type } as Parameters<typeof updateObject>[1]);
  };

  const pathTypes: { type: PathType; icon: React.ReactNode; label: string }[] = [
    { type: "none", icon: <Minus size={14} />, label: "None" },
    { type: "arc", icon: <Spline size={14} />, label: "Arc" },
    { type: "circle", icon: <Circle size={14} />, label: "Circle" },
    { type: "wave", icon: <Waves size={14} />, label: "Wave" },
  ];

  const btnBase = "flex items-center justify-center flex-1 py-1.5 rounded text-xs transition-colors";
  const btnActive = "bg-blue-600 text-white";
  const btnInactive = "bg-[#3a3a3a] text-gray-400 hover:bg-[#444]";

  return (
    <div className="space-y-2">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 w-full text-left"
      >
        {collapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Text Path</h4>
      </button>

      {!collapsed && (
        <div className="space-y-3 pl-3">
          {/* Path type selector */}
          <div className="flex gap-1">
            {pathTypes.map(({ type, icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`${btnBase} ${currentType === type ? btnActive : btnInactive}`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Arc controls */}
          {currentType === "arc" && (
            <div className="space-y-2">
              <SliderInput
                label="Radius"
                value={obj.textPathRadius ?? 300}
                min={50}
                max={2000}
                step={1}
                suffix="px"
                onChange={(v) => updateObject(obj.id, { textPathRadius: v } as Parameters<typeof updateObject>[1], true)}
                onChangeEnd={(v) => updateObject(obj.id, { textPathRadius: v } as Parameters<typeof updateObject>[1])}
              />

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Direction</label>
                <div className="flex gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => updateObject(obj.id, { textPathDirection: dir } as Parameters<typeof updateObject>[1])}
                      className={`${btnBase} ${(obj.textPathDirection ?? "up") === dir ? btnActive : btnInactive}`}
                    >
                      {dir === "up" ? "⌒ Upward" : "⌣ Downward"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Start Angle</label>
                <AnglePicker
                  value={obj.textPathStartAngle ?? 0}
                  onChange={(v) => updateObject(obj.id, { textPathStartAngle: v } as Parameters<typeof updateObject>[1])}
                />
              </div>
            </div>
          )}

          {/* Circle controls */}
          {currentType === "circle" && (
            <div className="space-y-2">
              <SliderInput
                label="Radius"
                value={obj.textPathRadius ?? 150}
                min={50}
                max={500}
                step={1}
                suffix="px"
                onChange={(v) => updateObject(obj.id, { textPathRadius: v } as Parameters<typeof updateObject>[1], true)}
                onChangeEnd={(v) => updateObject(obj.id, { textPathRadius: v } as Parameters<typeof updateObject>[1])}
              />

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Start Angle</label>
                <AnglePicker
                  value={obj.textPathStartAngle ?? 0}
                  onChange={(v) => updateObject(obj.id, { textPathStartAngle: v } as Parameters<typeof updateObject>[1])}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Clockwise</label>
                <button
                  type="button"
                  onClick={() => updateObject(obj.id, { textPathClockwise: !(obj.textPathClockwise ?? true) } as Parameters<typeof updateObject>[1])}
                  className={`w-8 h-5 rounded transition-colors ${(obj.textPathClockwise ?? true) ? "bg-blue-600" : "bg-[#3a3a3a]"}`}
                >
                  <span className={`block w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${(obj.textPathClockwise ?? true) ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Wave controls */}
          {currentType === "wave" && (
            <div className="space-y-2">
              <SliderInput
                label="Amplitude"
                value={obj.textPathAmplitude ?? 30}
                min={5}
                max={100}
                step={1}
                suffix="px"
                onChange={(v) => updateObject(obj.id, { textPathAmplitude: v } as Parameters<typeof updateObject>[1], true)}
                onChangeEnd={(v) => updateObject(obj.id, { textPathAmplitude: v } as Parameters<typeof updateObject>[1])}
              />

              <SliderInput
                label="Wavelength"
                value={obj.textPathWavelength ?? 200}
                min={50}
                max={500}
                step={1}
                suffix="px"
                onChange={(v) => updateObject(obj.id, { textPathWavelength: v } as Parameters<typeof updateObject>[1], true)}
                onChangeEnd={(v) => updateObject(obj.id, { textPathWavelength: v } as Parameters<typeof updateObject>[1])}
              />

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Phase</label>
                <AnglePicker
                  value={obj.textPathPhase ?? 0}
                  onChange={(v) => updateObject(obj.id, { textPathPhase: v } as Parameters<typeof updateObject>[1])}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
