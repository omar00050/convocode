"use client";

import { useEditorStore } from "@/stores/editor-store";
import NumericInput from "@/components/ui/numeric-input";
import ColorPicker from "@/components/ui/color-picker";
import type { BackgroundType } from "@/types/gradient";

export default function CanvasProperties() {
  const {
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundType,
    updateCanvas,
  } = useEditorStore();

  const handleBackgroundTypeChange = (type: BackgroundType | "linearGradient" | "radialGradient") => {
    if (type === "solid") {
      updateCanvas({ backgroundType: "solid" });
    } else if (type === "linearGradient") {
      updateCanvas({
        backgroundType: "gradient",
        backgroundGradient: {
          type: "linear",
          angle: 0,
          centerX: 0.5,
          centerY: 0.5,
          radius: 0.5,
          stops: [
            { color: "#000000", position: 0 },
            { color: "#ffffff", position: 1 },
          ],
        },
      });
    } else if (type === "radialGradient") {
      updateCanvas({
        backgroundType: "gradient",
        backgroundGradient: {
          type: "radial",
          angle: 0,
          centerX: 0.5,
          centerY: 0.5,
          radius: 0.5,
          stops: [
            { color: "#ffffff", position: 0 },
            { color: "#000000", position: 1 },
          ],
        },
      });
    }
  };

  // Determine active toggle state
  const getActiveToggle = (): "solid" | "linearGradient" | "radialGradient" => {
    if (backgroundType === "solid") return "solid";
    // For now, gradient type is determined by backgroundGradient.type
    const bgGradient = useEditorStore.getState().backgroundGradient;
    if (bgGradient?.type === "radial") return "radialGradient";
    return "linearGradient";
  };

  const activeToggle = getActiveToggle();

  const toggleButtonClass = (isActive: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded transition-colors ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-[#333] text-gray-300 hover:bg-[#444]"
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Canvas Title */}
      <h3 className="text-sm font-semibold text-gray-300">Canvas</h3>

      {/* Dimensions Section */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-400">Dimensions</span>
        <div className="flex gap-3">
          <NumericInput
            label="Width"
            value={canvasWidth}
            onChange={(val) => updateCanvas({ canvasWidth: val })}
            min={1}
            max={8000}
          />
          <NumericInput
            label="Height"
            value={canvasHeight}
            onChange={(val) => updateCanvas({ canvasHeight: val })}
            min={1}
            max={8000}
          />
        </div>
      </div>

      {/* Background Section */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-400">Background</span>

        {/* 3-way toggle for background type */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleBackgroundTypeChange("solid")}
            className={toggleButtonClass(activeToggle === "solid")}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => handleBackgroundTypeChange("linearGradient")}
            className={toggleButtonClass(activeToggle === "linearGradient")}
          >
            Linear Gradient
          </button>
          <button
            type="button"
            onClick={() => handleBackgroundTypeChange("radialGradient")}
            className={toggleButtonClass(activeToggle === "radialGradient")}
          >
            Radial Gradient
          </button>
        </div>

        {/* Solid color picker */}
        {backgroundType === "solid" && (
          <ColorPicker
            label="Color"
            color={backgroundColor}
            onChange={(color) => updateCanvas({ backgroundColor: color })}
          />
        )}

        {/* Gradient editors - placeholder for now, will be wired in T010/T014 */}
        {backgroundType === "gradient" && (
          <div className="text-xs text-gray-500 italic py-2">
            Gradient editor will be implemented in next phase
          </div>
        )}
      </div>
    </div>
  );
}
