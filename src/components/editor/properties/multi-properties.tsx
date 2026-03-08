"use client";

import { useRef, useEffect } from "react";
import { Trash2, Lock, Unlock, FlipHorizontal, FlipVertical, Group, Ungroup } from "lucide-react";
import type { AnyCanvasObject } from "@/types/editor";
import { useEditorStore } from "@/stores/editor-store";
import { canGroup } from "@/lib/group-utils";
import NumericInput from "@/components/ui/numeric-input";
import SliderInput from "@/components/ui/slider-input";
import AlignmentToolbar from "@/components/editor/alignment-toolbar";

interface MultiPropertiesProps {
  objects: AnyCanvasObject[];
}

export default function MultiProperties({ objects }: MultiPropertiesProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const removeObject = useEditorStore((state) => state.removeObject);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const flipObject = useEditorStore((state) => state.flipObject);
  const setObjectLocked = useEditorStore((state) => state.setObjectLocked);
  const groupObjects = useEditorStore((state) => state.groupObjects);
  const ungroupObject = useEditorStore((state) => state.ungroupObject);
  const selectedIds = useEditorStore((state) => state.selectedIds);

  const isSingleGroup = objects.length === 1 && objects[0].type === "group";
  const canGroupSelected = objects.length >= 2 && canGroup(objects);
  const singleGroupId = isSingleGroup ? objects[0].id : null;

  // Reference values for delta-based updates
  const refX = useRef(objects[0]?.x ?? 0);
  const refY = useRef(objects[0]?.y ?? 0);
  const refRotation = useRef(objects[0]?.rotation ?? 0);

  // Update refs when selection changes
  useEffect(() => {
    if (objects.length > 0) {
      refX.current = objects[0].x;
      refY.current = objects[0].y;
      refRotation.current = objects[0].rotation;
    }
  }, [objects.map((o) => o.id).join(",")]);

  const handleXChange = (newVal: number) => {
    const delta = newVal - refX.current;
    objects.forEach((obj) => {
      updateObject(obj.id, { x: obj.x + delta });
    });
    refX.current = newVal;
  };

  const handleYChange = (newVal: number) => {
    const delta = newVal - refY.current;
    objects.forEach((obj) => {
      updateObject(obj.id, { y: obj.y + delta });
    });
    refY.current = newVal;
  };

  const handleRotationChange = (newVal: number) => {
    const delta = newVal - refRotation.current;
    objects.forEach((obj) => {
      updateObject(obj.id, { rotation: obj.rotation + delta });
    });
    refRotation.current = newVal;
  };

  const handleOpacityChange = (value: number) => {
    // Absolute value for opacity (not delta-based)
    objects.forEach((obj) => {
      updateObject(obj.id, { opacity: value / 100 });
    });
  };

  const handleFlipX = () => {
    objects.forEach((obj) => {
      if (obj.type === "image") {
        flipObject(obj.id, "x");
      }
    });
  };

  const handleFlipY = () => {
    objects.forEach((obj) => {
      if (obj.type === "image") {
        flipObject(obj.id, "y");
      }
    });
  };

  const handleDelete = () => {
    objects.forEach((obj) => {
      removeObject(obj.id);
    });
    clearSelection();
  };

  const allImages = objects.every((o) => o.type === "image");

  // Determine lock state - if any are unlocked, show Lock; if all locked, show Unlock
  const anyUnlocked = objects.some((o) => !o.locked);

  const handleLockToggle = () => {
    const newLockState = anyUnlocked; // Lock all if any are unlocked
    objects.forEach((obj) => {
      setObjectLocked(obj.id, newLockState);
    });
  };

  // Get first object's values for display
  const firstObj = objects[0];

  return (
    <div className="space-y-4">
      {/* Alignment Toolbar - visible for 2+ objects */}
      <AlignmentToolbar selectedCount={objects.length} />

      {/* Group / Ungroup buttons */}
      <div className="flex gap-2">
        {!isSingleGroup ? (
          <button
            type="button"
            onClick={() => groupObjects(selectedIds)}
            disabled={!canGroupSelected}
            title={!canGroupSelected && objects.length >= 2 ? "Maximum nesting depth (3) reached" : "Group (⌘G)"}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors ${
              canGroupSelected
                ? "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
                : "bg-[#2a2a2a] border-[#3a3a3a] text-gray-600 cursor-not-allowed"
            }`}
          >
            <Group className="w-4 h-4" />
            Group
          </button>
        ) : (
          <button
            type="button"
            onClick={() => singleGroupId && ungroupObject(singleGroupId)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-[#333] border-[#555] text-gray-300 hover:border-[#666] text-xs transition-colors"
          >
            <Ungroup className="w-4 h-4" />
            Ungroup
          </button>
        )}
      </div>

      {/* Position Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Position
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <NumericInput
            label="X"
            value={refX.current}
            onChange={handleXChange}
          />
          <NumericInput
            label="Y"
            value={refY.current}
            onChange={handleYChange}
          />
        </div>
      </div>

      {/* Rotation Section */}
      <div className="space-y-2">
        <NumericInput
          label="Rotation"
          value={refRotation.current}
          onChange={handleRotationChange}
          min={0}
          max={360}
          suffix="°"
        />
      </div>

      {/* Opacity Section */}
      <div className="space-y-2">
        <SliderInput
          label="Opacity"
          value={Math.round((firstObj?.opacity ?? 1) * 100)}
          onChange={handleOpacityChange}
        />
      </div>

      {/* Flip Section - Only shown when all selected are images */}
      {allImages && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Flip
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFlipX}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-[#333] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="text-xs">Flip H</span>
            </button>
            <button
              type="button"
              onClick={handleFlipY}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-[#333] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
            >
              <FlipVertical className="w-4 h-4" />
              <span className="text-xs">Flip V</span>
            </button>
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Actions
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleLockToggle}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-[#333] border-[#555] text-gray-300 hover:border-[#666] transition-colors"
          >
            {anyUnlocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            <span className="text-xs">{anyUnlocked ? "Lock" : "Unlock"}</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border bg-red-900/30 border-red-800/50 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
