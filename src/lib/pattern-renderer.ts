/**
 * Pattern tile renderer for creating seamless repeating patterns.
 * Each pattern is drawn on an HTMLCanvasElement for use with Konva's fillPatternImage.
 */
import type { PatternType } from "@/types/pattern";

/**
 * Creates a pattern tile canvas for the given pattern configuration.
 * The tile is sized at Math.round(20 * scale) pixels.
 * @param patternType - The type of pattern to create
 * @param foregroundColor - Hex color for pattern elements (#RRGGBB)
 * @param backgroundColor - Hex color for background (#RRGGBB) or "transparent"
 * @param scale - Scale factor for tile size (0.5–3.0)
 * @returns HTMLCanvasElement with the pattern tile
 */
export function createPatternTile(
  patternType: PatternType,
  foregroundColor: string,
  backgroundColor: string,
  scale: number
): HTMLCanvasElement {
  const tileSize = Math.round(20 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext("2d")!;

  // Fill background if not transparent
  if (backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, tileSize, tileSize);
  }

  // Set foreground color
  ctx.fillStyle = foregroundColor;
  ctx.strokeStyle = foregroundColor;

  switch (patternType) {
    case "dots":
      drawDotsPattern(ctx, tileSize);
      break;
    case "horizontalLines":
      drawHorizontalLinesPattern(ctx, tileSize);
      break;
    case "verticalLines":
      drawVerticalLinesPattern(ctx, tileSize);
      break;
    case "diagonalLines":
      drawDiagonalLinesPattern(ctx, tileSize);
      break;
    case "diagonalLinesReverse":
      drawDiagonalLinesReversePattern(ctx, tileSize);
      break;
    case "crosshatch":
      drawCrosshatchPattern(ctx, tileSize);
      break;
    case "diagonalCrosshatch":
      drawDiagonalCrosshatchPattern(ctx, tileSize);
      break;
    case "grid":
      drawGridPattern(ctx, tileSize);
      break;
    case "chevron":
      drawChevronPattern(ctx, tileSize);
      break;
    case "waves":
      drawWavesPattern(ctx, tileSize);
      break;
  }

  return canvas;
}

/**
 * Dots pattern: filled circles at center and 4 corners for seamless tiling.
 */
function drawDotsPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const radius = tileSize * 0.2;
  ctx.beginPath();
  // Center dot
  ctx.arc(tileSize / 2, tileSize / 2, radius, 0, Math.PI * 2);
  ctx.fill();
  // Corner dots (for seamless tiling)
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.arc(tileSize, 0, radius, 0, Math.PI * 2);
  ctx.arc(0, tileSize, radius, 0, Math.PI * 2);
  ctx.arc(tileSize, tileSize, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Horizontal lines pattern.
 */
function drawHorizontalLinesPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const lineWidth = tileSize * 0.1;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Draw lines at 1/3 and 2/3 positions
  ctx.moveTo(0, tileSize / 3);
  ctx.lineTo(tileSize, tileSize / 3);
  ctx.moveTo(0, (2 * tileSize) / 3);
  ctx.lineTo(tileSize, (2 * tileSize) / 3);
  ctx.stroke();
}

/**
 * Vertical lines pattern.
 */
function drawVerticalLinesPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const lineWidth = tileSize * 0.1;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Draw lines at 1/3 and 2/3 positions
  ctx.moveTo(tileSize / 3, 0);
  ctx.lineTo(tileSize / 3, tileSize);
  ctx.moveTo((2 * tileSize) / 3, 0);
  ctx.lineTo((2 * tileSize) / 3, tileSize);
  ctx.stroke();
}

/**
 * Diagonal lines pattern (45 degrees).
 */
function drawDiagonalLinesPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const lineWidth = tileSize * 0.1;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Draw diagonal lines extending beyond tile for seamless edges
  ctx.moveTo(-tileSize, 0);
  ctx.lineTo(0, tileSize);
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(2 * tileSize, tileSize);
  ctx.stroke();
}

/**
 * Diagonal lines reverse pattern (135 degrees).
 */
function drawDiagonalLinesReversePattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const lineWidth = tileSize * 0.1;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Draw reverse diagonal lines
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(0, tileSize);
  ctx.moveTo(2 * tileSize, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(-tileSize, tileSize);
  ctx.stroke();
}

/**
 * Crosshatch pattern (horizontal + vertical lines).
 */
function drawCrosshatchPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  drawHorizontalLinesPattern(ctx, tileSize);
  drawVerticalLinesPattern(ctx, tileSize);
}

/**
 * Diagonal crosshatch pattern (both diagonal directions).
 */
function drawDiagonalCrosshatchPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const lineWidth = tileSize * 0.08;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Diagonal lines (45°)
  ctx.moveTo(-tileSize, 0);
  ctx.lineTo(0, tileSize);
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(2 * tileSize, tileSize);
  // Reverse diagonal lines (135°)
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(0, tileSize);
  ctx.moveTo(2 * tileSize, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(-tileSize, tileSize);
  ctx.stroke();
}

/**
 * Grid pattern: single lines at x=0 and y=0.
 */
function drawGridPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, tileSize);
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize, 0);
  ctx.stroke();
}

/**
 * Chevron pattern: V-shapes that tile seamlessly.
 */
function drawChevronPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  ctx.lineWidth = tileSize * 0.1;
  ctx.beginPath();
  // Top chevron
  ctx.moveTo(0, 0);
  ctx.lineTo(tileSize / 2, tileSize / 2);
  ctx.lineTo(tileSize, 0);
  // Bottom chevron (mirrored)
  ctx.moveTo(0, tileSize);
  ctx.lineTo(tileSize / 2, tileSize / 2);
  ctx.lineTo(tileSize, tileSize);
  ctx.stroke();
}

/**
 * Waves pattern: sine curve across the tile.
 */
function drawWavesPattern(ctx: CanvasRenderingContext2D, tileSize: number): void {
  ctx.lineWidth = tileSize * 0.1;
  ctx.beginPath();
  const amplitude = tileSize / 4;
  const centerY = tileSize / 2;

  // Draw sine wave
  for (let x = 0; x <= tileSize; x++) {
    const y = centerY + Math.sin((x / tileSize) * Math.PI * 2) * amplitude;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}
