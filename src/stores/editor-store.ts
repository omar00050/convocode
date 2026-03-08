import { create } from "zustand";
import type {
  AnyCanvasObject,
  EditorState,
  EditorActions,
  CanvasSettings,
  FontDef,
  TargetLibrary,
  HistorySnapshot,
  SnapLine,
  TextObject,
  GroupObject,
  Guide,
} from "@/types/editor";
import { generateCode as generateCodeDispatcher } from "@/generators/index";
import { useHistoryStore } from "./history-store";
import { segmentsToPlainText } from "@/types/rich-text";
import { createGroup, ungroupObject as utilUngroupObject, deepCloneWithNewIds } from "@/lib/group-utils";
import { alignObjects, distributeObjects } from "@/lib/alignment-utils";
import { setClipboard } from "@/hooks/use-clipboard";

type EditorStore = EditorState & EditorActions;

/**
 * Captures a deep clone of the current design-level state for history tracking.
 * This is a module-level helper that takes state as a parameter.
 */
function captureSnapshot(state: EditorState): HistorySnapshot {
  return {
    objects: structuredClone(state.objects),
    globalFont: state.globalFont,
    backgroundColor: state.backgroundColor,
    backgroundType: state.backgroundType,
    backgroundGradient: state.backgroundGradient
      ? structuredClone(state.backgroundGradient)
      : null,
    backgroundImage: state.backgroundImage,
    backgroundPattern: state.backgroundPattern
      ? structuredClone(state.backgroundPattern)
      : null,
  };
}

/**
 * Zustand store for the editor state.
 * All mutations use spread-based immutable updates (no immer).
 * History tracking is integrated into all design-changing actions.
 */
