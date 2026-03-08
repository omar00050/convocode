"use client";

import { memo, useMemo } from "react";
import { Group, Rect, Ellipse, RegularPolygon, Star, Arrow, Line, Path } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { calculateSnapGuides } from "@/lib/snap";
import { createPatternTile } from "@/lib/pattern-renderer";
import type { ShapeObject } from "@/types/editor";
import type Konva from "konva";

interface CanvasShapeProps {
  obj: ShapeObject;
}

function CanvasShapeInner({ obj }: CanvasShapeProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);
  const setEditingCustomShapeId = useEditorStore((state) => state.setEditingCustomShapeId);

  // Snap guide state and actions
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const objects = useEditorStore((state) => state.objects);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const guides = useEditorStore((state) => state.guides);
  const setActiveGuides = useEditorStore((state) => state.setActiveGuides);
  const clearGuides = useEditorStore((state) => state.clearGuides);

  // Early return if not visible
  if (!obj.visible) {
    return null;
  }

  // Extract shadow opacity from 8-digit hex color
  const shadowOpacity = obj.shadowColor.length >= 9
    ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
    : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

  // Pattern tile caching - only recreate when pattern params change
  const patternTile = useMemo(() => {
    if (obj.fillType !== "pattern" || !obj.fillPattern) return null;
    return createPatternTile(
      obj.fillPattern.patternType,
      obj.fillPattern.foregroundColor,
      obj.fillPattern.backgroundColor,
      obj.fillPattern.scale
    );
  }, [
    obj.fillType,
    obj.fillPattern?.patternType,
    obj.fillPattern?.foregroundColor,
    obj.fillPattern?.backgroundColor,
    obj.fillPattern?.scale,
  ]);

  // Shadow props object for spreading
  const shadowProps = obj.shadowEnabled
    ? {
        shadowColor: shadowColorHex,
        shadowBlur: obj.shadowBlur,
        shadowOffset: { x: obj.shadowOffsetX, y: obj.shadowOffsetY },
        shadowOpacity,
        shadowForStrokeEnabled: false,
      }
    : {};

  // Pattern fill props for shapes
  const patternProps = patternTile
    ? {
        fillPriority: "pattern" as const,
        // Konva types expect HTMLImageElement but HTMLCanvasElement works at runtime
        fillPatternImage: patternTile as unknown as HTMLImageElement,
        fillPatternRotation: obj.fillPattern?.rotation ?? 0,
      }
    : {};

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      toggleSelection(obj.id);
    } else {
      setSelection([obj.id]);
    }
  };

  const handleTap = () => {
    setSelection([obj.id]);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (obj.locked) return;
    if (!snapEnabled) return;

    const node = e.target;
    const draggedBounds = {
      x: node.x(),
      y: node.y(),
      width: obj.width,
      height: obj.height,
    };

    // Get other objects (exclude self, hidden, locked)
    const otherObjects = objects.filter(
      (o) => o.id !== obj.id && o.visible && !o.locked
    );

    const result = calculateSnapGuides(
      draggedBounds,
      otherObjects,
      { width: canvasWidth, height: canvasHeight },
      5,
      guides
    );

    // Apply snapped position
    if (result.snappedX !== null) {
      node.x(result.snappedX);
    }
    if (result.snappedY !== null) {
      node.y(result.snappedY);
    }

    // Update active guides for rendering
    setActiveGuides(result.activeGuides);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (obj.locked) return;

    // Clear snap guides
    clearGuides();

    const node = e.target;
    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
    });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    if (obj.locked) return;
    const node = e.target;

    // Compute new dimensions from transformed state
    const newWidth = Math.max(5, obj.width * Math.abs(node.scaleX()));
    const newHeight = Math.max(5, obj.height * Math.abs(node.scaleY()));

    // Reset scale back to 1 to prevent scale drift
    node.scaleX(1);
    node.scaleY(1);

    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    } as Partial<Omit<ShapeObject, "type">>);
  };

  // Double-click handler for custom shapes — enters point edit mode
  const handleDblClickCustom = () => {
    if (!obj.locked && obj.shapeType === "custom") {
      setSelection([obj.id]);
      setEditingCustomShapeId(obj.id);
    }
  };

  // Render the inner shape based on shapeType
  const renderInnerShape = () => {
    const { width, height, fill, stroke, strokeWidth } = obj;

    // Use pattern fill if pattern is active, otherwise use solid fill
    const fillValue = patternTile ? undefined : fill;

    switch (obj.shapeType) {
      case "rect":
        return (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            cornerRadius={obj.cornerRadius ?? 0}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "circle":
        return (
          <Ellipse
            x={width / 2}
            y={height / 2}
            radiusX={width / 2}
            radiusY={height / 2}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "triangle":
        return (
          <RegularPolygon
            x={width / 2}
            y={height / 2}
            sides={3}
            radius={Math.min(width, height) / 2}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "star":
        const outerRadius = Math.min(width, height) / 2;
        return (
          <Star
            x={width / 2}
            y={height / 2}
            numPoints={5}
            outerRadius={outerRadius}
            innerRadius={obj.innerRadius ?? outerRadius * 0.4}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "arrow":
        return (
          <Arrow
            points={[0, height / 2, width, height / 2]}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            pointerLength={15}
            pointerWidth={15}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "line":
        return (
          <Line
            points={[0, height / 2, width, height / 2]}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
          />
        );

      case "polygon":
        return (
          <RegularPolygon
            x={width / 2}
            y={height / 2}
            sides={obj.sides ?? 6}
            radius={Math.min(width, height) / 2}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "diamond":
        return (
          <Line
            points={[width / 2, 0, width, height / 2, width / 2, height, 0, height / 2]}
            closed
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadowProps}
            {...patternProps}
          />
        );

      case "icon":
        if (!obj.svgPath) return null;
        return (
          <Path
            data={obj.svgPath}
            x={0}
            y={0}
            scaleX={width / 24}
            scaleY={height / 24}
            stroke={fill}
            strokeWidth={2 * (24 / Math.max(width, height, 1))}
            fill="transparent"
            lineCap="round"
            lineJoin="round"
            {...shadowProps}
          />
        );

      case "custom": {
        if (!obj.customPath) return null;
        const origW = obj.customPathOriginalWidth ?? width;
        const origH = obj.customPathOriginalHeight ?? height;
        const scaleX = origW > 0 ? width / origW : 1;
        const scaleY = origH > 0 ? height / origH : 1;
        return (
          <Path
            data={obj.customPath}
            x={0}
            y={0}
            scaleX={scaleX}
            scaleY={scaleY}
            fill={fillValue}
            stroke={stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            closed={obj.customPath.includes("Z") || obj.customPath.includes("z")}
            onDblClick={handleDblClickCustom}
            {...shadowProps}
            {...patternProps}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      opacity={obj.opacity}
      draggable={!obj.locked}
      visible={obj.visible}
      onClick={handleClick}
      onTap={handleTap}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      // Blend mode applies to entire shape group
      {...(obj.blendMode !== "source-over" && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation: obj.blendMode as any,
      })}
    >
      {renderInnerShape()}
    </Group>
  );
}

// Memoize to prevent re-renders when other objects change
export default memo(CanvasShapeInner);
