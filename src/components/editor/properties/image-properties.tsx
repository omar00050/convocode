"use client";

import { FlipHorizontal, FlipVertical, Crop } from "lucide-react";
import type { ImageObject, MaskType } from "@/types/editor";
import { useEditorStore } from "@/stores/editor-store";
import NumericInput from "@/components/ui/numeric-input";
import SliderInput from "@/components/ui/slider-input";
import BlendModeSelect from "@/components/ui/blend-mode-select";
import ShadowPanel from "@/components/ui/shadow-panel";

const MASK_OPTIONS: { type: MaskType; label: string; icon: React.ReactNode }[] = [
  {
    type: "none",
    label: "None",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <rect x="2" y="2" width="16" height="16" />
      </svg>
    ),
  },
  {
    type: "circle",
    label: "Circle",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <ellipse cx="10" cy="10" rx="8" ry="8" />
      </svg>
    ),
  },
  {
    type: "roundedRect",
    label: "Rounded",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <rect x="2" y="2" width="16" height="16" rx="5" ry="5" />
      </svg>
    ),
  },
  {
    type: "star",
    label: "Star",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <polygon points="10,1 12.5,7.5 19,7.5 14,12 16,19 10,15 4,19 6,12 1,7.5 7.5,7.5" />
      </svg>
    ),
  },
  {
    type: "heart",
    label: "Heart",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <path d="M10 17 C4 12 1 8 1 5.5 C1 3 3 1 5.5 1 C7.5 1 9 2.5 10 4 C11 2.5 12.5 1 14.5 1 C17 1 19 3 19 5.5 C19 8 16 12 10 17Z" />
      </svg>
    ),
  },
  {
    type: "hexagon",
    label: "Hexagon",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" />
      </svg>
    ),
  },
  {
    type: "diamond",
    label: "Diamond",
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <polygon points="10,1 19,10 10,19 1,10" />
      </svg>
    ),
  },
];

interface ImagePropertiesProps {
  obj: ImageObject;
}

export default function ImageProperties({ obj }: ImagePropertiesProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const flipObject = useEditorStore((state) => state.flipObject);
  const cropMode = useEditorStore((state) => state.cropMode);
  const enterCropMode = useEditorStore((state) => state.enterCropMode);
  const exitCropMode = useEditorStore((state) => state.exitCropMode);

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
    // Skip history during live slider drag
    updateObject(obj.id, { opacity: value / 100 }, true);
  };

  const handleOpacityChangeEnd = (value: number) => {
    // Commit to history on slider release
    updateObject(obj.id, { opacity: value / 100 });
  };

  const handleFlipX = () => {
    flipObject(obj.id, "x");
  };

  const handleFlipY = () => {
    flipObject(obj.id, "y");
  };

  return (
    <div className="space-y-4">
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

      {/* Flip Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Flip
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleFlipX}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
              obj.flipX
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
            <span className="text-xs">Flip H</span>
          </button>
          <button
            type="button"
            onClick={handleFlipY}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
              obj.flipY
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
            }`}
          >
            <FlipVertical className="w-4 h-4" />
            <span className="text-xs">Flip V</span>
          </button>
        </div>
      </div>

      {/* Crop Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Crop
        </h4>
        <button
          type="button"
          onClick={() => enterCropMode(obj.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-[#333] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
        >
          <Crop className="w-4 h-4" />
          <span className="text-xs">Crop Image</span>
        </button>
      </div>

      {/* Shape / Mask Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Shape
        </h4>
        <div className="grid grid-cols-4 gap-1.5">
          {MASK_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              title={opt.label}
              onClick={() => updateObject(obj.id, { maskType: opt.type } as any)}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded border transition-colors ${
                obj.maskType === opt.type
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
              }`}
            >
              {opt.icon}
              <span className="text-[9px] leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
        {obj.maskType === "roundedRect" && (
          <SliderInput
            label="Corner Radius"
            value={obj.maskRadius}
            onChange={(v) => updateObject(obj.id, { maskRadius: v } as any, true)}
            onChangeEnd={(v) => updateObject(obj.id, { maskRadius: v } as any)}
            min={0}
            max={Math.round(Math.min(obj.width, obj.height) / 2)}
            suffix="px"
          />
        )}
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
          onChange={(value) => updateObject(obj.id, { blendMode: value })}
        />
      </div>

      {/* Shadow Section */}
      <ShadowPanel
        shadowEnabled={obj.shadowEnabled}
        shadowColor={obj.shadowColor}
        shadowBlur={obj.shadowBlur}
        shadowOffsetX={obj.shadowOffsetX}
        shadowOffsetY={obj.shadowOffsetY}
        onChange={(partial) => updateObject(obj.id, partial)}
      />
    </div>
  );
}
