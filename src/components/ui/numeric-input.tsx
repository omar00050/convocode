"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";

interface NumericInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export default function NumericInput({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  suffix,
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state when external value changes (e.g., from canvas dragging)
  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  const commitValue = (rawValue: string) => {
    const parsed = parseFloat(rawValue);
    if (isNaN(parsed)) {
      // Reset to current value if invalid
      setDisplayValue(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setDisplayValue(String(clamped));
    onChange(clamped);
  };

  const handleBlur = () => {
    commitValue(displayValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue(displayValue);
      inputRef.current?.blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentVal = parseFloat(displayValue);
      if (!isNaN(currentVal)) {
        const newVal = Math.min(max, currentVal + step);
        setDisplayValue(String(newVal));
        onChange(newVal);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentVal = parseFloat(displayValue);
      if (!isNaN(currentVal)) {
        const newVal = Math.max(min, currentVal - step);
        setDisplayValue(String(newVal));
        onChange(newVal);
      }
    } else if (e.key === "Escape") {
      // Reset on Escape
      setDisplayValue(String(value));
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow typing freely - validation happens on blur/Enter
    setDisplayValue(e.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-w-[60px] max-w-[70px] bg-[#333] text-gray-200 text-sm px-2 py-1.5 border border-[#555] rounded outline-none focus:border-blue-500"
          style={{
            // Hide native number spinners
            MozAppearance: "textfield",
            WebkitAppearance: "none",
          }}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
