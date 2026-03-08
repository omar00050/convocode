"use client";

import {
  Undo2,
  Redo2,
  ZoomOut,
  ZoomIn,
  Grid3x3,
  Download,
  Code,
  HelpCircle,
  Magnet,
  Ruler,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useHistoryStore } from "@/stores/history-store";
import ZoomMenu from "./zoom-menu";

interface ToolbarProps {
  onToggleShortcutsModal: (show: boolean) => void;
  onToggleExportModal: (show: boolean) => void;
}

export default function Toolbar({ onToggleShortcutsModal, onToggleExportModal }: ToolbarProps) {
  const {
    zoom, showGrid, snapEnabled, showRulers,
    updateCanvas, generateCode, setCodePanelOpen, toggleCodePlayground, codePlaygroundOpen,
    performUndo, performRedo, toggleSnap, toggleRulers,
    selectedIds, zoomToFitCanvas, zoomToSelection, setZoomPreset,
  } = useEditorStore();
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  const handleZoomOut = () => {
    updateCanvas({ zoom: Math.max(0.25, zoom - 0.1) });
  };

  const handleZoomIn = () => {
    updateCanvas({ zoom: Math.min(4, zoom + 0.1) });
  };

  const handleZoomReset = () => {
    updateCanvas({ zoom: 1 });
  };

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCanvas({ zoom: parseFloat(e.target.value) });
  };

  const handleGridToggle = () => {
    updateCanvas({ showGrid: !showGrid });
  };

  const handleSnapToggle = () => {
    toggleSnap();
  };

  const handleHelpClick = () => {
    onToggleShortcutsModal(true);
  };

  const handleExportClick = () => {
    onToggleExportModal(true);
  };

  return (
    <div className="h-12 bg-[#252525] border-b border-[#333333] flex items-center px-3 gap-1">
      {/* Undo/Redo */}
      <button
        type="button"
        className={`p-2 rounded transition ${!canUndo ? "opacity-40 pointer-events-none" : "hover:bg-[#333333]"}`}
        title="Undo (Ctrl+Z)"
        onClick={() => performUndo()}
        disabled={!canUndo}
      >
        <Undo2 size={18} />
      </button>
      <button
        type="button"
        className={`p-2 rounded transition ${!canRedo ? "opacity-40 pointer-events-none" : "hover:bg-[#333333]"}`}
        title="Redo (Ctrl+Shift+Z)"
        onClick={() => performRedo()}
        disabled={!canRedo}
      >
        <Redo2 size={18} />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#333333] mx-1" />

      {/* Zoom controls */}
      <button
        type="button"
        className="p-2 rounded hover:bg-[#333333] transition"
        title="Zoom Out"
        onClick={handleZoomOut}
      >
        <ZoomOut size={18} />
      </button>

      {/* Zoom slider */}
      <input
        type="range"
        min="0.25"
        max="4"
        step="0.05"
        value={zoom}
        onChange={handleZoomSliderChange}
        className="w-20 h-1 bg-[#444444] rounded-lg appearance-none cursor-pointer accent-blue-500"
        title={`Zoom: ${Math.round(zoom * 100)}%`}
      />

      {/* Zoom menu dropdown */}
      <ZoomMenu
        zoom={zoom}
        hasSelection={selectedIds.length > 0}
        onZoomToFit={() => {
          // Use viewport estimate from typical editor layout
          const vw = window.innerWidth - 480; // subtract panels (~240 each)
          const vh = window.innerHeight - 96;  // subtract toolbar + code panel
          zoomToFitCanvas(Math.max(400, vw), Math.max(300, vh));
        }}
        onZoomToSelection={() => {
          const vw = window.innerWidth - 480;
          const vh = window.innerHeight - 96;
          zoomToSelection(Math.max(400, vw), Math.max(300, vh));
        }}
        onSetZoom={setZoomPreset}
      />

      <button
        type="button"
        className="p-2 rounded hover:bg-[#333333] transition"
        title="Zoom In"
        onClick={handleZoomIn}
      >
        <ZoomIn size={18} />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#333333] mx-1" />

      {/* Snap toggle */}
      <button
        type="button"
        className={`p-2 rounded transition ${
          snapEnabled
            ? "bg-[#3b82f6]/20 text-blue-400"
            : "hover:bg-[#333333]"
        }`}
        title="Snap to Guides (On/Off)"
        onClick={handleSnapToggle}
      >
        <Magnet size={18} />
      </button>

      {/* Grid toggle */}
      <button
        type="button"
        className={`p-2 rounded transition ${
          showGrid
            ? "bg-[#3b82f6]/20 text-blue-400"
            : "hover:bg-[#333333]"
        }`}
        title="Toggle Grid (Ctrl+G)"
        onClick={handleGridToggle}
      >
        <Grid3x3 size={18} />
      </button>

      {/* Ruler toggle */}
      <button
        type="button"
        className={`p-2 rounded transition ${
          showRulers
            ? "bg-[#3b82f6]/20 text-blue-400"
            : "hover:bg-[#333333]"
        }`}
        title="Toggle Rulers"
        onClick={toggleRulers}
      >
        <Ruler size={18} />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#333333] mx-1" />

      {/* Export/Code */}
      <button
        type="button"
        className="p-2 rounded hover:bg-[#333333] transition"
        title="Export Image (Ctrl+E)"
        onClick={handleExportClick}
      >
        <Download size={18} />
      </button>
      <button
        type="button"
        className={`p-2 rounded transition ${codePlaygroundOpen ? "bg-[#3b82f6]/20 text-blue-400" : "hover:bg-[#333333]"}`}
        title="Code Playground (Ctrl+J)"
        onClick={() => {
          generateCode();
          if (!codePlaygroundOpen) toggleCodePlayground();
        }}
      >
        <Code size={18} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help button */}
      <button
        type="button"
        className="p-2 rounded hover:bg-[#333333] transition"
        title="Keyboard Shortcuts (?)"
        onClick={handleHelpClick}
      >
        <HelpCircle size={18} />
      </button>
    </div>
  );
}
