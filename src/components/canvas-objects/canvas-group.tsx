"use client";

import { memo } from "react";
import { Group, Rect } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import type { GroupObject, AnyCanvasObject, ImageObject, TextObject, ShapeObject, QRCodeObject } from "@/types/editor";
import type Konva from "konva";

// Lazy imports resolved at runtime to avoid circular deps
import dynamic from "next/dynamic";

const CanvasImage = dynamic(() => import("./canvas-image"), { ssr: false });
const CanvasText = dynamic(() => import("./canvas-text"), { ssr: false });
const CanvasShape = dynamic(() => import("./canvas-shape"), { ssr: false });
const CanvasQRCode = dynamic(() => import("./canvas-qrcode"), { ssr: false });

interface CanvasGroupProps {
  obj: GroupObject;
  isEditing: boolean;
}

function renderChild(child: AnyCanvasObject, isEditing: boolean) {
  switch (child.type) {
    case "image":
      return <CanvasImage key={child.id} obj={child as ImageObject} />;
    case "text":
      return <CanvasText key={child.id} obj={child as TextObject} isEditing={false} onStartEdit={() => {}} />;
    case "shape":
      return <CanvasShape key={child.id} obj={child as ShapeObject} />;
    case "qrcode":
      return <CanvasQRCode key={child.id} obj={child as QRCodeObject} />;
    case "group":
      return <CanvasGroupInner key={child.id} obj={child as GroupObject} isEditing={false} />;
    default:
      return null;
  }
}

function CanvasGroupInner({ obj, isEditing }: CanvasGroupProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);
  const setEditingGroup = useEditorStore((state) => state.setEditingGroup);
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const objects = useEditorStore((state) => state.objects);
  const setActiveGuides = useEditorStore((state) => state.setActiveGuides);
  const clearGuides = useEditorStore((state) => state.clearGuides);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);

  if (!obj.visible) return null;

  const shadowOpacity =
    obj.shadowColor.length >= 9
      ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
      : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isEditing) return;
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      toggleSelection(obj.id);
    } else {
      setSelection([obj.id]);
    }
  };

  const handleDoubleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setEditingGroup(obj.id);
    setSelection([]);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (obj.locked) return;
    const node = e.target;
    // Simple snap-free drag move update
    updateObject(obj.id, { x: node.x(), y: node.y() }, true);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (obj.locked) return;
    clearGuides();
    const node = e.target;
    updateObject(obj.id, { x: node.x(), y: node.y() });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(10, obj.width * scaleX),
      height: Math.max(10, obj.height * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group
      id={obj.id}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      opacity={obj.opacity}
      draggable={!obj.locked && !isEditing}
      onClick={handleClick}
      onTap={() => !isEditing && setSelection([obj.id])}
      onDblClick={handleDoubleClick}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      shadowEnabled={obj.shadowEnabled}
      shadowColor={shadowColorHex}
      shadowBlur={obj.shadowBlur}
      shadowOffsetX={obj.shadowOffsetX}
      shadowOffsetY={obj.shadowOffsetY}
      shadowOpacity={shadowOpacity}
      globalCompositeOperation={obj.blendMode !== "source-over" ? (obj.blendMode as GlobalCompositeOperation) : undefined}
    >
      {/* Dashed border in editing mode */}
      {isEditing && (
        <Rect
          x={0}
          y={0}
          width={obj.width}
          height={obj.height}
          stroke="#60a5fa"
          strokeWidth={1}
          dash={[6, 3]}
          listening={false}
          fill="rgba(96,165,250,0.04)"
        />
      )}

      {/* Render children */}
      {obj.children.map((child) => renderChild(child, isEditing))}
    </Group>
  );
}

const CanvasGroup = memo(CanvasGroupInner);
export default CanvasGroup;