export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  canvasWidth: 1080,
  canvasHeight: 1080,
  zoom: 1,
  showGrid: false,
  backgroundColor: "#ffffff",
  backgroundType: "solid" as const,
  backgroundGradient: null,
  backgroundImage: null,
  backgroundPattern: null,
  objects: [],
  selectedIds: [],
  globalFont: null,
  builtInFonts: [],
  uploadedFonts: [],
  targetLibrary: "node-canvas",
  generatedCode: "",
  codePanelOpen: false,

  // Snap guide state (not in undo history)
  snapEnabled: true,
  activeGuides: [],

  // Crop mode state (not in undo history)
  cropMode: { active: false, imageId: null },

  // Pen tool state (not in undo history)
  penToolActive: false,
  editingCustomShapeId: null,

  // Group editing state (not in undo history)
  editingGroupId: null,

  // Context menu state (not in undo history)
  contextMenuVisible: false,
  contextMenuPosition: { x: 0, y: 0 },
  contextMenuTargetId: null,

  // Guides & Rulers state (not in undo history)
  guides: [],
  showRulers: true,
  isExporting: false,

  // Code playground state
  codePlaygroundOpen: false,
  stateVersion: 0,
  codeGeneratedAtVersion: 0,

  // Object CRUD actions
  addObject: (obj: AnyCanvasObject) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set((state) => ({
      objects: [...state.objects, obj],
      stateVersion: state.stateVersion + 1,
    }));
  },

  updateObject: (id: string, partial: Partial<Omit<AnyCanvasObject, "type">>, skipHistory?: boolean) => {
    if (!skipHistory) {
      const historyStore = useHistoryStore.getState();
      if (!historyStore.isPaused) {
        historyStore.pushState(captureSnapshot(get()));
      }
    }
    set((state) => ({
      objects: state.objects.map((obj) => {
        if (obj.id !== id) return obj;

        // For text objects with richContent update, sync the content field
        if (obj.type === "text" && "richContent" in partial) {
          const textObj = obj as TextObject;
          const richContent = partial.richContent as TextObject["richContent"];

          // If richContent is being set (not null), sync content field
          if (richContent !== undefined) {
            const syncedContent = richContent ? segmentsToPlainText(richContent) : textObj.content;
            return { ...obj, ...partial, content: syncedContent } as TextObject;
          }
        }

        return { ...obj, ...partial } as AnyCanvasObject;
      }),
      stateVersion: skipHistory ? state.stateVersion : state.stateVersion + 1,
    }));
  },

  removeObject: (id: string) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      stateVersion: state.stateVersion + 1,
    }));
  },

  // Reorder actions
  reorderObject: (id: string, direction: "up" | "down" | "top" | "bottom") => {
    set((state) => {
      const index = state.objects.findIndex((obj) => obj.id === id);
      if (index === -1) return state;

      const newObjects = [...state.objects];
      const [removed] = newObjects.splice(index, 1);

      let targetIndex = index;

      switch (direction) {
        case "up":
          // Swap with next higher index (visually moves forward/on top)
          if (index < newObjects.length) {
            newObjects.splice(index + 1, 0, removed);
            targetIndex = index + 1;
          } else {
            // Already at top, no-op
            newObjects.splice(index, 0, removed);
            return state;
          }
          break;
        case "down":
          // Swap with previous lower index (visually moves behind)
          if (index > 0) {
            newObjects.splice(index - 1, 0, removed);
            targetIndex = index - 1;
          } else {
            // Already at bottom, no-op
            newObjects.splice(index, 0, removed);
            return state;
          }
          break;
        case "top":
          // Move to last index (visually on top)
          newObjects.push(removed);
          break;
        case "bottom":
          // Move to index 0 (visually behind everything)
          newObjects.unshift(removed);
          break;
      }

      // Push history after computing newObjects but before returning
      const historyStore = useHistoryStore.getState();
      if (!historyStore.isPaused) {
        historyStore.pushState(captureSnapshot(state));
      }

      return { objects: newObjects, stateVersion: state.stateVersion + 1 };
    });
  },

  // Selection actions
  setSelection: (ids: string[]) =>
    set({
      selectedIds: ids,
    }),

  toggleSelection: (id: string) =>
    set((state) => {
      if (state.selectedIds.includes(id)) {
        return { selectedIds: state.selectedIds.filter((sid) => sid !== id) };
      } else {
        return { selectedIds: [...state.selectedIds, id] };
      }
    }),

  clearSelection: () =>
    set({
      selectedIds: [],
    }),

  // Canvas settings actions
  updateCanvas: (partial: Partial<CanvasSettings>) => {
    // Check if any design-level fields are being updated
    const designLevelFields: (keyof CanvasSettings)[] = [
      "backgroundColor",
      "backgroundType",
      "backgroundGradient",
      "backgroundImage",
      "backgroundPattern",
      "canvasWidth",
      "canvasHeight",
    ];
    const hasDesignLevelChanges = designLevelFields.some(
      (field) => field in partial,
    );

    if (hasDesignLevelChanges) {
      const historyStore = useHistoryStore.getState();
      if (!historyStore.isPaused) {
        historyStore.pushState(captureSnapshot(get()));
      }
    }

    set((state) => ({
      ...state,
      ...partial,
      zoom: partial.zoom !== undefined
        ? Math.max(0.25, Math.min(4, partial.zoom))
        : state.zoom,
      canvasWidth: partial.canvasWidth !== undefined
        ? Math.max(1, partial.canvasWidth)
        : state.canvasWidth,
      canvasHeight: partial.canvasHeight !== undefined
        ? Math.max(1, partial.canvasHeight)
        : state.canvasHeight,
      stateVersion: hasDesignLevelChanges ? state.stateVersion + 1 : state.stateVersion,
    }));
  },

  // Font management actions
  setGlobalFont: (font: string | null) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set({
      globalFont: font,
    });
  },

  // Background image action
  setBackgroundImage: (image: string | null) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set({
      backgroundImage: image,
    });
  },

  addUploadedFont: (font: FontDef) =>
    set((state) => ({
      uploadedFonts: [...state.uploadedFonts, font],
    })),

  removeUploadedFont: (family: string) =>
    set((state) => ({
      uploadedFonts: state.uploadedFonts.filter((f) => f.family !== family),
      objects: state.objects.map((obj) =>
        obj.type === "text" && (obj as import("@/types/editor").TextObject).fontFamily === family
          ? { ...obj, fontFamily: null }
          : obj,
      ),
    })),

  // Target library action
  setTargetLibrary: (lib: TargetLibrary) =>
    set({
      targetLibrary: lib,
    }),

  // Object duplication
  duplicateObjects: (ids: string[]) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set((state) => {
      const clones: AnyCanvasObject[] = [];
      const newIds: string[] = [];

      for (const id of ids) {
        const obj = state.objects.find((o) => o.id === id);
        if (!obj) continue;

        const clone = {
          ...obj,
          id: crypto.randomUUID(),
          name: obj.name + " Copy",
          x: obj.x + 20,
          y: obj.y + 20,
        };

        clones.push(clone);
        newIds.push(clone.id);
      }

      return {
        objects: [...state.objects, ...clones],
        selectedIds: newIds,
        stateVersion: state.stateVersion + 1,
      };
    });
  },

  // Flip object (images only)
  flipObject: (id: string, axis: "x" | "y") => {
    set((state) => {
      const obj = state.objects.find((o) => o.id === id);
      if (!obj || obj.type !== "image") return state;

      const historyStore = useHistoryStore.getState();
      if (!historyStore.isPaused) {
        historyStore.pushState(captureSnapshot(state));
      }

      const imageObj = obj as import("@/types/editor").ImageObject;

      return {
        objects: state.objects.map((o) =>
          o.id === id
            ? {
                ...o,
                ...(axis === "x"
                  ? { flipX: !imageObj.flipX }
                  : { flipY: !imageObj.flipY }),
              }
            : o,
        ),
        stateVersion: state.stateVersion + 1,
      };
    });
  },

  // Set object locked state
  setObjectLocked: (id: string, locked: boolean) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, locked } : obj,
      ),
      stateVersion: state.stateVersion + 1,
    }));
  },

  // Set object visible state
  setObjectVisible: (id: string, visible: boolean) => {
    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(get()));
    }
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, visible } : obj,
      ),
      stateVersion: state.stateVersion + 1,
    }));
  },

  // Reorder object to specific index (for drag-and-drop)
  reorderToIndex: (id: string, targetIndex: number) => {
    set((state) => {
      const currentIndex = state.objects.findIndex((obj) => obj.id === id);
      if (currentIndex === -1) return state;

      // Clamp targetIndex to valid range
      const clampedIndex = Math.max(0, Math.min(state.objects.length - 1, targetIndex));

      // No-op if target equals current index
      if (clampedIndex === currentIndex) return state;

      const historyStore = useHistoryStore.getState();
      if (!historyStore.isPaused) {
        historyStore.pushState(captureSnapshot(state));
      }

      const newObjects = [...state.objects];
      const [removed] = newObjects.splice(currentIndex, 1);
      newObjects.splice(clampedIndex, 0, removed);

      return { objects: newObjects, stateVersion: state.stateVersion + 1 };
    });
  },

  // Set built-in fonts (called by font loader hook)
  setBuiltInFonts: (fonts: FontDef[]) =>
    set({
      builtInFonts: fonts,
    }),

  // Code generation action
  generateCode: () =>
    set((state) => ({
      generatedCode: generateCodeDispatcher(state, state.targetLibrary),
      codeGeneratedAtVersion: state.stateVersion,
    })),

  // Code panel open state
  setCodePanelOpen: (open: boolean) =>
    set({
      codePanelOpen: open,
    }),

  // History actions
  restoreSnapshot: (snapshot: HistorySnapshot) => {
    const historyStore = useHistoryStore.getState();
    historyStore.pauseHistory();

    set({
      objects: snapshot.objects,
      globalFont: snapshot.globalFont,
      backgroundColor: snapshot.backgroundColor,
      backgroundType: snapshot.backgroundType,
      backgroundGradient: snapshot.backgroundGradient,
      backgroundImage: snapshot.backgroundImage,
      backgroundPattern: snapshot.backgroundPattern,
      selectedIds: [], // Clear selection to avoid stale references
    });

    historyStore.resumeHistory();
  },

  performUndo: () => {
    const state = get();
    const currentSnapshot = captureSnapshot(state);
    const historyStore = useHistoryStore.getState();
    const restoredSnapshot = historyStore.undo(currentSnapshot);

    if (restoredSnapshot) {
      state.restoreSnapshot(restoredSnapshot);
    }
  },

  performRedo: () => {
    const state = get();
    const currentSnapshot = captureSnapshot(state);
    const historyStore = useHistoryStore.getState();
    const restoredSnapshot = historyStore.redo(currentSnapshot);

    if (restoredSnapshot) {
      state.restoreSnapshot(restoredSnapshot);
    }
  },

  // Snap guide actions (not in undo history)
  toggleSnap: () =>
    set((state) => ({
      snapEnabled: !state.snapEnabled,
    })),

  setActiveGuides: (guides: SnapLine[]) =>
    set({
      activeGuides: guides,
    }),

  clearGuides: () =>
    set({
      activeGuides: [],
    }),

  // Crop mode actions (not in undo history)
  enterCropMode: (imageId: string) =>
    set({
      cropMode: { active: true, imageId },
    }),

  exitCropMode: () =>
    set({
      cropMode: { active: false, imageId: null },
    }),

  // Pen tool actions (not in undo history)
  setPenToolActive: (active: boolean) =>
    set({
      penToolActive: active,
    }),

  setEditingCustomShapeId: (id: string | null) =>
    set({
      editingCustomShapeId: id,
    }),

  // Group actions
  groupObjects: (ids: string[]) => {
    const state = get();
    if (ids.length < 2) return;

    const objectsToGroup = ids
      .map((id) => state.objects.find((o) => o.id === id))
      .filter((o): o is AnyCanvasObject => !!o);

    if (objectsToGroup.length < 2) return;

    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(state));
    }

    // Determine the highest array index among selected objects to preserve z-order context
    const indices = ids.map((id) => state.objects.findIndex((o) => o.id === id));
    const insertIndex = Math.max(...indices);

    const groupCount = state.objects.filter((o) => o.type === "group").length + 1;
    const newGroup = createGroup(objectsToGroup, groupCount);

    const remainingObjects = state.objects.filter((o) => !ids.includes(o.id));
    remainingObjects.splice(insertIndex - ids.length + 1, 0, newGroup);

    set((state) => ({
      objects: remainingObjects,
      selectedIds: [newGroup.id],
      stateVersion: state.stateVersion + 1,
    }));
  },

  ungroupObject: (groupId: string) => {
    const state = get();
    const group = state.objects.find((o) => o.id === groupId) as GroupObject | undefined;
    if (!group || group.type !== "group") return;

    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(state));
    }

    const groupIndex = state.objects.findIndex((o) => o.id === groupId);
    const children = utilUngroupObject(group);

    const newObjects = [...state.objects];
    newObjects.splice(groupIndex, 1, ...children);

    set((state) => ({
      objects: newObjects,
      selectedIds: children.map((c) => c.id),
      editingGroupId: null,
      stateVersion: state.stateVersion + 1,
    }));
  },

  setEditingGroup: (groupId: string | null) =>
    set({
      editingGroupId: groupId,
      selectedIds: groupId ? [] : [],
    }),

  // Alignment actions
  alignSelectedObjects: (alignment) => {
    const state = get();
    const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id));
    if (selectedObjects.length < 2) return;

    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(state));
    }

    const alignable = selectedObjects.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    }));

    const updates = alignObjects(alignable, alignment);

    set((s) => ({
      objects: s.objects.map((obj) => {
        const update = updates.find((u) => u.id === obj.id);
        if (!update) return obj;
        return { ...obj, x: update.x, y: update.y };
      }),
      stateVersion: s.stateVersion + 1,
    }));
  },

  distributeSelectedObjects: (distribution) => {
    const state = get();
    const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id));
    if (selectedObjects.length < 3) return;

    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(state));
    }

    const alignable = selectedObjects.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    }));

    const updates = distributeObjects(alignable, distribution);

    set((s) => ({
      objects: s.objects.map((obj) => {
        const update = updates.find((u) => u.id === obj.id);
        if (!update) return obj;
        return { ...obj, x: update.x, y: update.y };
      }),
      stateVersion: s.stateVersion + 1,
    }));
  },

  // Cut action
  cutObjects: (ids: string[]) => {
    const state = get();
    const objectsToCut = ids
      .map((id) => state.objects.find((o) => o.id === id))
      .filter((o): o is AnyCanvasObject => !!o);

    if (objectsToCut.length === 0) return;

    const historyStore = useHistoryStore.getState();
    if (!historyStore.isPaused) {
      historyStore.pushState(captureSnapshot(state));
    }

    // Deep clone with new IDs for clipboard
    setClipboard(objectsToCut.map((o) => deepCloneWithNewIds(o)));

    set((s) => ({
      objects: s.objects.filter((o) => !ids.includes(o.id)),
      selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
      stateVersion: s.stateVersion + 1,
    }));
  },

  // Export flag
  setExporting: (value) => set({ isExporting: value }),

  // Code playground actions
  toggleCodePlayground: () =>
    set((state) => ({ codePlaygroundOpen: !state.codePlaygroundOpen })),

  // Context menu actions
  showContextMenu: (position, targetId) =>
    set({
      contextMenuVisible: true,
      contextMenuPosition: position,
      contextMenuTargetId: targetId,
    }),

  hideContextMenu: () =>
    set({
      contextMenuVisible: false,
      contextMenuTargetId: null,
    }),

  // Guide actions (not in undo history)
  addGuide: (orientation, position) =>
    set((state) => ({
      guides: [
        ...state.guides,
        { id: crypto.randomUUID(), orientation, position, locked: false } as Guide,
      ],
    })),

  updateGuide: (id, partial) =>
    set((state) => ({
      guides: state.guides.map((g) =>
        g.id === id ? { ...g, ...partial } : g
      ),
    })),

  removeGuide: (id) =>
    set((state) => ({
      guides: state.guides.filter((g) => g.id !== id),
    })),

  clearAllGuides: () => set({ guides: [] }),

  toggleRulers: () =>
    set((state) => ({ showRulers: !state.showRulers })),

  // Zoom actions
  zoomToFitCanvas: (viewportWidth, viewportHeight) => {
    const state = get();
    const { canvasWidth, canvasHeight } = state;
    const fitZoom = Math.min(
      viewportWidth / (canvasWidth * 1.1),
      viewportHeight / (canvasHeight * 1.1)
    );
    const clampedZoom = Math.max(0.25, Math.min(4, fitZoom));
    state.updateCanvas({ zoom: clampedZoom });
  },

  zoomToSelection: (viewportWidth, viewportHeight) => {
    const state = get();
    const { objects, selectedIds } = state;
    const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
    if (selectedObjects.length === 0) return;

    const minX = Math.min(...selectedObjects.map((o) => o.x));
    const minY = Math.min(...selectedObjects.map((o) => o.y));
    const maxX = Math.max(...selectedObjects.map((o) => o.x + o.width));
    const maxY = Math.max(...selectedObjects.map((o) => o.y + o.height));
    const boundsWidth = maxX - minX || 1;
    const boundsHeight = maxY - minY || 1;

    let fitZoom = Math.min(
      viewportWidth / (boundsWidth * 1.1),
      viewportHeight / (boundsHeight * 1.1)
    );
    if (selectedObjects.length === 1) {
      fitZoom = Math.min(fitZoom, 2.0);
    }
    const clampedZoom = Math.max(0.25, Math.min(4, fitZoom));
    state.updateCanvas({ zoom: clampedZoom });
  },

  setZoomPreset: (zoomLevel) => {
    const state = get();
    state.updateCanvas({ zoom: zoomLevel });
  },
}));
