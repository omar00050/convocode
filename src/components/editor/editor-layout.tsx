"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFontLoader } from "@/hooks/use-font-loader";
import { useEditorStore } from "@/stores/editor-store";
import Toolbar from "./toolbar";
import LeftPanel from "./left-panel";
import CanvasArea from "./canvas-area";
import RightPanel from "./right-panel";
import CodePlayground from "./code-playground";
import FontLoadingIndicator from "./font-loading-indicator";
import ShortcutsModal from "./shortcuts-modal";
import ExportModal from "./export-modal";
import Rulers from "./rulers";
import type Konva from "konva";

export default function EditorLayout() {
  // Modal visibility state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Stage ref for export
  const stageRef = useRef<Konva.Stage | null>(null);

  // Get canvas settings for export modal
  const zoom = useEditorStore((state) => state.zoom);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const showGrid = useEditorStore((state) => state.showGrid);
  const showRulers = useEditorStore((state) => state.showRulers);
  const addGuide = useEditorStore((state) => state.addGuide);

  // Mouse position tracking for ruler cursor markers
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Track container dimensions via ResizeObserver instead of ref callback
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setContainerDimensions((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Calculate canvas offsets (same as canvas-stage centering logic)
  const offsetX = (containerDimensions.width - canvasWidth * zoom) / 2;
  const offsetY = (containerDimensions.height - canvasHeight * zoom) / 2;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    // Convert to canvas-space coordinates
    const canvasX = (screenX - offsetX) / zoom;
    const canvasY = (screenY - offsetY) / zoom;
    setMousePosition({ x: canvasX, y: canvasY });
  }, [offsetX, offsetY, zoom]);

  const handleMouseLeave = () => setMousePosition(null);

  // Callback to receive stage from CanvasArea
  const handleStageCreated = useCallback((stage: Konva.Stage | null) => {
    stageRef.current = stage;
  }, []);

  useKeyboardShortcuts({
    onToggleShortcutsModal: (show) => setShowShortcutsModal(show),
    onToggleExportModal: (show) => setShowExportModal(show),
  });
  const { fontsLoaded } = useFontLoader();

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <Toolbar
        onToggleShortcutsModal={setShowShortcutsModal}
        onToggleExportModal={setShowExportModal}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <LeftPanel />

        {/* Canvas area with font loading indicator */}
        <div
          data-canvas-container
          className="relative flex-1 overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          ref={canvasContainerRef}
        >
          {showRulers && (
            <Rulers
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              offsetX={offsetX}
              offsetY={offsetY}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
              mousePosition={mousePosition}
              onCreateGuide={addGuide}
              containerRef={canvasContainerRef}
            />
          )}
          <CanvasArea onStageCreated={handleStageCreated} />
          <FontLoadingIndicator visible={!fontsLoaded} />
        </div>

        {/* Right sidebar */}
        <RightPanel />
      </div>

      {/* Code playground */}
      <CodePlayground />

      {/* Shortcuts modal */}
      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Export modal */}
      {showExportModal && (
        <ExportModal
          stageRef={stageRef}
          zoom={zoom}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          showGrid={showGrid}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
