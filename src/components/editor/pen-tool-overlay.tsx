"use client";

import { useState, useEffect, useCallback } from "react";
import { Layer, Circle, Line, Path, Rect, Group } from "react-konva";
import { computePathBoundingBox, commandsToSvgPath, translatePathCommands } from "@/lib/custom-path-utils";
import type { PathCommand } from "@/lib/custom-path-utils";
import type { ShapeObject } from "@/types/editor";
import type Konva from "konva";

interface PenAnchor {
  x: number;
  y: number;
  // Control handles for bezier curves (may be null for straight corners)
  handleIn: { x: number; y: number } | null;  // incoming handle
  handleOut: { x: number; y: number } | null; // outgoing handle
}

interface PenToolOverlayProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  containerWidth: number;
  containerHeight: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  onComplete: (shape: ShapeObject) => void;
  onCancel: () => void;
}

const CLOSE_THRESHOLD = 10; // px distance to close path

/**
 * Converts anchor points to PathCommand[] SVG path representation.
 */
function anchorsToCommands(anchors: PenAnchor[], closed: boolean): PathCommand[] {
  if (anchors.length === 0) return [];

  const commands: PathCommand[] = [];
  commands.push({ type: "M", values: [anchors[0].x, anchors[0].y] });

  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const curr = anchors[i];

    if (prev.handleOut || curr.handleIn) {
      // Cubic bezier
      const cp1 = prev.handleOut ?? { x: prev.x, y: prev.y };
      const cp2 = curr.handleIn ?? { x: curr.x, y: curr.y };
      commands.push({
        type: "C",
        values: [cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y],
      });
    } else {
      commands.push({ type: "L", values: [curr.x, curr.y] });
    }
  }

  if (closed && anchors.length > 2) {
    // Connect back to first point
    const last = anchors[anchors.length - 1];
    const first = anchors[0];
    if (last.handleOut || first.handleIn) {
      const cp1 = last.handleOut ?? { x: last.x, y: last.y };
      const cp2 = first.handleIn ?? { x: first.x, y: first.y };
      commands.push({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, first.x, first.y] });
    }
    commands.push({ type: "Z", values: [] });
  }

  return commands;
}

/**
 * Creates a ShapeObject from the drawn anchors.
 */
function createShapeFromAnchors(anchors: PenAnchor[], closed: boolean): ShapeObject {
  const commands = anchorsToCommands(anchors, closed);
  const bbox = computePathBoundingBox(commands);

  // Normalize coordinates to bbox origin
  const normalizedCommands = translatePathCommands(commands, -bbox.x, -bbox.y);
  const pathData = commandsToSvgPath(normalizedCommands);

  const w = Math.max(10, bbox.width);
  const h = Math.max(10, bbox.height);

  return {
    id: crypto.randomUUID(),
    type: "shape",
    shapeType: "custom",
    x: bbox.x,
    y: bbox.y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: "Custom Shape",
    shadowEnabled: false,
    shadowColor: "#00000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    blendMode: "source-over",
    fill: closed ? "#6366f1" : "transparent",
    stroke: "#000000",
    strokeWidth: 2,
    customPath: pathData,
    customPathOriginalWidth: w,
    customPathOriginalHeight: h,
  };
}

