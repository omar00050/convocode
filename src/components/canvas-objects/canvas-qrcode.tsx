"use client";

import { memo, useState, useEffect, useMemo } from "react";
import { Group, Image } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { calculateSnapGuides } from "@/lib/snap";
import { generateQRMatrix, drawQRToCanvas } from "@/lib/qr-encoder";
import type { QRCodeObject } from "@/types/editor";
import type Konva from "konva";

interface CanvasQRCodeProps {
  obj: QRCodeObject;
}

function CanvasQRCodeInner({ obj }: CanvasQRCodeProps) {
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

  // State for the Konva image
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate QR code image via offscreen canvas
  const qrDataUrl = useMemo(() => {
    try {
      setError(null);
      const result = generateQRMatrix(obj.data, obj.errorCorrectionLevel);

      // Create offscreen canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = obj.width;
      offscreen.height = obj.height;
      const ctx = offscreen.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      drawQRToCanvas(result, {
        foregroundColor: obj.foregroundColor,
        backgroundColor: obj.backgroundColor,
        padding: obj.padding,
        style: obj.style,
        width: obj.width,
        height: obj.height,
      }, ctx);

      return offscreen.toDataURL();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
      return null;
    }
  }, [
    obj.data,
    obj.errorCorrectionLevel,
    obj.foregroundColor,
    obj.backgroundColor,
    obj.padding,
    obj.style,
    obj.width,
    obj.height,
  ]);

  // Load image when data URL changes
  useEffect(() => {
    if (!qrDataUrl) {
      setKonvaImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      setKonvaImage(img);
    };
    img.onerror = () => {
      setKonvaImage(null);
    };
    img.src = qrDataUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [qrDataUrl]);

  // Early return if not visible
  if (!obj.visible) {
    return null;
  }

  // Extract shadow opacity from 8-digit hex color
  const shadowOpacity = obj.shadowColor.length >= 9
    ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
    : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

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
    const newWidth = Math.max(10, obj.width * Math.abs(node.scaleX()));
    const newHeight = Math.max(10, obj.height * Math.abs(node.scaleY()));

    // Reset scale back to 1 to prevent scale drift
    node.scaleX(1);
    node.scaleY(1);

    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    } as Partial<Omit<QRCodeObject, "type">>);
  };

  // If there's an error, render a placeholder
  if (error || !konvaImage) {
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
        {...(obj.blendMode !== "source-over" && {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          globalCompositeOperation: obj.blendMode as any,
        })}
      >
        {/* Placeholder rectangle when QR can't be rendered */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Image
          image={null as any}
          width={obj.width}
          height={obj.height}
        />
      </Group>
    );
  }

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
      {...(obj.blendMode !== "source-over" && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation: obj.blendMode as any,
      })}
    >
      <Image
        image={konvaImage}
        x={0}
        y={0}
        width={obj.width}
        height={obj.height}
        {...shadowProps}
      />
    </Group>
  );
}

// Memoize to prevent re-renders when other objects change
export default memo(CanvasQRCodeInner);
