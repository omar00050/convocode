"use client";

import { memo, useEffect, useState, useRef } from "react";
import { Image as KonvaImage, Group } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { loadImageElement } from "@/lib/image-utils";
import { getKonvaClipFunc } from "@/lib/mask-paths";
import { calculateSnapGuides, getObjectBounds } from "@/lib/snap";
import type { ImageObject } from "@/types/editor";
import type Konva from "konva";

interface CanvasImageProps {
  obj: ImageObject;
}

function CanvasImageInner({ obj }: CanvasImageProps) {
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const updateObject = useEditorStore((state) => state.updateObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);

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

  // Load image element from src
  useEffect(() => {
    let mounted = true;

    loadImageElement(obj.src)
      .then((img) => {
        if (mounted) {
          setLoadedImage(img);
        }
      })
      .catch(() => {
        // Silently fail - image won't render
      });

    return () => {
      mounted = false;
    };
  }, [obj.src]);

  // Don't render until image is loaded
  if (!loadedImage) {
    return null;
  }

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
    const newWidth = Math.max(5, node.width() * Math.abs(node.scaleX()));
    const newHeight = Math.max(5, node.height() * Math.abs(node.scaleY()));

    // Reset scale back to 1 (or -1 if flipped) to prevent scale drift
    const newScaleX = obj.flipX ? -1 : 1;
    const newScaleY = obj.flipY ? -1 : 1;
    node.scaleX(newScaleX);
    node.scaleY(newScaleY);

    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
  };

  // Handle flip offset for center-based flipping
  const offsetX = obj.flipX ? obj.width / 2 : 0;
  const offsetY = obj.flipY ? obj.height / 2 : 0;

  // Extract shadow opacity from 8-digit hex color
  const shadowOpacity = obj.shadowColor.length >= 9
    ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
    : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

  const cropProps =
    obj.cropX !== undefined &&
    obj.cropY !== undefined &&
    obj.cropWidth !== undefined &&
    obj.cropHeight !== undefined
      ? {
          x: obj.cropX,
          y: obj.cropY,
          width: obj.cropWidth,
          height: obj.cropHeight,
        }
      : undefined;

  const shadowProps = obj.shadowEnabled
    ? {
        shadowColor: shadowColorHex,
        shadowBlur: obj.shadowBlur,
        shadowOffset: { x: obj.shadowOffsetX, y: obj.shadowOffsetY },
        shadowOpacity,
        shadowForStrokeEnabled: false,
      }
    : {};

  const blendProps =
    obj.blendMode !== "source-over"
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          globalCompositeOperation: obj.blendMode as any,
        }
      : {};

  const hasMask = obj.maskType && obj.maskType !== "none";

  if (hasMask) {
    const clipFunc = getKonvaClipFunc(
      obj.maskType,
      obj.width,
      obj.height,
      obj.maskRadius
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    return (
      <Group
        id={obj.id}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        rotation={obj.rotation}
        scaleX={obj.flipX ? -1 : 1}
        scaleY={obj.flipY ? -1 : 1}
        offsetX={offsetX}
        offsetY={offsetY}
        draggable={!obj.locked}
        visible={obj.visible}
        onClick={handleClick}
        onTap={handleTap}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        clipFunc={clipFunc}
        {...shadowProps}
        {...blendProps}
      >
        <KonvaImage
          image={loadedImage}
          x={0}
          y={0}
          width={obj.width}
          height={obj.height}
          opacity={obj.opacity}
          crop={cropProps}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={obj.id}
      image={loadedImage}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      opacity={obj.opacity}
      scaleX={obj.flipX ? -1 : 1}
      scaleY={obj.flipY ? -1 : 1}
      offsetX={offsetX}
      offsetY={offsetY}
      draggable={!obj.locked}
      visible={obj.visible}
      onClick={handleClick}
      onTap={handleTap}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      crop={cropProps}
      {...shadowProps}
      {...blendProps}
    />
  );
}

// Memoize to prevent re-renders when other objects change
export default memo(CanvasImageInner);
