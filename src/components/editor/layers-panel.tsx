"use client";

import { useState } from "react";
import { ChevronFirst, ChevronDown, ChevronUp, ChevronLast } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { AnyCanvasObject, GroupObject } from "@/types/editor";
import LayerRow from "./layer-row";
import LayerContextMenu from "./layer-context-menu";

export default function LayersPanel() {
  const { objects, selectedIds, reorderObject, reorderToIndex } = useEditorStore();
  const setEditingGroup = useEditorStore((state) => state.setEditingGroup);
  const setSelection = useEditorStore((state) => state.setSelection);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    object: AnyCanvasObject;
  } | null>(null);

  // Group expand/collapse state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<"above" | "below" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reverse the objects array so highest z-index (last in array) appears at top of list
  const reversedObjects = [...objects].reverse();

  const handleContextMenu = (e: React.MouseEvent, obj: AnyCanvasObject) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      object: obj,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setIsDragging(true);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!isDragging) return;

    const rect = (e.target as HTMLElement).closest("[data-object-id]")?.getBoundingClientRect();
    if (!rect) return;

    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "above" : "below";

    setDragOverId(targetId);
    setDragPosition(position);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) {
      resetDragState();
      return;
    }

    // Calculate target array index
    // Visual index in reversed list
    const visualTargetIndex = reversedObjects.findIndex((obj) => obj.id === targetId);
    if (visualTargetIndex === -1) {
      resetDragState();
      return;
    }

    // Adjust for drop position (above/below)
    let adjustedVisualIndex = visualTargetIndex;
    if (dragPosition === "below") {
      adjustedVisualIndex = visualTargetIndex + 1;
    }

    // Convert visual index to actual array index
    // visualIndex 0 = arrayIndex (objects.length - 1)
    // visualIndex n = arrayIndex (objects.length - 1 - n)
    const targetArrayIndex = objects.length - 1 - adjustedVisualIndex;

    // Clamp to valid range
    const clampedIndex = Math.max(0, Math.min(objects.length - 1, targetArrayIndex));

    reorderToIndex(draggedId, clampedIndex);
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setIsDragging(false);
    setDragOverId(null);
    setDragPosition(null);
  };

  // Toolbar button handlers
  const hasSelection = selectedIds.length > 0;
  const selectedId = selectedIds[0];

  const handleSendToBack = () => {
    if (selectedId) reorderObject(selectedId, "bottom");
  };

  const handleSendBackward = () => {
    if (selectedId) reorderObject(selectedId, "down");
  };

  const handleBringForward = () => {
    if (selectedId) reorderObject(selectedId, "up");
  };

  const handleBringToFront = () => {
    if (selectedId) reorderObject(selectedId, "top");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-400 uppercase">
          Layers
        </h3>
        <span className="bg-[#3a3a3a] text-gray-300 text-xs px-1.5 py-0.5 rounded">
          {objects.length}
        </span>
      </div>

      {/* Mini Toolbar */}
      <div className="flex items-center gap-1 px-3 pb-2 flex-shrink-0">
        <button
          onClick={handleSendToBack}
          disabled={!hasSelection}
          className={`p-1 rounded ${
            hasSelection
              ? "hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-400"
          }`}
          title="Send to Back"
        >
          <ChevronFirst size={14} />
        </button>
        <button
          onClick={handleSendBackward}
          disabled={!hasSelection}
          className={`p-1 rounded ${
            hasSelection
              ? "hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-400"
          }`}
          title="Send Backward"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={handleBringForward}
          disabled={!hasSelection}
          className={`p-1 rounded ${
            hasSelection
              ? "hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-400"
          }`}
          title="Bring Forward"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={handleBringToFront}
          disabled={!hasSelection}
          className={`p-1 rounded ${
            hasSelection
              ? "hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-200"
              : "opacity-30 cursor-not-allowed text-gray-400"
          }`}
          title="Bring to Front"
        >
          <ChevronLast size={14} />
        </button>
      </div>

      {/* Scrollable Layers List */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-2 min-h-0"
        onDragEnd={handleDragEnd}
      >
        {objects.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <p className="text-gray-500 text-sm italic text-center">
              No layers yet — add images, text, or shapes to get started
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {reversedObjects.map((obj) => {
              const isGroup = obj.type === "group";
              const isExpanded = expandedGroups.has(obj.id);
              return (
                <div key={obj.id}>
                  <LayerRow
                    object={obj}
                    isSelected={selectedIds.includes(obj.id)}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragOver={dragOverId === obj.id}
                    dragPosition={dragPosition}
                    depth={0}
                    isGroup={isGroup}
                    isExpanded={isExpanded}
                    onToggleExpand={isGroup ? () => toggleGroupExpand(obj.id) : undefined}
                  />
                  {isGroup && isExpanded && (
                    <div className="ml-4 space-y-0.5">
                      {[...(obj as GroupObject).children].reverse().map((child) => (
                        <LayerRow
                          key={child.id}
                          object={child}
                          isSelected={selectedIds.includes(child.id)}
                          onContextMenu={handleContextMenu}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          isDragOver={dragOverId === child.id}
                          dragPosition={dragPosition}
                          depth={1}
                          isGroup={false}
                          isExpanded={false}
                          onChildClick={() => {
                            setEditingGroup(obj.id);
                            setSelection([child.id]);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <LayerContextMenu
          object={contextMenu.object}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}
