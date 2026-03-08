"use client";

import { Pipette } from "lucide-react";

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

interface EyedropperButtonProps {
  onChange: (hex: string) => void;
}

export default function EyedropperButton({ onChange }: EyedropperButtonProps) {
  const isSupported =
    typeof window !== "undefined" && "EyeDropper" in window;

  if (!isSupported) return null;

  const handleClick = () => {
    if (!window.EyeDropper) return;
    new window.EyeDropper()
      .open()
      .then((result) => onChange(result.sRGBHex))
      .catch(() => {});
  };

  return (
    <button
      type="button"
      title="Pick color from screen"
      onClick={handleClick}
      className="p-1 rounded hover:bg-[#444] transition text-gray-400 hover:text-gray-200"
    >
      <Pipette size={14} />
    </button>
  );
}
