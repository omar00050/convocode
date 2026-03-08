"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import {
  getClipboard,
  setClipboard,
  getPasteOffset,
  incrementPasteOffset,
} from "./use-clipboard";
import { canGroup, deepCloneWithNewIds } from "@/lib/group-utils";
import type { AnyCanvasObject } from "@/types/editor";

interface KeyboardShortcutsOptions {
  onToggleShortcutsModal: (show: boolean) => void;
  onToggleExportModal: (show: boolean) => void;
}

/**
 * Keyboard shortcuts hook for canvas object manipulation.
 * Handles delete, duplicate, copy/paste, nudge, and z-order shortcuts.
 * All shortcuts are guarded against text editing mode.
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const { onToggleShortcutsModal, onToggleExportModal } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useEditorStore.getState();
      const { selectedIds, objects, cropMode } = state;
      const isCtrlOrCmd = e.metaKey || e.ctrlKey;

      // Helper to check if we're in a text input
      const isInTextInput = () => {
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.tagName === "INPUT"
        ) {
          return true;
        }
        // Check for contenteditable
        if (activeElement?.getAttribute("contenteditable") === "true") {
          return true;
        }
        return false;
      };

      // Escape - Always fires, even in text inputs
      if (e.key === "Escape") {
        e.preventDefault();
        // Exit crop mode if active
        if (cropMode.active) {
          state.exitCropMode();
        }
        // Clear selection
        state.clearSelection();
        return;
      }

      // Guard: Don't fire remaining shortcuts during text editing
      if (isInTextInput()) {
        return;
      }

      // Ctrl/Cmd + Z - Undo
      if (isCtrlOrCmd && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        state.performUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl + Y - Redo
      if ((isCtrlOrCmd && e.shiftKey && e.key === "z") || (e.ctrlKey && !e.metaKey && e.key === "y")) {
        e.preventDefault();
        state.performRedo();
        return;
      }

      // Ctrl/Cmd + A - Select all visible non-locked objects
      if (isCtrlOrCmd && e.key === "a") {
        e.preventDefault();
        const selectableIds = objects
          .filter((o) => o.visible && !o.locked)
          .map((o) => o.id);
        state.setSelection(selectableIds);
        return;
      }

      // Delete / Backspace - Remove selected objects (skip if in crop mode)
      if ((e.key === "Delete" || e.key === "Backspace") && !cropMode.active) {
        e.preventDefault();
        for (const id of selectedIds) {
          state.removeObject(id);
        }
        state.clearSelection();
        return;
      }

      // Ctrl/Cmd + D - Duplicate selected objects
      if (isCtrlOrCmd && e.key === "d") {
        e.preventDefault();
        state.duplicateObjects(selectedIds);
        return;
      }

      // Ctrl/Cmd + X - Cut selected objects
      if (isCtrlOrCmd && e.key === "x") {
        e.preventDefault();
        if (selectedIds.length > 0) {
          state.cutObjects(selectedIds);
        }
        return;
      }

      // Ctrl/Cmd + C - Copy selected objects
      if (isCtrlOrCmd && e.key === "c" && !e.shiftKey) {
        e.preventDefault();
        const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
        setClipboard(selectedObjects.map((o) => deepCloneWithNewIds(o)));
        return;
      }

      // Ctrl/Cmd + G - Group selected objects
      if (isCtrlOrCmd && !e.shiftKey && e.key === "g") {
        e.preventDefault();
        const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
        if (selectedIds.length >= 2 && canGroup(selectedObjects)) {
          state.groupObjects(selectedIds);
        }
        return;
      }

      // Ctrl/Cmd + Shift + G - Ungroup
      if (isCtrlOrCmd && e.shiftKey && e.key === "G") {
        e.preventDefault();
        if (selectedIds.length === 1) {
          const obj = objects.find((o) => o.id === selectedIds[0]);
          if (obj?.type === "group") {
            state.ungroupObject(selectedIds[0]);
          }
        }
        return;
      }

      // Ctrl/Cmd + J - Toggle code playground
      if (isCtrlOrCmd && e.key === "j") {
        e.preventDefault();
        state.toggleCodePlayground();
        return;
      }

      // Ctrl/Cmd + Shift + C - Generate code and open playground
      if (isCtrlOrCmd && e.shiftKey && e.key === "C") {
        e.preventDefault();
        state.generateCode();
        if (!state.codePlaygroundOpen) state.toggleCodePlayground();
        return;
      }

      // Ctrl/Cmd + V - Paste from clipboard
      if (isCtrlOrCmd && e.key === "v") {
        e.preventDefault();
        const clipboard = getClipboard();
        if (!clipboard) return;

        incrementPasteOffset();
        const offset = getPasteOffset();

        const newIds: string[] = [];
        for (const item of clipboard) {
          const cloned = deepCloneWithNewIds(item);
          const newObj: AnyCanvasObject = {
            ...cloned,
            name: item.name + " Copy",
            x: item.x + offset,
            y: item.y + offset,
          } as AnyCanvasObject;

          state.addObject(newObj);
          newIds.push(newObj.id);
        }

        state.setSelection(newIds);
        return;
      }

      // Arrow keys - Nudge selected non-locked objects
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;

        for (const id of selectedIds) {
          const obj = objects.find((o) => o.id === id);
          if (!obj || obj.locked) continue;

          let newX = obj.x;
          let newY = obj.y;

          switch (e.key) {
            case "ArrowUp":
              newY -= delta;
              break;
            case "ArrowDown":
              newY += delta;
              break;
            case "ArrowLeft":
              newX -= delta;
              break;
            case "ArrowRight":
              newX += delta;
              break;
          }

          state.updateObject(id, { x: newX, y: newY });
        }
        return;
      }

      // Ctrl/Cmd + ] - Move up in z-order
      if (isCtrlOrCmd && e.key === "]") {
        e.preventDefault();
        for (const id of selectedIds) {
          state.reorderObject(id, "up");
        }
        return;
      }

      // Ctrl/Cmd + [ - Move down in z-order
      if (isCtrlOrCmd && e.key === "[") {
        e.preventDefault();
        for (const id of selectedIds) {
          state.reorderObject(id, "down");
        }
        return;
      }

      // Ctrl/Cmd + 0 - Zoom to fit canvas
      if (isCtrlOrCmd && !e.shiftKey && e.key === "0") {
        e.preventDefault();
        const vw = window.innerWidth - 480;
        const vh = window.innerHeight - 96;
        state.zoomToFitCanvas(Math.max(400, vw), Math.max(300, vh));
        return;
      }

      // Ctrl/Cmd + Shift + 0 - Zoom to selection
      if (isCtrlOrCmd && e.shiftKey && e.key === "0") {
        e.preventDefault();
        if (selectedIds.length > 0) {
          const vw = window.innerWidth - 480;
          const vh = window.innerHeight - 96;
          state.zoomToSelection(Math.max(400, vw), Math.max(300, vh));
        }
        return;
      }

      // Ctrl/Cmd + Shift + H - Toggle grid (moved from Ctrl+G which is now Group)
      if (isCtrlOrCmd && e.shiftKey && e.key === "H") {
        e.preventDefault();
        state.updateCanvas({ showGrid: !state.showGrid });
        return;
      }

      // Ctrl/Cmd + E - Export image
      if (isCtrlOrCmd && e.key === "e") {
        e.preventDefault();
        onToggleExportModal(true);
        return;
      }

      // "?" key - Show shortcuts modal (only if not in input and no Ctrl/Cmd)
      if (e.key === "?" && !isCtrlOrCmd) {
        e.preventDefault();
        onToggleShortcutsModal(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleShortcutsModal, onToggleExportModal]);
}
