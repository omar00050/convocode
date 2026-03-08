"use client";

import { useState, useMemo } from "react";
import { useEditorStore } from "@/stores/editor-store";
import PresetRatioCard from "./preset-ratio-card";
import CustomDimensionsForm from "./custom-dimensions-form";
import ImageUploadStarter from "./image-upload-starter";

interface NewProjectScreenProps {
  onProjectCreated: () => void;
}

type TabType = "presets" | "custom" | "image";

interface PresetRatio {
  label: string;
  ratio: number;
  defaultWidth: number;
  defaultHeight: number;
}

const PRESET_RATIOS: PresetRatio[] = [
  { label: "1:1", ratio: 1, defaultWidth: 1080, defaultHeight: 1080 },
  { label: "16:9", ratio: 16 / 9, defaultWidth: 1920, defaultHeight: 1080 },
  { label: "9:16", ratio: 9 / 16, defaultWidth: 1080, defaultHeight: 1920 },
  { label: "4:3", ratio: 4 / 3, defaultWidth: 1440, defaultHeight: 1080 },
  { label: "3:2", ratio: 3 / 2, defaultWidth: 1620, defaultHeight: 1080 },
];

export default function NewProjectScreen({ onProjectCreated }: NewProjectScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>("presets");
  const [selectedRatioIndex, setSelectedRatioIndex] = useState<number | null>(null);
  const [presetWidth, setPresetWidth] = useState<string>("");
  const [presetHeight, setPresetHeight] = useState<string>("");
  const [presetError, setPresetError] = useState<string | null>(null);

  const selectedPreset = useMemo(() => {
    if (selectedRatioIndex === null) return null;
    return PRESET_RATIOS[selectedRatioIndex];
  }, [selectedRatioIndex]);

  const validateDimension = (value: string): { isValid: boolean; error: string | null; parsed: number | null } => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return { isValid: false, error: null, parsed: null };
    }

    const num = Number(trimmed);
    if (isNaN(num)) {
      return { isValid: false, error: "Must be a number", parsed: null };
    }

    const rounded = Math.round(num);
    if (rounded < 100) {
      return { isValid: false, error: "Minimum value is 100", parsed: null };
    }

    if (rounded > 4096) {
      return { isValid: false, error: "Maximum value is 4096", parsed: null };
    }

    return { isValid: true, error: null, parsed: rounded };
  };

  const validatePresetDimensions = (): boolean => {
    const widthResult = validateDimension(presetWidth);
    const heightResult = validateDimension(presetHeight);

    if (widthResult.error || heightResult.error) {
      setPresetError(widthResult.error || heightResult.error || null);
      return false;
    }

    // Ratio lock: verify both dimensions maintain the selected ratio
    if (selectedPreset) {
      const ratio = selectedPreset.ratio;
      const expectedHeight = Math.round((widthResult.parsed || 0) / ratio);
      const expectedWidth = Math.round((heightResult.parsed || 0) * ratio);

      if (heightResult.parsed !== expectedHeight && widthResult.parsed !== expectedWidth) {
        setPresetError("Resulting dimension exceeds valid range");
        return false;
      }
    }

    setPresetError(null);
    return true;
  };

  const handlePresetSelect = (index: number) => {
    setSelectedRatioIndex(index);
    const preset = PRESET_RATIOS[index];
    setPresetWidth(preset.defaultWidth.toString());
    setPresetHeight(preset.defaultHeight.toString());
    setPresetError(null);
  };

  const handleWidthChange = (value: string) => {
    setPresetWidth(value);
    if (selectedPreset) {
      const widthResult = validateDimension(value);
      if (widthResult.parsed !== null) {
        const newHeight = Math.round(widthResult.parsed / selectedPreset.ratio);
        setPresetHeight(newHeight.toString());
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setPresetHeight(value);
    if (selectedPreset) {
      const heightResult = validateDimension(value);
      if (heightResult.parsed !== null) {
        const newWidth = Math.round(heightResult.parsed * selectedPreset.ratio);
        setPresetWidth(newWidth.toString());
      }
    }
  };

  const handleCreateFromPreset = () => {
    if (!validatePresetDimensions() || !selectedPreset) return;

    const widthResult = validateDimension(presetWidth);
    const heightResult = validateDimension(presetHeight);

    if (widthResult.parsed && heightResult.parsed) {
      useEditorStore.getState().updateCanvas({
        canvasWidth: widthResult.parsed,
        canvasHeight: heightResult.parsed,
      });
      onProjectCreated();
    }
  };

  const handleCreateFromCustom = (width: number, height: number) => {
    useEditorStore.getState().updateCanvas({
      canvasWidth: width,
      canvasHeight: height,
    });
    onProjectCreated();
  };

  const handleCreateFromImage = (width: number, height: number, imageDataUrl: string) => {
    useEditorStore.getState().updateCanvas({
      canvasWidth: width,
      canvasHeight: height,
    });
    useEditorStore.getState().setBackgroundImage(imageDataUrl);
    onProjectCreated();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1e1e1e]">
      <div className="w-full max-w-[640px] bg-[#252525] rounded-lg shadow-xl border border-[#333333] p-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          New Project
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-[#333333]">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`
              px-4 py-3 rounded-t-md font-medium transition-colors
              ${activeTab === "presets"
                ? "bg-[#2a2a2a] text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-[#333333]"}
            `}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`
              px-4 py-3 rounded-t-md font-medium transition-colors
              ${activeTab === "custom"
                ? "bg-[#2a2a2a] text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-[#333333]"}
            `}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("image")}
            className={`
              px-4 py-3 rounded-t-md font-medium transition-colors
              ${activeTab === "image"
                ? "bg-[#2a2a2a] text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-[#333333]"}
            `}
          >
            From Image
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "presets" && (
            <div>
              {/* Preset Ratio Grid */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                {PRESET_RATIOS.map((preset, index) => (
                  <PresetRatioCard
                    key={preset.label}
                    label={preset.label}
                    defaultWidth={preset.defaultWidth}
                    defaultHeight={preset.defaultHeight}
                    selected={selectedRatioIndex === index}
                    onClick={() => handlePresetSelect(index)}
                  />
                ))}
              </div>

              {/* Dimension Inputs */}
              {selectedPreset && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Width
                    </label>
                    <input
                      type="text"
                      value={presetWidth}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      placeholder={selectedPreset.defaultWidth.toString()}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Height
                    </label>
                    <input
                      type="text"
                      value={presetHeight}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      placeholder={selectedPreset.defaultHeight.toString()}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Error Message */}
                  {presetError && (
                    <p className="text-red-500 text-sm">{presetError}</p>
                  )}

                  {/* Create Button */}
                  <button
                    type="button"
                    onClick={handleCreateFromPreset}
                    disabled={!!presetError || !presetWidth || !presetHeight}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "custom" && (
            <CustomDimensionsForm onCreateProject={handleCreateFromCustom} />
          )}

          {activeTab === "image" && (
            <ImageUploadStarter onCreateProject={handleCreateFromImage} />
          )}
        </div>
      </div>
    </div>
  );
}