export default function PenToolOverlay({ stageRef, containerWidth, containerHeight, offsetX, offsetY, zoom, onComplete, onCancel }: PenToolOverlayProps) {
  const [anchors, setAnchors] = useState<PenAnchor[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);

  // Get canvas position from stage
  const getCanvasPos = useCallback((e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const transform = stage.getAbsoluteTransform().copy().invert();
    const worldPos = transform.point(pos);
    return {
      x: (worldPos.x - offsetX) / zoom,
      y: (worldPos.y - offsetY) / zoom,
    };
  }, [stageRef, offsetX, offsetY, zoom]);

  // Finish/complete the path
  const finishPath = useCallback((closed: boolean) => {
    if (anchors.length < 2) {
      onCancel();
      return;
    }
    const shape = createShapeFromAnchors(anchors, closed);
    onComplete(shape);
  }, [anchors, onComplete, onCancel]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishPath(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (anchors.length <= 1) {
          onCancel();
        } else {
          finishPath(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anchors.length, finishPath, onCancel]);

  // Check if mouse is near first anchor (for path closing)
  const isNearFirstAnchor = (pos: { x: number; y: number }): boolean => {
    if (anchors.length < 2) return false;
    const first = anchors[0];
    const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
    return dist < CLOSE_THRESHOLD;
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    const pos = getCanvasPos(e);
    setDragStartPos(pos);
    setIsDragging(false);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);

    if (dragStartPos) {
      const dist = Math.hypot(pos.x - dragStartPos.x, pos.y - dragStartPos.y);
      if (dist > 3) {
        setIsDragging(true);
      }
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0 || !dragStartPos) return;
    const pos = getCanvasPos(e);

    if (isNearFirstAnchor(dragStartPos)) {
      // Close path
      finishPath(true);
      setDragStartPos(null);
      setIsDragging(false);
      return;
    }

    if (isDragging) {
      // Bezier anchor: drag direction = outgoing handle
      const dx = pos.x - dragStartPos.x;
      const dy = pos.y - dragStartPos.y;
      const newAnchor: PenAnchor = {
        x: dragStartPos.x,
        y: dragStartPos.y,
        handleOut: { x: dragStartPos.x + dx, y: dragStartPos.y + dy },
        handleIn: { x: dragStartPos.x - dx, y: dragStartPos.y - dy },
      };
      setAnchors((prev) => [...prev, newAnchor]);
    } else {
      // Straight anchor
      const newAnchor: PenAnchor = {
        x: dragStartPos.x,
        y: dragStartPos.y,
        handleIn: null,
        handleOut: null,
      };
      setAnchors((prev) => [...prev, newAnchor]);
    }

    setDragStartPos(null);
    setIsDragging(false);
  };

  const handleDblClick = () => {
    finishPath(false);
  };

  // Build preview path string
  const buildPreviewPath = (): string => {
    if (anchors.length === 0) return "";
    const cmds = anchorsToCommands(anchors, false);
    return commandsToSvgPath(cmds);
  };

  const previewPath = buildPreviewPath();
  const nearFirst = mousePos ? isNearFirstAnchor(mousePos) : false;

  return (
    <Layer
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDblClick={handleDblClick}
    >
      {/* Hit area covering entire stage so mouse events bubble to Layer */}
      <Rect
        x={0}
        y={0}
        width={containerWidth}
        height={containerHeight}
        fill="transparent"
      />

      <Group x={offsetX} y={offsetY} scaleX={zoom} scaleY={zoom}>
        {/* Current path preview */}
        {previewPath && (
          <Path
            data={previewPath}
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="transparent"
            listening={false}
          />
        )}

        {/* Preview line from last anchor to cursor */}
        {mousePos && anchors.length > 0 && (
          <Line
            points={[
              anchors[anchors.length - 1].x,
              anchors[anchors.length - 1].y,
              mousePos.x,
              mousePos.y,
            ]}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        )}

        {/* Anchor points */}
        {anchors.map((anchor, i) => (
          <Circle
            key={`anchor-${i}`}
            x={anchor.x}
            y={anchor.y}
            radius={6}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2}
            listening={false}
          />
        ))}

        {/* Control handles */}
        {anchors.map((anchor, i) => (
          anchor.handleOut && (
            <>
              <Line
                key={`handle-line-${i}`}
                points={[anchor.x, anchor.y, anchor.handleOut.x, anchor.handleOut.y]}
                stroke="#6b7280"
                strokeWidth={1}
                dash={[3, 3]}
                listening={false}
              />
              <Circle
                key={`handle-${i}`}
                x={anchor.handleOut.x}
                y={anchor.handleOut.y}
                radius={4}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={1}
                listening={false}
              />
            </>
          )
        ))}

        {/* First point hover indicator */}
        {nearFirst && anchors.length > 0 && (
          <Circle
            x={anchors[0].x}
            y={anchors[0].y}
            radius={8}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth={1}
            listening={false}
          />
        )}
      </Group>
    </Layer>
  );
}
