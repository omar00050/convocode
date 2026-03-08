"use client";

import { useEffect, useState, useRef } from "react";
import { Stage, Layer, Rect, Image, Group, Line } from "react-konva";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/stores/editor-store";
import CanvasImage from "@/components/canvas-objects/canvas-image";
import CanvasText from "@/components/canvas-objects/canvas-text";
import CanvasShape from "@/components/canvas-objects/canvas-shape";
import CanvasQRCode from "@/components/canvas-objects/canvas-qrcode";
import CanvasGroup from "@/components/canvas-objects/canvas-group";
import TextEditorOverlay from "@/components/canvas-objects/text-editor-overlay";
import TransformerWrapper from "@/components/canvas-objects/transformer-wrapper";
import SnapGuides from "@/components/editor/snap-guides";
import Guidelines from "@/components/editor/guidelines";
import CropOverlay from "@/components/editor/crop-overlay";
import type { ImageObject, TextObject, ShapeObject, QRCodeObject, GroupObject, AnyCanvasObject } from "@/types/editor";
import type Konva from "konva";

const PenToolOverlay = dynamic(() => import("./pen-tool-overlay"), { ssr: false });
const PenEditOverlay = dynamic(() => import("./pen-edit-overlay"), { ssr: false });

interface CanvasStageProps {
  containerWidth: number;
  containerHeight: number;
  onStageCreated?: (stage: Konva.Stage | null) => void;
}

