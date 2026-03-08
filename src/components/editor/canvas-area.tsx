"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import CheckerboardBg from "./checkerboard-bg";
import { useEditorStore } from "@/stores/editor-store";
import { validateImageFile, fitImageToCanvas } from "@/lib/image-utils";
import { getClipboard, setClipboard, getPasteOffset, incrementPasteOffset } from "@/hooks/use-clipboard";
import { canGroup, deepCloneWithNewIds } from "@/lib/group-utils";
import { getObjectMenuItems, getCanvasMenuItems, getMultiSelectMenuItems } from "@/lib/context-menu-items";
import ContextMenu from "@/components/editor/context-menu";
import type { ImageObject, AnyCanvasObject } from "@/types/editor";
import type Konva from "konva";

// Dynamic import with ssr: false for Konva components
const CanvasStage = dynamic(() => import("./canvas-stage"), { ssr: false });

interface CanvasAreaProps {
  onStageCreated?: (stage: Konva.Stage | null) => void;
}

export default function CanvasArea({ onStageCreated }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const addObject = useEditorStore((state) => state.addObject);
  const objects = useEditorStore((state) => state.objects);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const contextMenuVisible = useEditorStore((state) => state.contextMenuVisible);
  const contextMenuPosition = useEditorStore((state) => state.contextMenuPosition);
  const contextMenuTargetId = useEditorStore((state) => state.contextMenuTargetId);
  const showContextMenu = useEditorStore((state) => state.showContextMenu);
  const hideContextMenu = useEditorStore((state) => state.hideContextMenu);
  const removeObject = useEditorStore((state) => state.removeObject);
  const duplicateObjects = useEditorStore((state) => state.duplicateObjects);
  const reorderObject = useEditorStore((state) => state.reorderObject);
  const setObjectLocked = useEditorStore((state) => state.setObjectLocked);
  const setObjectVisible = useEditorStore((state) => state.setObjectVisible);
  const setSelection = useEditorStore((state) => state.setSelection);
  const groupObjects = useEditorStore((state) => state.groupObjects);
  const ungroupObject = useEditorStore((state) => state.ungroupObject);
  const cutObjects = useEditorStore((state) => state.cutObjects);
  const alignSelectedObjects = useEditorStore((state) => state.alignSelectedObjects);
  const distributeSelectedObjects = useEditorStore((state) => state.distributeSelectedObjects);

  // Build context menu items based on what was right-clicked
  const buildContextMenuItems = (targetId: string | null) => {
    const hasClipboard = !!getClipboard();
    const targetObj = targetId ? objects.find((o) => o.id === targetId) : null;

    const doPaste = () => {
      const cb = getClipboard();
      if (!cb) return;
      incrementPasteOffset();
      const offset = getPasteOffset();
      const newIds: string[] = [];
      for (const item of cb) {
        const cloned = deepCloneWithNewIds(item);
        const newObj: AnyCanvasObject = { ...cloned, x: item.x + offset, y: item.y + offset } as AnyCanvasObject;
        addObject(newObj);
        newIds.push(newObj.id);
      }
      setSelection(newIds);
      hideContextMenu();
    };

    const doDelete = (ids: string[]) => {
      ids.forEach((id) => removeObject(id));
      hideContextMenu();
    };

    if (selectedIds.length > 1) {
      const selectedObjs = objects.filter((o) => selectedIds.includes(o.id));
      return getMultiSelectMenuItems({
        count: selectedIds.length,
        onCut: () => { cutObjects(selectedIds); hideContextMenu(); },
        onCopy: () => { setClipboard(selectedObjs.map(deepCloneWithNewIds)); hideContextMenu(); },
        onPaste: doPaste,
        onDuplicate: () => { duplicateObjects(selectedIds); hideContextMenu(); },
        onBringToFront: () => { selectedIds.forEach((id) => reorderObject(id, "top")); hideContextMenu(); },
        onBringForward: () => { selectedIds.forEach((id) => reorderObject(id, "up")); hideContextMenu(); },
        onSendBackward: () => { selectedIds.forEach((id) => reorderObject(id, "down")); hideContextMenu(); },
        onSendToBack: () => { selectedIds.forEach((id) => reorderObject(id, "bottom")); hideContextMenu(); },
        onGroup: () => { groupObjects(selectedIds); hideContextMenu(); },
        canGroup: canGroup(selectedObjs),
        onAlignLeft: () => { alignSelectedObjects("left"); hideContextMenu(); },
        onAlignCenterH: () => { alignSelectedObjects("centerH"); hideContextMenu(); },
        onAlignRight: () => { alignSelectedObjects("right"); hideContextMenu(); },
        onAlignTop: () => { alignSelectedObjects("top"); hideContextMenu(); },
        onAlignCenterV: () => { alignSelectedObjects("centerV"); hideContextMenu(); },
        onAlignBottom: () => { alignSelectedObjects("bottom"); hideContextMenu(); },
        onDistributeH: () => { distributeSelectedObjects("horizontal"); hideContextMenu(); },
        onDistributeV: () => { distributeSelectedObjects("vertical"); hideContextMenu(); },
        onDelete: () => doDelete(selectedIds),
        hasClipboard,
      });
    }

    if (targetObj) {
      const isGroup = targetObj.type === "group";
      return getObjectMenuItems({
        isLocked: targetObj.locked,
        isVisible: targetObj.visible,
        isGroup,
        onCut: () => { cutObjects([targetObj.id]); hideContextMenu(); },
        onCopy: () => { setClipboard([deepCloneWithNewIds(targetObj)]); hideContextMenu(); },
        onPaste: doPaste,
        onDuplicate: () => { duplicateObjects([targetObj.id]); hideContextMenu(); },
        onBringToFront: () => { reorderObject(targetObj.id, "top"); hideContextMenu(); },
        onBringForward: () => { reorderObject(targetObj.id, "up"); hideContextMenu(); },
        onSendBackward: () => { reorderObject(targetObj.id, "down"); hideContextMenu(); },
        onSendToBack: () => { reorderObject(targetObj.id, "bottom"); hideContextMenu(); },
        onGroup: isGroup ? undefined : () => { groupObjects([targetObj.id]); hideContextMenu(); },
        onUngroup: isGroup ? () => { ungroupObject(targetObj.id); hideContextMenu(); } : undefined,
        canGroup: !isGroup,
        onLock: () => { setObjectLocked(targetObj.id, !targetObj.locked); hideContextMenu(); },
        onHide: () => { setObjectVisible(targetObj.id, !targetObj.visible); hideContextMenu(); },
        onDelete: () => doDelete([targetObj.id]),
        hasClipboard,
      });
    }

    return getCanvasMenuItems({
      onPaste: doPaste,
      onSelectAll: () => {
        setSelection(objects.filter((o) => o.visible && !o.locked).map((o) => o.id));
        hideContextMenu();
      },
      hasClipboard,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Determine target by checking what is under the cursor
    const target = (e.target as HTMLElement).closest("[data-id]");
    const targetId = target?.getAttribute("data-id") ?? null;
    // Use the first selectedId if right-clicking on a selected object
    const effectiveTargetId = targetId ?? (selectedIds.length === 1 ? selectedIds[0] : null);
    showContextMenu({ x: e.clientX, y: e.clientY }, effectiveTargetId);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type silently
    if (!validateImageFile(file)) {
      return;
    }

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Get image dimensions
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = base64;
      });

      const { naturalWidth, naturalHeight } = img;

      // Get canvas dimensions from store
      const { canvasWidth, canvasHeight } = useEditorStore.getState();

      // Fit image to canvas
      const { width, height } = fitImageToCanvas(
        naturalWidth,
        naturalHeight,
        canvasWidth,
        canvasHeight
      );

      // Compute centered position
      const x = (canvasWidth - width) / 2;
      const y = (canvasHeight - height) / 2;

      // Create ImageObject
      const imageObj: ImageObject = {
        id: crypto.randomUUID(),
        type: "image",
        x,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        name: file.name,
        shadowEnabled: false,
        shadowColor: "#00000000",
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        blendMode: "source-over",
        src: base64,
        originalName: file.name,
        flipX: false,
        flipY: false,
        filters: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          sepia: 0,
          hueRotate: 0,
        },
        maskType: "none",
        maskRadius: 0,
        borderEnabled: false,
        borderColor: "#000000",
        borderWidth: 0,
        borderRadius: 0,
      };

      addObject(imageObj);
    } catch {
      // Silently ignore errors on canvas drop
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full flex items-center justify-center overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <CheckerboardBg>
        <CanvasStage
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          onStageCreated={onStageCreated}
        />
      </CheckerboardBg>

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenuVisible}
        position={contextMenuPosition}
        items={buildContextMenuItems(contextMenuTargetId)}
        onClose={hideContextMenu}
      />
    </div>
  );
}
