"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Rect, Group } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import type { ImageObject } from "@/types/editor";
import type Konva from "konva";

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
}

const HANDLE_SIZE = 10;
const MIN_CROP_SIZE = 20;

/**
 * Crop overlay component for cropping images.
 * Displays draggable handles to define the crop region.
 */
export default function CropOverlay({ canvasWidth, canvasHeight }: CropOverlayProps) {
  const { objects, cropMode, updateObject, exitCropMode } = useEditorStore();

  // Find the image object being cropped
  const imageObj = useMemo(() => {
    if (!cropMode.imageId) return null;
    return objects.find((o) => o.id === cropMode.imageId) as ImageObject | undefined;
  }, [objects, cropMode.imageId]);

  // Local crop rect state in display coordinates
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Image natural dimensions (loaded from image)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Initialize crop rect when entering crop mode
  useEffect(() => {
    if (!imageObj) return;

    // Load image to get natural dimensions
    const img = new window.Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Initialize crop rect from existing crop or full image
      if (
        imageObj.cropX !== undefined &&
        imageObj.cropY !== undefined &&
        imageObj.cropWidth !== undefined &&
        imageObj.cropHeight !== undefined
      ) {
        // Convert from source to display coordinates
        const scaleX = imageObj.width / img.naturalWidth;
        const scaleY = imageObj.height / img.naturalHeight;
        setCropRect({
          x: imageObj.x + imageObj.cropX * scaleX,
          y: imageObj.y + imageObj.cropY * scaleY,
          width: imageObj.cropWidth * scaleX,
          height: imageObj.cropHeight * scaleY,
        });
      } else {
        // Full image
        setCropRect({
          x: imageObj.x,
          y: imageObj.y,
          width: imageObj.width,
          height: imageObj.height,
        });
      }
    };
    img.src = imageObj.src;
  }, [imageObj]);

  // Handle not found
  if (!imageObj || !cropMode.active) {
    return null;
  }

  // Scale factors for coordinate conversion
  const scaleX = naturalSize.width / imageObj.width;
  const scaleY = naturalSize.height / imageObj.height;

  // Convert display crop rect to source coordinates
  const getCropInSourceCoords = () => {
    return {
      cropX: Math.max(0, (cropRect.x - imageObj.x) * scaleX),
      cropY: Math.max(0, (cropRect.y - imageObj.y) * scaleY),
      cropWidth: Math.max(MIN_CROP_SIZE, cropRect.width * scaleX),
      cropHeight: Math.max(MIN_CROP_SIZE, cropRect.height * scaleY),
    };
  };

  // Constrain crop rect to image bounds
  const constrainCropRect = (rect: { x: number; y: number; width: number; height: number }) => {
    const minX = imageObj.x;
    const minY = imageObj.y;
    const maxX = imageObj.x + imageObj.width;
    const maxY = imageObj.y + imageObj.height;

    let { x, y, width, height } = rect;

    // Ensure minimum size
    width = Math.max(MIN_CROP_SIZE / scaleX, width);
    height = Math.max(MIN_CROP_SIZE / scaleY, height);

    // Constrain to image bounds
    x = Math.max(minX, Math.min(maxX - width, x));
    y = Math.max(minY, Math.min(maxY - height, y));
    width = Math.min(width, maxX - x);
    height = Math.min(height, maxY - y);

    return { x, y, width, height };
  };

  // Handle drag for corner and edge handles
  const createHandleDragHandler = (
    corner: "tl" | "tr" | "bl" | "br" | "t" | "r" | "b" | "l"
  ) => {
    return (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = node.x();
      const newY = node.y();

      let newRect = { ...cropRect };

      switch (corner) {
        case "tl": // Top-left
          newRect.x = newX;
          newRect.y = newY;
          newRect.width = cropRect.x + cropRect.width - newX;
          newRect.height = cropRect.y + cropRect.height - newY;
          break;
        case "tr": // Top-right
          newRect.y = newY;
          newRect.width = newX - cropRect.x + HANDLE_SIZE;
          newRect.height = cropRect.y + cropRect.height - newY;
          break;
        case "bl": // Bottom-left
          newRect.x = newX;
          newRect.width = cropRect.x + cropRect.width - newX;
          newRect.height = newY - cropRect.y + HANDLE_SIZE;
          break;
        case "br": // Bottom-right
          newRect.width = newX - cropRect.x + HANDLE_SIZE;
          newRect.height = newY - cropRect.y + HANDLE_SIZE;
          break;
        case "t": // Top edge
          newRect.y = newY;
          newRect.height = cropRect.y + cropRect.height - newY;
          break;
        case "r": // Right edge
          newRect.width = newX - cropRect.x + HANDLE_SIZE;
          break;
        case "b": // Bottom edge
          newRect.height = newY - cropRect.y + HANDLE_SIZE;
          break;
        case "l": // Left edge
          newRect.x = newX;
          newRect.width = cropRect.x + cropRect.width - newX;
          break;
      }

      newRect = constrainCropRect(newRect);
      setCropRect(newRect);

      // Reset handle position (we use state for actual position)
      node.position({ x: 0, y: 0 });
    };
  };

  // Apply crop
  const handleApply = () => {
    const sourceCoords = getCropInSourceCoords();
    updateObject(imageObj.id, {
      cropX: sourceCoords.cropX,
      cropY: sourceCoords.cropY,
      cropWidth: sourceCoords.cropWidth,
      cropHeight: sourceCoords.cropHeight,
    } as Partial<Omit<ImageObject, "type">>);
    exitCropMode();
  };

  // Cancel crop
  const handleCancel = () => {
    exitCropMode();
  };

  // Darkened overlay regions (top, bottom, left, right strips)
  const renderOverlay = () => {
    const overlayColor = "rgba(0, 0, 0, 0.5)";

    return (
      <>
        {/* Top strip */}
        <Rect
          x={imageObj.x}
          y={imageObj.y}
          width={imageObj.width}
          height={cropRect.y - imageObj.y}
          fill={overlayColor}
          listening={false}
        />
        {/* Bottom strip */}
        <Rect
          x={imageObj.x}
          y={cropRect.y + cropRect.height}
          width={imageObj.width}
          height={imageObj.y + imageObj.height - (cropRect.y + cropRect.height)}
          fill={overlayColor}
          listening={false}
        />
        {/* Left strip */}
        <Rect
          x={imageObj.x}
          y={cropRect.y}
          width={cropRect.x - imageObj.x}
          height={cropRect.height}
          fill={overlayColor}
          listening={false}
        />
        {/* Right strip */}
        <Rect
          x={cropRect.x + cropRect.width}
          y={cropRect.y}
          width={imageObj.x + imageObj.width - (cropRect.x + cropRect.width)}
          height={cropRect.height}
          fill={overlayColor}
          listening={false}
        />
      </>
    );
  };

  // Render handles
  const renderHandles = () => {
    const halfHandle = HANDLE_SIZE / 2;
    const handles = [
      // Corners
      { corner: "tl" as const, x: cropRect.x - halfHandle, y: cropRect.y - halfHandle },
      { corner: "tr" as const, x: cropRect.x + cropRect.width - halfHandle, y: cropRect.y - halfHandle },
      { corner: "bl" as const, x: cropRect.x - halfHandle, y: cropRect.y + cropRect.height - halfHandle },
      { corner: "br" as const, x: cropRect.x + cropRect.width - halfHandle, y: cropRect.y + cropRect.height - halfHandle },
      // Edges
      { corner: "t" as const, x: cropRect.x + cropRect.width / 2 - halfHandle, y: cropRect.y - halfHandle },
      { corner: "r" as const, x: cropRect.x + cropRect.width - halfHandle, y: cropRect.y + cropRect.height / 2 - halfHandle },
      { corner: "b" as const, x: cropRect.x + cropRect.width / 2 - halfHandle, y: cropRect.y + cropRect.height - halfHandle },
      { corner: "l" as const, x: cropRect.x - halfHandle, y: cropRect.y + cropRect.height / 2 - halfHandle },
    ];

    return handles.map((handle) => (
      <Rect
        key={handle.corner}
        x={handle.x}
        y={handle.y}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#333333"
        strokeWidth={1}
        draggable
        onDragMove={createHandleDragHandler(handle.corner)}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            const cursors: Record<string, string> = {
              tl: "nwse-resize",
              tr: "nesw-resize",
              bl: "nesw-resize",
              br: "nwse-resize",
              t: "ns-resize",
              b: "ns-resize",
              l: "ew-resize",
              r: "ew-resize",
            };
            container.style.cursor = cursors[handle.corner];
          }
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "default";
        }}
      />
    ));
  };

  return (
    <>
      {/* Darkened overlay */}
      {renderOverlay()}

      {/* Crop border */}
      <Rect
        x={cropRect.x}
        y={cropRect.y}
        width={cropRect.width}
        height={cropRect.height}
        stroke="white"
        strokeWidth={2}
        fill="transparent"
        listening={false}
      />

      {/* Handles */}
      {renderHandles()}

      {/* Apply/Cancel buttons - rendered as Konva nodes positioned at bottom of crop */}
      <Group x={cropRect.x} y={cropRect.y + cropRect.height + 10}>
        {/* Apply button */}
        <Group
          x={0}
          y={0}
          onClick={handleApply}
          onTap={handleApply}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
          }}
        >
          <Rect
            x={0}
            y={0}
            width={60}
            height={24}
            fill="#3b82f6"
            cornerRadius={4}
          />
          <Rect
            x={0}
            y={0}
            width={60}
            height={24}
            fill="transparent"
            stroke="transparent"
          />
        </Group>

        {/* Cancel button */}
        <Group
          x={70}
          y={0}
          onClick={handleCancel}
          onTap={handleCancel}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
          }}
        >
          <Rect
            x={0}
            y={0}
            width={60}
            height={24}
            fill="#555555"
            cornerRadius={4}
          />
        </Group>
      </Group>
    </>
  );
}