export default function CanvasStage({
  containerWidth,
  containerHeight,
  onStageCreated,
}: CanvasStageProps) {
  const {
    canvasWidth,
    canvasHeight,
    zoom,
    backgroundColor,
    backgroundImage,
    showGrid,
    objects,
    cropMode,
    penToolActive,
    editingCustomShapeId,
    editingGroupId,
  } = useEditorStore();

  const isExporting = useEditorStore((state) => state.isExporting);

  const clearSelection = useEditorStore((state) => state.clearSelection);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);
  const updateObject = useEditorStore((state) => state.updateObject);
  const exitCropMode = useEditorStore((state) => state.exitCropMode);
  const addObject = useEditorStore((state) => state.addObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setPenToolActive = useEditorStore((state) => state.setPenToolActive);
  const setEditingCustomShapeId = useEditorStore((state) => state.setEditingCustomShapeId);
  const setEditingGroup = useEditorStore((state) => state.setEditingGroup);

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Text editing callbacks
  const handleStartEdit = (id: string) => {
    setEditingTextId(id);
  };

  const handleEndEdit = (id: string, content: string) => {
    updateObject(id, { content } as Partial<Omit<AnyCanvasObject, "type">>);
    setEditingTextId(null);
  };

  // Background image loading
  const [loadedBgImage, setLoadedBgImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!backgroundImage) {
      setLoadedBgImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => setLoadedBgImage(img);
    img.onerror = () => setLoadedBgImage(null);
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Pan state
  const isSpaceHeld = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  // Notify parent when stage is created
  useEffect(() => {
    if (onStageCreated) {
      onStageCreated(stageRef.current);
    }
  }, [onStageCreated]);

  // Space key listeners for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpaceHeld.current = true;
        setIsPanning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceHeld.current = false;
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Compute canvas centering offset
  const offsetX = (containerWidth - canvasWidth * zoom) / 2;
  const offsetY = (containerHeight - canvasHeight * zoom) / 2;

  // Handle wheel zoom (Ctrl+Scroll)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const evt = e.evt;
    if (evt.ctrlKey) {
      evt.preventDefault();

      const delta = evt.deltaY < 0 ? 0.05 : -0.05;
      const newZoom = Math.min(4, Math.max(0.25, zoom + delta));

      updateCanvas({ zoom: newZoom });
    }
  };

  // Pen tool complete callback
  const handlePenComplete = (shape: ShapeObject) => {
    addObject(shape as AnyCanvasObject);
    setSelection([shape.id]);
    setPenToolActive(false);
  };

  // Handle click on empty canvas
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (penToolActive) return; // pen tool handles its own clicks
    const target = e.target;
    // Clear selection only if clicked on Stage itself or background
    const clickedOnEmpty =
      target === e.currentTarget || target.name() === "background";

    // Exit crop mode if clicking outside (unless clicking on crop handles)
    if (cropMode.active && clickedOnEmpty) {
      exitCropMode();
      return;
    }

    // Exit group editing mode if clicking on empty canvas
    if (editingGroupId && clickedOnEmpty) {
      setEditingGroup(null);
      return;
    }

    if (clickedOnEmpty) {
      clearSelection();
    }
  };

  // Handle tap on empty canvas (touch devices)
  const handleTap = () => {
    clearSelection();
  };

  // Handle middle mouse button for pan
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1) {
      // Middle mouse button
      setIsPanning(true);
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 && !isSpaceHeld.current) {
      setIsPanning(false);
    }
  };

  // Generate grid lines
  const renderGrid = () => {
    if (!showGrid) return null;

    const lines: React.ReactNode[] = [];
    const gridSpacing = 50;

    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSpacing) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, canvasHeight]}
          stroke="#cccccc"
          opacity={0.3}
          strokeWidth={1}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSpacing) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, canvasWidth, y]}
          stroke="#cccccc"
          opacity={0.3}
          strokeWidth={1}
        />
      );
    }

    return <>{lines}</>;
  };

  // Find the text object being edited (if any)
  const editingTextObj = editingTextId
    ? (objects.find((o) => o.id === editingTextId) as TextObject | undefined)
    : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onWheel={handleWheel}
        onClick={handleClick}
        onTap={handleTap}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        draggable={isPanning}
        style={{
          cursor: isPanning ? "grab" : "default",
        }}
      >
        <Layer>
          <Group x={offsetX} y={offsetY} scaleX={zoom} scaleY={zoom}>
            {/* Background */}
            {loadedBgImage ? (
              <Image
                image={loadedBgImage}
                width={canvasWidth}
                height={canvasHeight}
                name="background"
              />
            ) : (
              <Rect
                width={canvasWidth}
                height={canvasHeight}
                fill={backgroundColor}
                name="background"
              />
            )}

            {/* Grid overlay */}
            {renderGrid()}

            {/* Canvas objects - single pass for correct z-ordering */}
            {objects.map((obj) => {
              if (obj.type === "image") {
                return <CanvasImage key={obj.id} obj={obj as ImageObject} />;
              }
              if (obj.type === "text") {
                return (
                  <CanvasText
                    key={obj.id}
                    obj={obj as TextObject}
                    isEditing={obj.id === editingTextId}
                    onStartEdit={handleStartEdit}
                  />
                );
              }
              if (obj.type === "shape") {
                return <CanvasShape key={obj.id} obj={obj as ShapeObject} />;
              }
              if (obj.type === "qrcode") {
                return <CanvasQRCode key={obj.id} obj={obj as QRCodeObject} />;
              }
              if (obj.type === "group") {
                return (
                  <CanvasGroup
                    key={obj.id}
                    obj={obj as GroupObject}
                    isEditing={editingGroupId === obj.id}
                  />
                );
              }
              return null;
            })}

            {/* Guide lines - rendered above objects, hidden during export */}
            {!isExporting && (
              <Guidelines
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                zoom={zoom}
              />
            )}

            {/* Snap guides - hidden during export */}
            {!isExporting && <SnapGuides canvasWidth={canvasWidth} canvasHeight={canvasHeight} />}

            {/* Transformer for selection handles - hidden during export */}
            {!isExporting && <TransformerWrapper />}

            {/* Crop overlay - rendered on top when crop mode is active */}
            {cropMode.active && (
              <CropOverlay canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
            )}
          </Group>
        </Layer>

        {/* Pen tool draw overlay */}
        {penToolActive && !editingCustomShapeId && (
          <PenToolOverlay
            stageRef={stageRef}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            offsetX={offsetX}
            offsetY={offsetY}
            zoom={zoom}
            onComplete={handlePenComplete}
            onCancel={() => setPenToolActive(false)}
          />
        )}

        {/* Pen edit overlay */}
        {editingCustomShapeId && (() => {
          const editShape = objects.find((o) => o.id === editingCustomShapeId) as ShapeObject | undefined;
          return editShape ? (
            <PenEditOverlay
              shape={editShape}
              stageRef={stageRef}
              onExit={() => setEditingCustomShapeId(null)}
            />
          ) : null;
        })()}
      </Stage>

      {/* Text editor overlay for inline editing */}
      {editingTextObj && (
        <TextEditorOverlay
          obj={editingTextObj}
          zoom={zoom}
          canvasOffset={{ x: offsetX, y: offsetY }}
          onEndEdit={handleEndEdit}
        />
      )}
    </div>
  );
}
