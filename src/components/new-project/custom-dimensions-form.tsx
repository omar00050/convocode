"use client";

import { useState } from "react";

interface CustomDimensionsFormProps {
  onCreateProject: (width: number, height: number) => void;
}

export default function CustomDimensionsForm({
  onCreateProject,
}: CustomDimensionsFormProps) {
  const [widthValue, setWidthValue] = useState<string>("");
  const [heightValue, setHeightValue] = useState<string>("");
  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  const validateField = (value: string, fieldName: string): { isValid: boolean; error: string | null; parsed: number | null } => {
    const trimmed = value.trim();

    if (trimmed === "") {
      return { isValid: false, error: `${fieldName} is required`, parsed: null };
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

  const handleWidthChange = (value: string) => {
    setWidthValue(value);
    const result = validateField(value, "Width");
    setWidthError(result.error);
  };

  const handleHeightChange = (value: string) => {
    setHeightValue(value);
    const result = validateField(value, "Height");
    setHeightError(result.error);
  };

  const handleCreate = () => {
    const widthResult = validateField(widthValue, "Width");
    const heightResult = validateField(heightValue, "Height");

    if (widthResult.parsed !== null && heightResult.parsed !== null) {
      onCreateProject(widthResult.parsed, heightResult.parsed);
    }
  };

  const hasError = widthError !== null || heightError !== null;
  const isEmpty = widthValue.trim() === "" || heightValue.trim() === "";
  const isDisabled = hasError || isEmpty;

  return (
    <div className="space-y-6">
      {/* Width Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Width
        </label>
        <input
          type="text"
          value={widthValue}
          onChange={(e) => handleWidthChange(e.target.value)}
          placeholder="e.g., 1920"
          className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {widthError && (
          <p className="text-red-500 text-sm mt-1">{widthError}</p>
        )}
      </div>

      {/* Height Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Height
        </label>
        <input
          type="text"
          value={heightValue}
          onChange={(e) => handleHeightChange(e.target.value)}
          placeholder="e.g., 1080"
          className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {heightError && (
          <p className="text-red-500 text-sm mt-1">{heightError}</p>
        )}
      </div>

      {/* Create Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={isDisabled}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        Create
      </button>
    </div>
  );
}
