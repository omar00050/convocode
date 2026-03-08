"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, Copy, Download, Code2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import CodeDisplay from "./code-display";
import LibrarySelector from "./library-selector";

const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT_RATIO = 0.6;
const DEFAULT_PANEL_HEIGHT = 300;

export default function CodePanel() {
  const { codePanelOpen, generatedCode, setCodePanelOpen } = useEditorStore();

  // Local state for resize and copy feedback
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Toggle panel open/close
  const handleToggle = () => {
    setCodePanelOpen(!codePanelOpen);
  };

  // Copy code to clipboard with fallback
  const handleCopy = async () => {
    if (!generatedCode) return;

    // Clear any existing timeout to prevent stacking
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
    } catch {
      // Fallback to legacy method
      try {
        const textarea = document.createElement("textarea");
        textarea.value = generatedCode;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
      } catch {
        // Silently fail - no crash
        console.error("Copy failed");
        return;
      }
    }

    // Reset copied state after 2 seconds
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Download code as file
  const handleDownload = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas-generate.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const maxHeight = window.innerHeight * MAX_PANEL_HEIGHT_RATIO;
      const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(maxHeight, newHeight));
      setPanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isCodeEmpty = !generatedCode;

  return (
    <div
      ref={panelRef}
      className="flex flex-col shrink-0"
      style={{
        backgroundColor: "#1e1e2e",
        height: codePanelOpen ? panelHeight : undefined,
      }}
    >
      {/* Resize handle */}
      {codePanelOpen && (
        <div
          className="w-full h-1 cursor-ns-resize hover:bg-blue-500/50 transition-colors"
          style={{ backgroundColor: isResizing ? "rgba(59, 130, 246, 0.5)" : "transparent" }}
          onMouseDown={handleResizeStart}
        />
      )}

      {/* Header bar */}
      <div
        className="flex items-center justify-between h-10 px-4 shrink-0"
        style={{
          backgroundColor: "#252530",
          borderTop: "1px solid #444",
        }}
      >
        {/* Left side: Toggle + Label */}
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
          onClick={handleToggle}
        >
          {codePanelOpen ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-300">Code Output</span>
        </button>

        {/* Right side: Library selector + Action buttons */}
        <div className="flex items-center gap-2">
          {/* Library selector */}
          <LibrarySelector />

          {/* Copy button */}
          <button
            type="button"
            className={`flex items-center gap-1.5 h-8 px-3 rounded text-sm transition ${
              isCodeEmpty
                ? "opacity-50 pointer-events-none text-gray-500"
                : "text-gray-300 hover:bg-[#3a3a45]"
            }`}
            onClick={handleCopy}
            disabled={isCodeEmpty}
            title="Copy code to clipboard"
          >
            {copied ? (
              <span className="text-green-400">Copied!</span>
            ) : (
              <Copy size={14} />
            )}
          </button>

          {/* Download button */}
          <button
            type="button"
            className={`flex items-center justify-center w-8 h-8 rounded transition ${
              isCodeEmpty
                ? "opacity-50 pointer-events-none text-gray-500"
                : "text-gray-300 hover:bg-[#3a3a45]"
            }`}
            onClick={handleDownload}
            disabled={isCodeEmpty}
            title="Download code as file"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Body: Code display or empty state */}
      <div
        className="flex-1 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: codePanelOpen ? (panelHeight - 40) : 0,
          opacity: codePanelOpen ? 1 : 0,
        }}
      >
        {isCodeEmpty ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Code2 size={48} className="text-[#555] mb-4" />
            <p className="text-[#999] text-sm mb-2">
              Click &apos;Generate Code&apos; in the toolbar to generate Node.js canvas code from your design
            </p>
            <p className="text-[#666] text-xs">
              Your visual design will be converted to runnable code
            </p>
          </div>
        ) : (
          // Code display with syntax highlighting
          <CodeDisplay code={generatedCode} />
        )}
      </div>
    </div>
  );
}
