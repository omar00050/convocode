"use client";

interface PresetRatioCardProps {
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  selected: boolean;
  onClick: () => void;
}

export default function PresetRatioCard({
  label,
  defaultWidth,
  defaultHeight,
  selected,
  onClick,
}: PresetRatioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all
        ${selected ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e1e]" : "border-[#333333] hover:border-[#555555]"}
        bg-[#2a2a2a]
      `}
    >
      {/* Ratio label */}
      <span className="text-white font-semibold text-lg">{label}</span>

      {/* Thumbnail rectangle showing proportion */}
      <div
        className="bg-[#444444] rounded border border-[#555555]"
        style={{
          width: defaultHeight > defaultWidth ? "80px" : `${Math.min(120, (80 * defaultWidth) / defaultHeight)}px`,
          height: defaultHeight > defaultWidth ? `${Math.min(120, (80 * defaultHeight) / defaultWidth)}px` : "80px",
        }}
      />

      {/* Default pixel dimensions */}
      <span className="text-gray-400 text-sm">
        {defaultWidth} x {defaultHeight}
      </span>
    </button>
  );
}
