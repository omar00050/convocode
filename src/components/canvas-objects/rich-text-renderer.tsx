"use client";

import { memo, useMemo } from "react";
import { Shape } from "react-konva";
import type { TextObject } from "@/types/editor";
import type { RichTextSegment } from "@/types/rich-text";
import { wrapRichTextForCanvas } from "@/lib/rich-text-wrap";
import { resolveDirection } from "@/lib/font-utils";
import type Konva from "konva";

interface RichTextRendererProps {
  obj: TextObject;
  globalFont: string | null;
  isEditing?: boolean;
  draggable?: boolean;
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap?: (e: Konva.KonvaEventObject<Event>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
  onDblClick?: () => void;
  onDblTap?: () => void;
}

/**
 * Renders rich text (multi-style text) using a Konva Shape with custom sceneFunc.
 * Handles per-chunk font, color, size, decorations, alignment, wrapping, and RTL.
 */
function RichTextRendererInner({
  obj,
  globalFont,
  isEditing = false,
  draggable = false,
  onClick,
  onTap,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onDblClick,
  onDblTap,
}: RichTextRendererProps) {
  // Resolve direction for RTL support
  const resolvedDirection = useMemo(() => resolveDirection(obj), [obj]);

  // Get rich content - should always exist when this component is rendered
  const richContent = obj.richContent as RichTextSegment[];

  // Wrap text into lines with measured chunks
  const wrappedLines = useMemo(() => {
    if (!richContent || richContent.length === 0) return [];
    return wrapRichTextForCanvas(richContent, obj, globalFont);
  }, [richContent, obj, globalFont]);

  // Scene function for Konva Shape - draws the rich text
  const sceneFunc = (context: Konva.Context, shape: Konva.Shape) => {
    const ctx = context as unknown as CanvasRenderingContext2D;

    if (!wrappedLines.length) return;

    // Apply direction for RTL support
    if (resolvedDirection === "rtl") {
      ctx.direction = "rtl";
    }

    let y = 0;

    for (const line of wrappedLines) {
      if (line.chunks.length === 0) {
        // Empty line - just advance by line height
        y += line.lineHeight;
        continue;
      }

      // Calculate drawX based on textAlign
      let drawX = 0;
      if (obj.textAlign === "center") {
        drawX = (obj.width - line.lineWidth) / 2;
      } else if (obj.textAlign === "right") {
        drawX = obj.width - line.lineWidth;
      }
      // For left alignment, drawX = 0

      // Draw each chunk in the line
      for (const chunk of line.chunks) {
        // Build font shorthand: "[fontStyle] [fontWeight] fontSize fontFamily"
        const fontParts: string[] = [];
        if (chunk.resolvedFontStyle === "italic") fontParts.push("italic");
        if (chunk.resolvedFontWeight === "bold") fontParts.push("bold");
        fontParts.push(`${chunk.resolvedFontSize}px`);
        fontParts.push(`"${chunk.resolvedFontFamily}"`);
        const fontShorthand = fontParts.join(" ");

        ctx.font = fontShorthand;

        // Set fill style - use gradient if fillType is gradient
        // Note: Gradient fill for text is handled at a higher level
        ctx.fillStyle = chunk.resolvedFill;
        ctx.textBaseline = "top";

        // Handle letter spacing
        if (chunk.resolvedLetterSpacing > 0) {
          // Character-by-character rendering for letterSpacing
          let charX = drawX;
          const chars = Array.from(chunk.text); // Emoji-safe
          for (const char of chars) {
            // Stroke before fill if enabled
            if (obj.strokeEnabled && obj.strokeWidth > 0) {
              ctx.strokeStyle = obj.strokeColor;
              ctx.lineWidth = obj.strokeWidth;
              ctx.lineJoin = "round";
              ctx.strokeText(char, charX, y);
            }
            ctx.fillText(char, charX, y);
            charX += ctx.measureText(char).width + chunk.resolvedLetterSpacing;
          }
        } else {
          // Simple fillText for chunk
          // Stroke before fill if enabled
          if (obj.strokeEnabled && obj.strokeWidth > 0) {
            ctx.strokeStyle = obj.strokeColor;
            ctx.lineWidth = obj.strokeWidth;
            ctx.lineJoin = "round";
            ctx.strokeText(chunk.text, drawX, y);
          }
          ctx.fillText(chunk.text, drawX, y);
        }

        // Draw text decorations per chunk
        const deco = chunk.resolvedTextDecoration;
        if (deco && deco !== "none") {
          // Calculate decoration thickness proportional to fontSize
          const decoThickness = Math.max(1, Math.round(chunk.resolvedFontSize / 20));

          if (deco.includes("underline")) {
            // Underline: just below character bottom
            const underlineY = y + chunk.resolvedFontSize + chunk.resolvedFontSize * 0.1;
            ctx.fillStyle = chunk.resolvedFill;
            ctx.fillRect(drawX, underlineY, chunk.measuredWidth, decoThickness);
          }

          if (deco.includes("line-through")) {
            // Line-through: at vertical center
            const strikeY = y + chunk.resolvedFontSize * 0.5;
            ctx.fillStyle = chunk.resolvedFill;
            ctx.fillRect(drawX, strikeY, chunk.measuredWidth, decoThickness);
          }
        }

        // Advance x position
        drawX += chunk.measuredWidth;
      }

      // Advance to next line
      y += line.lineHeight;
    }
  };

  // Hit test function - treat entire text bounds as clickable
  const hitFunc = (context: Konva.Context, shape: Konva.Shape) => {
    context.beginPath();
    context.rect(0, 0, obj.width, obj.height);
    context.closePath();
    context.fillStrokeShape(shape);
  };

  // Extract shadow opacity from 8-digit hex color
  const shadowOpacity = obj.shadowColor.length >= 9
    ? parseInt(obj.shadowColor.slice(7, 9), 16) / 255
    : 1;
  const shadowColorHex = obj.shadowColor.slice(0, 7);

  return (
    <Shape
      id={obj.id}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      opacity={obj.opacity}
      visible={obj.visible && !isEditing}
      draggable={draggable}
      sceneFunc={sceneFunc}
      hitFunc={hitFunc}
      onClick={onClick}
      onTap={onTap}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onDblClick={onDblClick}
      onDblTap={onDblTap}
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

// Memoize to prevent re-renders
export default memo(RichTextRendererInner);
