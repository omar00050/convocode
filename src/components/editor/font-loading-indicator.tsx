"use client";

interface FontLoadingIndicatorProps {
  visible: boolean;
}

/**
 * Loading indicator shown while fonts are being loaded.
 * Displays a spinner with "Loading fonts..." text.
 */
export default function FontLoadingIndicator({ visible }: FontLoadingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="flex flex-col items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg shadow-lg">
        {/* CSS Spinner */}
        <div className="w-8 h-8 border-3 border-gray-500 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-300">Loading fonts...</span>
      </div>
    </div>
  );
}
