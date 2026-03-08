/**
 * Shadow code generation helpers for Canvas 2D and SVG output.
 */

/**
 * Converts an 8-digit hex color (#RRGGBBAA) to rgba() format.
 */
function hexToRgba(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Extracts the alpha value from an 8-digit hex color.
 */
function extractAlpha(hex: string): number {
  if (hex.length >= 9) {
    return parseInt(hex.slice(7, 9), 16) / 255;
  }
  return 1;
}

/**
 * Extracts the 6-digit hex color from an 8-digit hex color.
 */
function extractHex(hex: string): string {
  return hex.slice(0, 7);
}

/**
 * Generates Canvas 2D shadow setup code.
 * @param shadowColor - 8-digit hex color (#RRGGBBAA)
 * @param shadowBlur - Blur radius in pixels
 * @param shadowOffsetX - X offset in pixels
 * @param shadowOffsetY - Y offset in pixels
 * @returns Code string for shadow setup
 */
export function generateShadowSetupCode(
  shadowColor: string,
  shadowBlur: number,
  shadowOffsetX: number,
  shadowOffsetY: number
): string {
  const rgba = hexToRgba(shadowColor);
  return `ctx.shadowColor = "${rgba}";
ctx.shadowBlur = ${shadowBlur};
ctx.shadowOffsetX = ${shadowOffsetX};
ctx.shadowOffsetY = ${shadowOffsetY};`;
}

/**
 * Generates Canvas 2D shadow reset code.
 * @returns Code string for shadow reset
 */
export function generateShadowResetCode(): string {
  return `ctx.shadowColor = "transparent";
ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;`;
}

/**
 * Generates an SVG filter element for drop shadow.
 * @param id - Filter ID for reference
 * @param shadowColor - 8-digit hex color (#RRGGBBAA)
 * @param shadowBlur - Blur radius (stdDeviation)
 * @param shadowOffsetX - X offset (dx)
 * @param shadowOffsetY - Y offset (dy)
 * @returns SVG filter element string
 */
export function generateSvgShadowFilter(
  id: string,
  shadowColor: string,
  shadowBlur: number,
  shadowOffsetX: number,
  shadowOffsetY: number
): string {
  const hex = extractHex(shadowColor);
  const opacity = extractAlpha(shadowColor);
  const stdDeviation = shadowBlur / 2; // feDropShadow uses half the blur value

  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
  <feDropShadow dx="${shadowOffsetX}" dy="${shadowOffsetY}" stdDeviation="${stdDeviation}" flood-color="${hex}" flood-opacity="${opacity}"/>
</filter>`;
}
