"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ShortcutsModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const shortcutSections: ShortcutSection[] = [
  {
    title: "General",
    items: [
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl", "A"], description: "Select All" },
      { keys: ["Esc"], description: "Deselect / Cancel" },
      { keys: ["?"], description: "Show Shortcuts" },
    ],
  },
  {
    title: "Objects",
    items: [
      { keys: ["Del"], description: "Remove Selected" },
      { keys: ["Ctrl", "C"], description: "Copy" },
      { keys: ["Ctrl", "V"], description: "Paste" },
      { keys: ["Ctrl", "D"], description: "Duplicate" },
      { keys: ["Arrow Keys"], description: "Move 1px" },
      { keys: ["Shift", "Arrow Keys"], description: "Move 10px" },
      { keys: ["Ctrl", "]"], description: "Bring Forward" },
      { keys: ["Ctrl", "["], description: "Send Backward" },
    ],
  },
  {
    title: "View",
    items: [
      { keys: ["Ctrl", "0"], description: "Reset Zoom" },
      { keys: ["Ctrl", "G"], description: "Toggle Grid" },
      { keys: ["Ctrl", "Scroll"], description: "Zoom In/Out" },
      { keys: ["Space", "Drag"], description: "Pan Canvas" },
    ],
  },
  {
    title: "Code & Export",
    items: [
      { keys: ["Ctrl", "E"], description: "Export Image" },
      { keys: ["Ctrl", "Shift", "C"], description: "Generate Code" },
    ],
  },
];

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  // Handle Escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.67)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#2a2a2a] rounded-lg shadow-2xl max-w-[500px] w-full max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#444444]">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#444444] transition-colors text-gray-400 hover:text-white"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {shortcutSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-gray-300">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-[#1a1a1a] border border-[#555555] rounded text-gray-200">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-gray-500 mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
