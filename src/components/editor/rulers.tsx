"use client";

import { useEffect, useRef, useCallback } from "react";

interface RulersProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  containerWidth: number;
  containerHeight: number;
  mousePosition: { x: number; y: number } | null;
  onCreateGuide: (orientation: "horizontal" | "vertical", position: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const RULER_SIZE = 24;

function drawRuler(
  canvas: HTMLCanvasElement,
  options: {
    isHorizontal: boolean;
    zoom: number;
    offset: number;       // offsetX for H, offsetY for V
    containerSize: number; // containerWidth for H, containerHeight for V
    canvasSize: number;   // canvasWidth for H, canvasHeight for V
    mousePos: number | null; // canvas-space X for H, Y for V
    size: number;         // width for H, height for V
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { isHorizontal, zoom, offset, containerSize, canvasSize, mousePos, size } = options;
  const dpr = window.devicePixelRatio || 1;

  const w = isHorizontal ? size : RULER_SIZE;
  const h = isHorizontal ? RULER_SIZE : size;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, w, h);

  // Tick spacing
  const minPixelsBetweenLabels = 60;
  const majorInterval = Math.pow(10, Math.ceil(Math.log10(minPixelsBetweenLabels / zoom)));
  const minorInterval = majorInterval / 10;

  // Visible canvas range
  const startCanvas = -offset / zoom;
  const endCanvas = (containerSize - offset) / zoom;

  // Draw ticks
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px monospace";

  // Round start to nearest minorInterval
  const startTick = Math.floor(startCanvas / minorInterval) * minorInterval;

  for (let pos = startTick; pos <= endCanvas; pos += minorInterval) {
    const screenPos = pos * zoom + offset;
    if (screenPos < 0 || screenPos > containerSize) continue;

    const isMajor = Math.abs(Math.round(pos / majorInterval) * majorInterval - pos) < 0.01;
    const tickLength = isMajor ? 12 : 6;
    const color = isMajor ? "#888888" : "#555555";

    ctx.strokeStyle = color;
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(screenPos, RULER_SIZE - tickLength);
      ctx.lineTo(screenPos, RULER_SIZE);
    } else {
      ctx.moveTo(RULER_SIZE - tickLength, screenPos);
      ctx.lineTo(RULER_SIZE, screenPos);
    }
    ctx.stroke();

    // Labels on major ticks
    if (isMajor) {
      const label = String(Math.round(pos));
      ctx.fillStyle = "#aaaaaa";
      if (isHorizontal) {
        ctx.fillText(label, screenPos + 2, RULER_SIZE - 2);
      } else {
        ctx.save();
        ctx.translate(RULER_SIZE - 2, screenPos - 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }

  // Cursor marker
  if (mousePos !== null) {
    const screenMousePos = mousePos * zoom + offset;
    if (screenMousePos >= 0 && screenMousePos <= containerSize) {
      ctx.strokeStyle = "#FF6B35";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(screenMousePos, 0);
        ctx.lineTo(screenMousePos, RULER_SIZE);
      } else {
        ctx.moveTo(0, screenMousePos);
        ctx.lineTo(RULER_SIZE, screenMousePos);
      }
      ctx.stroke();
    }
  }
}

export default function Rulers({
  canvasWidth,
  canvasHeight,
  zoom,
  offsetX,
  offsetY,
  containerWidth,
  containerHeight,
  mousePosition,
  onCreateGuide,
  containerRef,
}: RulersProps) {
  const hRulerRef = useRef<HTMLCanvasElement>(null);
  const vRulerRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    orientation: "horizontal" | "vertical";
  } | null>(null);

  const redraw = useCallback(() => {
    if (hRulerRef.current) {
      drawRuler(hRulerRef.current, {
        isHorizontal: true,
        zoom,
        offset: offsetX,
        containerSize: containerWidth,
        canvasSize: canvasWidth,
        mousePos: mousePosition?.x ?? null,
        size: containerWidth,
      });
    }
    if (vRulerRef.current) {
      drawRuler(vRulerRef.current, {
        isHorizontal: false,
        zoom,
        offset: offsetY,
        containerSize: containerHeight,
        canvasSize: canvasHeight,
        mousePos: mousePosition?.y ?? null,
        size: containerHeight,
      });
    }
  }, [zoom, offsetX, offsetY, containerWidth, containerHeight, canvasWidth, canvasHeight, mousePosition]);

  useEffect(() => {
    const raf = requestAnimationFrame(redraw);
    return () => cancelAnimationFrame(raf);
  }, [redraw]);

  const handleHRulerMouseDown = (e: React.MouseEvent) => {
    dragStateRef.current = { dragging: true, orientation: "horizontal" };
    const container = containerRef.current;

    const handleMouseMove = () => {};
    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!dragStateRef.current || !container) return;
      const canvasY = (upEvent.clientY - container.getBoundingClientRect().top - offsetY) / zoom;
      if (canvasY >= 0 && canvasY <= canvasHeight) {
        onCreateGuide("horizontal", Math.round(canvasY));
      }
      dragStateRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleVRulerMouseDown = (e: React.MouseEvent) => {
    dragStateRef.current = { dragging: true, orientation: "vertical" };
    const container = containerRef.current;

    const handleMouseMove = () => {};
    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!dragStateRef.current || !container) return;
      const canvasX = (upEvent.clientX - container.getBoundingClientRect().left - offsetX) / zoom;
      if (canvasX >= 0 && canvasX <= canvasWidth) {
        onCreateGuide("vertical", Math.round(canvasX));
      }
      dragStateRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      {/* Corner square */}
      <div
        className="absolute top-0 left-0 z-10 flex items-center justify-center text-[8px] text-gray-500 bg-[#1e1e1e] border-r border-b border-[#333]"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      >
        px
      </div>

      {/* Horizontal ruler */}
      <div
        className="absolute top-0 left-6 right-0 z-10 overflow-hidden cursor-ns-resize"
        style={{ height: RULER_SIZE }}
        onMouseDown={handleHRulerMouseDown}
      >
        <canvas ref={hRulerRef} />
      </div>

      {/* Vertical ruler */}
      <div
        className="absolute top-6 left-0 bottom-0 z-10 overflow-hidden cursor-ew-resize"
        style={{ width: RULER_SIZE }}
        onMouseDown={handleVRulerMouseDown}
      >
        <canvas ref={vRulerRef} />
      </div>
    </>
  );
}
