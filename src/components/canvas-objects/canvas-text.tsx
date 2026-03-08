"use client";

import { memo, useMemo } from "react";
import { Text, Shape } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { getEffectiveFont, resolveDirection } from "@/lib/font-utils";
import { calculateSnapGuides } from "@/lib/snap";
import { isPlainRichText, resolveSegmentStyle } from "@/types/rich-text";
import { splitTextPreservingEmoji } from "@/lib/emoji-utils";
import { computeTextPathPositions } from "@/lib/text-path-math";
import RichTextRenderer from "./rich-text-renderer";
import type { TextObject } from "@/types/editor";
import type Konva from "konva";

interface CanvasTextProps {
  obj: TextObject;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
}

function CanvasTextInner({ obj, isEditing, onStartEdit }: CanvasTextProps) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);
  const globalFont = useEditorStore((state) => state.globalFont);

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

  // Resolve effective font from cascade
  const fontFamily = getEffectiveFont(obj, { globalFont });

  // Resolve direction and compute effective alignment
  const resolvedDirection = resolveDirection(obj);
  // If RTL and using default left alignment, switch to right
  const effectiveAlign = resolvedDirection === "rtl" && obj.textAlign === "left"
    ? "right"
    : obj.textAlign;

  // Construct fontStyle string combining fontWeight and fontStyle
  // Konva accepts "normal", "bold", "italic", "bold italic"
  let fontStyleStr = "";
  if (obj.fontWeight === "bold" && obj.fontStyle === "italic") {
    fontStyleStr = "bold italic";
  } else if (obj.fontWeight === "bold") {
    fontStyleStr = "bold";
  } else if (obj.fontStyle === "italic") {
    fontStyleStr = "italic";
  } else {
    fontStyleStr = "normal";
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

    // Compute new fontSize from scaleY (proportional scaling)
    const newFontSize = Math.max(1, obj.fontSize * Math.abs(node.scaleY()));
    const newWidth = node.width() * Math.abs(node.scaleX());

    // Reset scale to 1 to prevent blurry/stretched rendering
    node.scaleX(1);
    node.scaleY(1);

    updateObject(obj.id, {
      x: node.x(),
      y: node.y(),
      fontSize: newFontSize,
      width: newWidth,
      rotation: node.rotation(),
    } as Partial<Omit<TextObject, "type">>);
  };

  const handleDblClick = () => {
    if (!obj.locked) {
      onStartEdit(obj.id);
    }
  };

  // Extract shadow opacity from 8-digit hex color
  const shadowOpacity = obj.shadowColor.length >= 9
    ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
    : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

  // Use curved text renderer when textPathType is set
  const isCurved = obj.textPathType && obj.textPathType !== "none";

  // Build curved text scene function (memoized)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const curvedSceneFunc = useMemo(() => {
    if (!isCurved) return null;

    return (context: Konva.Context) => {
      const ctx = context as unknown as CanvasRenderingContext2D;
      const chars = splitTextPreservingEmoji(obj.content);
      if (chars.length === 0) return;

      // Build font shorthand
      const fontParts: string[] = [];
      if (obj.fontStyle === "italic") fontParts.push("italic");
      if (obj.fontWeight === "bold") fontParts.push("bold");
      fontParts.push(`${obj.fontSize}px`);
      fontParts.push(`"${fontFamily}"`);
      ctx.font = fontParts.join(" ");
      ctx.textBaseline = "middle";

      // Measure each character width with its font
      const isRichTextCurved = obj.richContent && !isPlainRichText(obj.richContent);
      const widths: number[] = chars.map((char, idx) => {
        if (isRichTextCurved && obj.richContent) {
          // Find which segment this character belongs to
          let charCount = 0;
          for (const seg of obj.richContent) {
            const segChars = splitTextPreservingEmoji(seg.text);
            if (idx < charCount + segChars.length) {
              const resolved = resolveSegmentStyle(seg, obj, globalFont);
              const segFont: string[] = [];
              if (resolved.fontStyle === "italic") segFont.push("italic");
              if (resolved.fontWeight === "bold") segFont.push("bold");
              segFont.push(`${resolved.fontSize}px`);
              segFont.push(`"${resolved.fontFamily}"`);
              ctx.font = segFont.join(" ");
              break;
            }
            charCount += segChars.length;
          }
        }
        return ctx.measureText(char).width;
      });

      // Reset font to parent
      ctx.font = fontParts.join(" ");

      const positions = computeTextPathPositions({
        textPathType: obj.textPathType!,
        chars,
        widths,
        letterSpacing: obj.letterSpacing,
        radius: obj.textPathRadius ?? 300,
        direction: obj.textPathDirection ?? "up",
        startAngle: obj.textPathStartAngle ?? 0,
        clockwise: obj.textPathClockwise ?? true,
        amplitude: obj.textPathAmplitude ?? 30,
        wavelength: obj.textPathWavelength ?? 200,
        phase: obj.textPathPhase ?? 0,
      });

      // Determine cumulative char index for rich text segment lookup
      let cumIdx = 0;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const pos = positions[i];
        if (!pos) continue;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rotation);

        // Determine fill for this character (rich text per-segment)
        let fill = obj.fill;
        if (isRichTextCurved && obj.richContent) {
          let charCount = 0;
          for (const seg of obj.richContent) {
            const segChars = splitTextPreservingEmoji(seg.text);
            if (cumIdx < charCount + segChars.length) {
              const resolved = resolveSegmentStyle(seg, obj, globalFont);
              fill = resolved.fill;
              // Set per-segment font
              const segFont: string[] = [];
              if (resolved.fontStyle === "italic") segFont.push("italic");
              if (resolved.fontWeight === "bold") segFont.push("bold");
              segFont.push(`${resolved.fontSize}px`);
              segFont.push(`"${resolved.fontFamily}"`);
              ctx.font = segFont.join(" ");
              break;
            }
            charCount += segChars.length;
          }
        } else {
          ctx.font = fontParts.join(" ");
        }

        ctx.fillStyle = fill;
        ctx.textBaseline = "middle";

        if (obj.strokeEnabled && obj.strokeWidth > 0) {
          ctx.strokeStyle = obj.strokeColor;
          ctx.lineWidth = obj.strokeWidth;
          ctx.lineJoin = "round";
          ctx.strokeText(char, 0, 0);
        }
        ctx.fillText(char, 0, 0);
        ctx.restore();
        cumIdx++;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj, fontFamily, globalFont, isCurved]);

  if (isCurved && curvedSceneFunc) {
    const hitFunc = (context: Konva.Context, shape: Konva.Shape) => {
      context.beginPath();
      context.rect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
      context.closePath();
      context.fillStrokeShape(shape);
    };
    return (
      <Shape
        id={obj.id}
        x={obj.x + obj.width / 2}
        y={obj.y + obj.height / 2}
        width={obj.width}
        height={obj.height}
        rotation={obj.rotation}
        opacity={obj.opacity}
        visible={obj.visible && !isEditing}
        draggable={!obj.locked}
        sceneFunc={curvedSceneFunc}
        hitFunc={hitFunc}
        onClick={handleClick}
        onTap={handleTap}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        {...(obj.shadowEnabled && {
          shadowColor: shadowColorHex,
          shadowBlur: obj.shadowBlur,
          shadowOffset: { x: obj.shadowOffsetX, y: obj.shadowOffsetY },
          shadowOpacity,
          shadowForStrokeEnabled: false,
        })}
        {...(obj.blendMode !== "source-over" && {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          globalCompositeOperation: obj.blendMode as any,
        })}
      />
    );
  }

  // Use RichTextRenderer for non-plain rich text
  const isRichText = obj.richContent != null && !isPlainRichText(obj.richContent);
  if (isRichText) {
    return (
      <RichTextRenderer
        obj={obj}
        globalFont={globalFont}
        isEditing={isEditing}
        draggable={!obj.locked}
        onClick={handleClick}
        onTap={handleTap}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
      />
    );
  }

  return (
    <Text
      id={obj.id}
      text={obj.content}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      fontSize={obj.fontSize}
      fontFamily={fontFamily}
      fontStyle={fontStyleStr}
      textDecoration={obj.textDecoration}
      fill={obj.fill}
      stroke={obj.strokeEnabled ? obj.strokeColor : undefined}
      strokeWidth={obj.strokeEnabled ? obj.strokeWidth : 0}
      align={effectiveAlign}
      letterSpacing={obj.letterSpacing}
      lineHeight={obj.lineHeight}
      rotation={obj.rotation}
      opacity={obj.opacity}
      draggable={!obj.locked}
      visible={obj.visible && !isEditing}
      onClick={handleClick}
      onTap={handleTap}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      // Shadow props
      {...(obj.shadowEnabled && {
        shadowColor: shadowColorHex,
        shadowBlur: obj.shadowBlur,
        shadowOffset: { x: obj.shadowOffsetX, y: obj.shadowOffsetY },
        shadowOpacity,
        shadowForStrokeEnabled: false,
      })}
      // Blend mode
      {...(obj.blendMode !== "source-over" && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation: obj.blendMode as any,
      })}
    />
  );
}

// Memoize to prevent re-renders when other objects change
export default memo(CanvasTextInner);
