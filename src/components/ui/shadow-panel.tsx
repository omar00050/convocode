"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SliderInput from "@/components/ui/slider-input";
import ColorPicker from "@/components/ui/color-picker";

interface ShadowPanelProps {
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  onChange: (partial: {
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  }) => void;
}

/**
 * Collapsible panel for drop shadow settings.
 * Header toggles shadow on/off, content shows all shadow parameters.
 */
export default function ShadowPanel({
  shadowEnabled,
  shadowColor,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  onChange,
}: ShadowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(shadowEnabled);

  const handleHeaderClick = () => {
    const newEnabled = !shadowEnabled;
    onChange({ shadowEnabled: newEnabled });
    if (newEnabled && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={handleHeaderClick}
      >
        <button
          type="button"
          onClick={handleToggleExpand}
          className="p-0.5 text-gray-400 hover:text-gray-200"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Shadow
        </span>
        <div
          className={`ml-auto w-8 h-4 rounded-full transition-colors ${
            shadowEnabled ? "bg-blue-500" : "bg-[#444]"
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${
              shadowEnabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>

      {/* Content */}
      {isExpanded && shadowEnabled && (
        <div className="pl-5 space-y-3">
          {/* Shadow Color */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-16">Color</span>
            <ColorPicker
              color={shadowColor}
              onChange={(color) => onChange({ shadowColor: color })}
            />
          </div>

          {/* Blur */}
          <SliderInput
            label="Blur"
            value={shadowBlur}
            onChange={(v) => onChange({ shadowBlur: v })}
            min={0}
            max={50}
            step={1}
            suffix=""
          />

          {/* Offset X */}
          <SliderInput
            label="Offset X"
            value={shadowOffsetX}
            onChange={(v) => onChange({ shadowOffsetX: v })}
            min={-50}
            max={50}
            step={1}
            suffix=""
          />

          {/* Offset Y */}
          <SliderInput
            label="Offset Y"
            value={shadowOffsetY}
            onChange={(v) => onChange({ shadowOffsetY: v })}
            min={-50}
            max={50}
            step={1}
            suffix=""
          />
        </div>
      )}
    </div>
  );
}
