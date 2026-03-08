"use client";

import { useState, useEffect, useCallback } from "react";
import { Layer, Circle, Line } from "react-konva";
import {
  svgPathToCommands,
  commandsToSvgPath,
  getPointsFromPath,
  updatePointInPath,
  addPointToPath,
  removePointFromPath,
} from "@/lib/custom-path-utils";
import type { EditablePoint } from "@/lib/custom-path-utils";
import { useEditorStore } from "@/stores/editor-store";
import type { ShapeObject } from "@/types/editor";
import type Konva from "konva";

interface PenEditOverlayProps {
  shape: ShapeObject;
  stageRef: React.RefObject<Konva.Stage | null>;
  onExit: () => void;
}

export default function PenEditOverlay({ shape, stageRef, onExit }: PenEditOverlayProps) {
  const updateObject = useEditorStore((state) => state.updateObject);

  const [commands, setCommands] = useState(() =>
    svgPathToCommands(shape.customPath ?? "")
  );
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Sync commands when shape.customPath changes externally
  useEffect(() => {
    setCommands(svgPathToCommands(shape.customPath ?? ""));
  }, [shape.customPath]);

  const points: EditablePoint[] = getPointsFromPath(commands);

  // Scale factors from original path coords to rendered size
  const scaleX = (shape.customPathOriginalWidth ?? shape.width) > 0
    ? shape.width / (shape.customPathOriginalWidth ?? shape.width)
    : 1;
  const scaleY = (shape.customPathOriginalHeight ?? shape.height) > 0
    ? shape.height / (shape.customPathOriginalHeight ?? shape.height)
    : 1;

  // Convert local path coords to stage coords
  const toStage = (lx: number, ly: number) => ({
    x: shape.x + lx * scaleX,
    y: shape.y + ly * scaleY,
  });

  // Convert stage coords back to local path coords
  const toLocal = (sx: number, sy: number) => ({
    x: (sx - shape.x) / scaleX,
    y: (sy - shape.y) / scaleY,
  });

  const getCanvasPos = useCallback((e: Konva.KonvaEventObject<DragEvent>): { x: number; y: number } => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pos);
  }, [stageRef]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onExit();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPointIdx !== null) {
        e.preventDefault();
        const pt = points[selectedPointIdx];
        const newCmds = removePointFromPath(commands, pt.commandIndex);
        setCommands(newCmds);
        setSelectedPointIdx(null);
        const newPath = commandsToSvgPath(newCmds);
        updateObject(shape.id, { customPath: newPath } as Parameters<typeof updateObject>[1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPointIdx, points, commands, shape.id, updateObject, onExit]);

  const handlePointDragMove = (e: Konva.KonvaEventObject<DragEvent>, ptIdx: number) => {
    const pos = getCanvasPos(e);
    const localPos = toLocal(pos.x, pos.y);
    const pt = points[ptIdx];
    const newCmds = updatePointInPath(commands, pt.commandIndex, pt.valueIndex, localPos.x, localPos.y);
    setCommands(newCmds);
    const newPath = commandsToSvgPath(newCmds);
    updateObject(shape.id, { customPath: newPath } as Parameters<typeof updateObject>[1], true);
  };

  const handlePointDragEnd = (e: Konva.KonvaEventObject<DragEvent>, ptIdx: number) => {
    const pos = getCanvasPos(e);
    const localPos = toLocal(pos.x, pos.y);
    const pt = points[ptIdx];
    const newCmds = updatePointInPath(commands, pt.commandIndex, pt.valueIndex, localPos.x, localPos.y);
    setCommands(newCmds);
    const newPath = commandsToSvgPath(newCmds);
    updateObject(shape.id, { customPath: newPath } as Parameters<typeof updateObject>[1]);
    setDraggingIdx(null);
  };

  return (
    <Layer>
      {/* Control handle connection lines */}
      {points.map((pt, i) => {
        if (pt.type !== "anchor") return null;
        const stagePos = toStage(pt.x, pt.y);
        // Find associated control handles
        const controlPts = points.filter(
          (p, pi) => pi !== i && p.commandIndex === pt.commandIndex && p.type !== "anchor"
        );
        return controlPts.map((cp, ci) => {
          const cpPos = toStage(cp.x, cp.y);
          return (
            <Line
              key={`handle-line-${i}-${ci}`}
              points={[stagePos.x, stagePos.y, cpPos.x, cpPos.y]}
              stroke="#6b7280"
              strokeWidth={1}
              dash={[3, 3]}
              listening={false}
            />
          );
        });
      })}

      {/* Points */}
      {points.map((pt, i) => {
        const stagePos = toStage(pt.x, pt.y);
        const isAnchor = pt.type === "anchor";
        const isSelected = selectedPointIdx === i;

        return (
          <Circle
            key={`pt-${i}`}
            x={stagePos.x}
            y={stagePos.y}
            radius={isAnchor ? 6 : 4}
            fill={isAnchor ? (isSelected ? "#3b82f6" : "white") : "#3b82f6"}
            stroke={isAnchor ? "#3b82f6" : "white"}
            strokeWidth={isAnchor ? 2 : 1}
            draggable
            onClick={() => setSelectedPointIdx(i === selectedPointIdx ? null : i)}
            onDragMove={(e) => {
              setDraggingIdx(i);
              handlePointDragMove(e, i);
            }}
            onDragEnd={(e) => handlePointDragEnd(e, i)}
          />
        );
      })}
    </Layer>
  );
}
