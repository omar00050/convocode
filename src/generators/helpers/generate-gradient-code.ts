import type { GradientDef } from "@/types/gradient";

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generates code for creating a linear gradient on a Canvas 2D context.
 * Uses the perpendicular projection formula to compute gradient endpoints.
 */
export function generateLinearGradientCode(
  gradient: GradientDef,
  bbox: BBox,
  varName: string
): string {
  const { x, y, width: W, height: H } = bbox;
  const angleRad = (gradient.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const cx = x + W / 2;
  const cy = y + H / 2;
  const halfExtent = Math.abs(cosA) * (W / 2) + Math.abs(sinA) * (H / 2);
  const x0 = cx - cosA * halfExtent;
  const y0 = cy - sinA * halfExtent;
  const x1 = cx + cosA * halfExtent;
  const y1 = cy + sinA * halfExtent;

  const lines: string[] = [
    `  const ${varName} = ctx.createLinearGradient(${x0.toFixed(4)}, ${y0.toFixed(4)}, ${x1.toFixed(4)}, ${y1.toFixed(4)});`,
    ...gradient.stops.map(
      (s) => `  ${varName}.addColorStop(${s.position}, "${s.color}");`
    ),
  ];
  return lines.join("\n");
}

/**
 * Generates code for creating a radial gradient on a Canvas 2D context.
 */
export function generateRadialGradientCode(
  gradient: GradientDef,
  bbox: BBox,
  varName: string
): string {
  const { x, y, width: W, height: H } = bbox;
  const cx = x + W * gradient.centerX;
  const cy = y + H * gradient.centerY;
  const r = Math.min(W, H) * gradient.radius;

  const lines: string[] = [
    `  const ${varName} = ctx.createRadialGradient(${cx.toFixed(4)}, ${cy.toFixed(4)}, 0, ${cx.toFixed(4)}, ${cy.toFixed(4)}, ${r.toFixed(4)});`,
    ...gradient.stops.map(
      (s) => `  ${varName}.addColorStop(${s.position}, "${s.color}");`
    ),
  ];
  return lines.join("\n");
}

/**
 * Generates code for creating a gradient and setting it as fillStyle.
 */
export function generateGradientFillCode(
  gradient: GradientDef,
  bbox: BBox,
  varName: string
): string {
  const gradCode =
    gradient.type === "linear"
      ? generateLinearGradientCode(gradient, bbox, varName)
      : generateRadialGradientCode(gradient, bbox, varName);
  return `${gradCode}\n  ctx.fillStyle = ${varName};`;
}
