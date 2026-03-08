import type { MaskType } from "@/types/editor";

/**
 * Mask path functions for Konva clipping, Canvas 2D codegen, and SVG generation.
 * All shapes are inscribed in the bounding box [0, 0, width, height].
 */

/**
 * Draws a circle/ellipse mask path.
 */
function circleMaskPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

/**
 * Draws a rounded rectangle mask path.
 */
function roundedRectMaskPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number
): void {
  // Check if roundRect is available (modern browsers)
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, width, height, radius);
  } else {
    // Fallback for browsers without roundRect support
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.arcTo(width, 0, width, r, r);
    ctx.lineTo(width, height - r);
    ctx.arcTo(width, height, width - r, height, r);
    ctx.lineTo(r, height);
    ctx.arcTo(0, height, 0, height - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
  }
}

/**
 * Draws a 5-pointed star mask path.
 */
function starMaskPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const points = 5;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/**
 * Draws a heart mask path using bezier curves.
 */
function heartMaskPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const w = width;
  const h = height;

  // Heart shape parameters
  const topY = h * 0.3;
  const bottomY = h * 0.9;
  const ctrlY = h * 0.1;

  ctx.moveTo(w / 2, topY);

  // Right lobe
  ctx.bezierCurveTo(w * 0.8, ctrlY, w, h * 0.4, w / 2, bottomY);

  // Left lobe (mirror)
  ctx.bezierCurveTo(0, h * 0.4, w * 0.2, ctrlY, w / 2, topY);

  ctx.closePath();
}

/**
 * Draws a hexagon mask path.
 */
function hexagonMaskPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2;
  const sides = 6;

  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/**
 * Draws a diamond mask path.
 */
function diamondMaskPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const halfW = width / 2;
  const halfH = height / 2;

  ctx.moveTo(halfW, 0); // Top
  ctx.lineTo(width, halfH); // Right
  ctx.lineTo(halfW, height); // Bottom
  ctx.lineTo(0, halfH); // Left
  ctx.closePath();
}

/**
 * Returns a Konva clipFunc for the specified mask type.
 * The clip function draws in the Group's local coordinate space (0,0 to width,height).
 *
 * @param maskType - The mask shape type
 * @param width - Width of the bounding box
 * @param height - Height of the bounding box
 * @param maskRadius - Corner radius for roundedRect mask
 * @returns A function to be used as Konva Group's clipFunc, or undefined for "none"
 */
export function getKonvaClipFunc(
  maskType: MaskType,
  width: number,
  height: number,
  maskRadius: number
): ((ctx: CanvasRenderingContext2D) => void) | undefined {
  if (maskType === "none") {
    return undefined;
  }

  return (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    drawMaskPath(ctx, maskType, 0, 0, width, height, maskRadius);
    ctx.clip();
  };
}

/**
 * Draws a mask path on a Canvas 2D context at the specified position.
 *
 * @param ctx - The canvas 2D context
 * @param maskType - The mask shape type
 * @param x - X position of the bounding box
 * @param y - Y position of the bounding box
 * @param width - Width of the bounding box
 * @param height - Height of the bounding box
 * @param maskRadius - Corner radius for roundedRect mask
 */
export function drawMaskPath(
  ctx: CanvasRenderingContext2D,
  maskType: MaskType,
  x: number,
  y: number,
  width: number,
  height: number,
  maskRadius: number
): void {
  // Save current transform, translate to position, draw, restore
  ctx.save();
  ctx.translate(x, y);

  switch (maskType) {
    case "circle":
      circleMaskPath(ctx, width, height);
      break;
    case "roundedRect":
      roundedRectMaskPath(ctx, width, height, maskRadius);
      break;
    case "star":
      starMaskPath(ctx, width, height);
      break;
    case "heart":
      heartMaskPath(ctx, width, height);
      break;
    case "hexagon":
      hexagonMaskPath(ctx, width, height);
      break;
    case "diamond":
      diamondMaskPath(ctx, width, height);
      break;
    case "none":
    default:
      // No mask - draw full rect
      ctx.rect(0, 0, width, height);
      break;
  }

  ctx.restore();
}

/**
 * Returns an SVG path string for the specified mask type.
 * The path is relative to origin (0,0) within a width×height bounding box.
 *
 * @param maskType - The mask shape type
 * @param width - Width of the bounding box
 * @param height - Height of the bounding box
 * @param maskRadius - Corner radius for roundedRect mask
 * @returns SVG path d attribute value
 */
export function getMaskSvgPath(
  maskType: MaskType,
  width: number,
  height: number,
  maskRadius: number
): string {
  switch (maskType) {
    case "circle": {
      const cx = width / 2;
      const cy = height / 2;
      const rx = width / 2;
      const ry = height / 2;
      return `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy}`;
    }

    case "roundedRect": {
      const r = Math.min(maskRadius, width / 2, height / 2);
      return `M ${r},0 L ${width - r},0 Q ${width},0 ${width},${r} L ${width},${height - r} Q ${width},${height} ${width - r},${height} L ${r},${height} Q 0,${height} 0,${height - r} L 0,${r} Q 0,0 ${r},0 Z`;
    }

    case "star": {
      const cx = width / 2;
      const cy = height / 2;
      const outerRadius = Math.min(width, height) / 2;
      const innerRadius = outerRadius * 0.4;
      const points = 5;
      const pathParts: string[] = [];

      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (i === 0) {
          pathParts.push(`M ${x.toFixed(2)},${y.toFixed(2)}`);
        } else {
          pathParts.push(`L ${x.toFixed(2)},${y.toFixed(2)}`);
        }
      }
      pathParts.push("Z");
      return pathParts.join(" ");
    }

    case "heart": {
      const topY = height * 0.3;
      const bottomY = height * 0.9;
      const ctrlY = height * 0.1;
      return `M ${width / 2},${topY} C ${width * 0.8},${ctrlY} ${width},${height * 0.4} ${width / 2},${bottomY} C 0,${height * 0.4} ${width * 0.2},${ctrlY} ${width / 2},${topY} Z`;
    }

    case "hexagon": {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 2;
      const pathParts: string[] = [];

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (i === 0) {
          pathParts.push(`M ${x.toFixed(2)},${y.toFixed(2)}`);
        } else {
          pathParts.push(`L ${x.toFixed(2)},${y.toFixed(2)}`);
        }
      }
      pathParts.push("Z");
      return pathParts.join(" ");
    }

    case "diamond": {
      const halfW = width / 2;
      const halfH = height / 2;
      return `M ${halfW},0 L ${width},${halfH} L ${halfW},${height} L 0,${halfH} Z`;
    }

    case "none":
    default:
      return `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`;
  }
}
