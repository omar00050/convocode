"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Minus, X, RefreshCw } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { TargetLibrary } from "@/types/editor";
import CodeEditor from "./code-editor";

const GENERATOR_TABS: { id: TargetLibrary; label: string }[] = [
  { id: "node-canvas", label: "Node Canvas" },
  { id: "skia-canvas", label: "Skia Canvas" },
  { id: "sharp", label: "Sharp" },
  { id: "jimp", label: "Jimp" },
];

export default function CodePlayground() {
  const {
    codePlaygroundOpen,
    toggleCodePlayground,
    generatedCode,
    targetLibrary,
    setTargetLibrary,
    generateCode,
    canvasWidth,
    canvasHeight,
    stateVersion,
    codeGeneratedAtVersion,
  } = useEditorStore();

  const [editedCode, setEditedCode] = useState("");
  const [hasEdits, setHasEdits] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.55);
  const [panelHeight, setPanelHeight] = useState(0);

  // Dragging state (refs to avoid re-renders)
  const isDraggingPanel = useRef(false);
  const isDraggingSplit = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize panel height after mount (avoids SSR window access)
  useEffect(() => {
    if (typeof window !== "undefined" && panelHeight === 0) {
      setPanelHeight(Math.floor(window.innerHeight * 0.45));
    }
  }, [panelHeight]);

  // Sync code from store when playground opens or generatedCode changes
  useEffect(() => {
    if (!codePlaygroundOpen) return;
    if (!generatedCode) {
      generateCode();
      return;
    }
    setEditedCode(generatedCode);
    setHasEdits(false);
    setAutoRun(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codePlaygroundOpen, generatedCode]);

  const isCodeStale = stateVersion !== codeGeneratedAtVersion && generatedCode !== "";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
    } catch {
      // fallback
    }
  }, [editedCode]);

  const handleReset = useCallback(() => {
    if (hasEdits) {
      if (!window.confirm("Reset will discard your edits. Continue?")) return;
    }
    setEditedCode(generatedCode);
    setHasEdits(false);
  }, [hasEdits, generatedCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([editedCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-render-${targetLibrary}.js`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editedCode, targetLibrary]);

  const handleGeneratorSwitch = useCallback(
    (lib: TargetLibrary) => {
      if (lib === targetLibrary) return;
      if (hasEdits) {
        if (!window.confirm("Switching generators will overwrite your edits. Continue?")) return;
      }
      setTargetLibrary(lib);
      generateCode();
      setHasEdits(false);
      setAutoRun(true);
    },
    [hasEdits, targetLibrary, setTargetLibrary, generateCode]
  );

  const handleRegenerate = useCallback(() => {
    if (hasEdits) {
      if (!window.confirm("Regenerate will overwrite your edits. Continue?")) return;
    }
    generateCode();
    setHasEdits(false);
    setAutoRun(true);
  }, [hasEdits, generateCode]);

  // Panel height resize (drag top handle)
  const handlePanelResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingPanel.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingPanel.current) return;
        const newHeight = window.innerHeight - ev.clientY;
        setPanelHeight(Math.max(200, Math.min(window.innerHeight * 0.7, newHeight)));
      };
      const onMouseUp = () => {
        isDraggingPanel.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    []
  );

  // Horizontal split resize (drag vertical divider)
  const handleSplitResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingSplit.current = true;
      const container = containerRef.current;
      if (!container) return;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingSplit.current || !container) return;
        const rect = container.getBoundingClientRect();
        const ratio = (ev.clientX - rect.left) / rect.width;
        setSplitRatio(Math.max(0.3, Math.min(0.7, ratio)));
      };
      const onMouseUp = () => {
        isDraggingSplit.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    []
  );

  if (!codePlaygroundOpen) return null;

  return (
    <div
      style={{
        height: `${panelHeight}px`,
        minHeight: "200px",
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
        borderTop: "1px solid #333",
        flexShrink: 0,
        transition: "height 0.0s ease",
        overflow: "hidden",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handlePanelResizeMouseDown}
        style={{
          height: "4px",
          cursor: "ns-resize",
          backgroundColor: "#333",
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 12px",
          height: "38px",
          borderBottom: "1px solid #2a2a2a",
          flexShrink: 0,
          backgroundColor: "#252525",
        }}
      >
        {/* Title */}
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#ccc", marginRight: "4px", flexShrink: 0 }}>
          Code Playground
        </span>

        {/* Generator tabs */}
        {GENERATOR_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleGeneratorSwitch(tab.id)}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              border: "none",
              cursor: "pointer",
              backgroundColor: targetLibrary === tab.id ? "#3a3a45" : "transparent",
              color: targetLibrary === tab.id ? "#fff" : "#999",
              transition: "background-color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sync status indicator */}
        {generatedCode !== "" && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isCodeStale ? "#eab308" : "#22c55e",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: isCodeStale ? "#eab308" : "#999",
                whiteSpace: "nowrap",
              }}
            >
              {isCodeStale ? "Outdated" : "Up to date"}
            </span>
          </div>
        )}

        {/* Regenerate button */}
        {isCodeStale && (
          <button
            onClick={handleRegenerate}
            title="Regenerate code"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              border: "1px solid #3a3a3a",
              backgroundColor: "transparent",
              color: "#ccc",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <RefreshCw size={11} />
            Regenerate
          </button>
        )}

        {/* Minimize / Close */}
        <button
          onClick={toggleCodePlayground}
          title="Minimize"
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={toggleCodePlayground}
          title="Close"
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body: Editor + Preview split */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Code editor pane */}
        <div style={{ width: `${splitRatio * 100}%`, minWidth: "200px", overflow: "hidden" }}>
          <CodeEditor
            code={editedCode}
            onChange={(newCode) => {
              setEditedCode(newCode);
              setHasEdits(newCode !== generatedCode);
            }}
            onCopy={handleCopy}
            onReset={handleReset}
            onDownload={handleDownload}
            hasEdits={hasEdits}
            generatorName={targetLibrary}
          />
        </div>

        {/* Vertical divider */}
        <div
          onMouseDown={handleSplitResizeMouseDown}
          style={{
            width: "4px",
            cursor: "ew-resize",
            backgroundColor: "#333",
            flexShrink: 0,
          }}
        />

        {/* Live preview pane — lazy import to avoid SSR issues */}
        <div style={{ flex: 1, minWidth: "200px", overflow: "hidden" }}>
          <LivePreviewPane
            code={editedCode}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            generator={targetLibrary}
            autoRun={autoRun}
            onAutoRunComplete={() => setAutoRun(false)}
          />
        </div>
      </div>
    </div>
  );
}

// Lazy wrapper for LivePreview to avoid import cycle issues
import dynamic from "next/dynamic";

const LivePreview = dynamic(() => import("./live-preview"), { ssr: false });

interface LivePreviewPaneProps {
  code: string;
  canvasWidth: number;
  canvasHeight: number;
  generator: TargetLibrary;
  autoRun: boolean;
  onAutoRunComplete: () => void;
}

function LivePreviewPane(props: LivePreviewPaneProps) {
  return <LivePreview {...props} />;
}
