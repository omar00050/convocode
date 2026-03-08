/**
 * Text path math utilities for curved text rendering.
 * Computes per-character positions and rotations along arc, circle, and wave paths.
 */

/**
 * Per-character position and rotation along a curved path.
 */
export interface CharPosition {
  x: number;       // horizontal position in px
  y: number;       // vertical position in px
  rotation: number; // rotation in radians (tangent to path)
}

/**
 * Computes character positions along an arc (partial circle).
 *
 * For direction "up": text curves upward (like a smile — characters on top of arc).
 * For direction "down": text curves downward (like a frown — characters on bottom of arc).
 *
 * @param chars - array of character strings
 * @param widths - measured width of each character in px
 * @param radius - arc radius in px
 * @param direction - "up" or "down"
 * @param startAngleDeg - starting angle in degrees (0 = right, 90 = down)
 * @param letterSpacing - extra spacing between characters in px
 */
export function computeArcPositions(
  chars: string[],
  widths: number[],
  radius: number,
  direction: "up" | "down",
  startAngleDeg: number,
  letterSpacing: number
): CharPosition[] {
  if (chars.length === 0) return [];

  const positions: CharPosition[] = [];
  const r = Math.max(1, radius);

  // Total arc span in radians
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + Math.max(0, chars.length - 1) * letterSpacing;
  const totalAngle = totalWidth / r;

  // Center the text around the start angle
  const startAngleRad = (startAngleDeg * Math.PI) / 180;

  // For "up": center at bottom, characters arc upward
  // For "down": center at top, characters arc downward
  const centerY = direction === "up" ? r : -r;

  // Starting angle: centered around startAngle
  let currentAngle = startAngleRad - totalAngle / 2;

  for (let i = 0; i < chars.length; i++) {
    const charWidth = widths[i];
    // Position character at midpoint of its angular span
    const charAngleSpan = charWidth / r;
    const charAngle = currentAngle + charAngleSpan / 2;

    let x: number, y: number, rotation: number;

    if (direction === "up") {
      // Characters sit on top of arc: arc center is below
      x = r * Math.sin(charAngle);
      y = centerY - r * Math.cos(charAngle);
      rotation = charAngle;
    } else {
      // Characters hang below arc: arc center is above
      x = r * Math.sin(charAngle);
      y = centerY + r * Math.cos(charAngle);
      rotation = charAngle + Math.PI;
    }

    positions.push({ x, y, rotation });
    currentAngle += charAngleSpan + letterSpacing / r;
  }

  return positions;
}

/**
 * Computes character positions around a full circle.
 *
 * @param chars - array of character strings
 * @param widths - measured width of each character in px
 * @param radius - circle radius in px
 * @param startAngleDeg - starting angle in degrees (0 = top)
 * @param clockwise - true for clockwise, false for counter-clockwise
 * @param letterSpacing - extra spacing between characters in px
 */
export function computeCirclePositions(
  chars: string[],
  widths: number[],
  radius: number,
  startAngleDeg: number,
  clockwise: boolean,
  letterSpacing: number
): CharPosition[] {
  if (chars.length === 0) return [];

  const positions: CharPosition[] = [];
  const r = Math.max(1, radius);
  const dir = clockwise ? 1 : -1;

  // Start at top (startAngle - 90° so 0° = top)
  const startAngleRad = ((startAngleDeg - 90) * Math.PI) / 180;
  let currentAngle = startAngleRad;

  for (let i = 0; i < chars.length; i++) {
    const charWidth = widths[i];
    const charAngleSpan = (charWidth / r) * dir;
    const charAngle = currentAngle + charAngleSpan / 2;

    const x = r * Math.cos(charAngle);
    const y = r * Math.sin(charAngle);
    // Rotation: tangent to circle + 90° to face outward
    const rotation = charAngle + Math.PI / 2;

    positions.push({ x, y, rotation });
    currentAngle += charAngleSpan + (letterSpacing / r) * dir;
  }

  return positions;
}

/**
 * Computes character positions along a sine wave.
 *
 * @param chars - array of character strings
 * @param widths - measured width of each character in px
 * @param amplitude - wave height in px
 * @param wavelength - distance between wave peaks in px
 * @param phaseDeg - phase offset in degrees
 * @param letterSpacing - extra spacing between characters in px
 */
export function computeWavePositions(
  chars: string[],
  widths: number[],
  amplitude: number,
  wavelength: number,
  phaseDeg: number,
  letterSpacing: number
): CharPosition[] {
  if (chars.length === 0) return [];

  const positions: CharPosition[] = [];
  const wl = Math.max(1, wavelength);
  const phaseRad = (phaseDeg * Math.PI) / 180;
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + Math.max(0, chars.length - 1) * letterSpacing;

  let x = -totalWidth / 2;

  for (let i = 0; i < chars.length; i++) {
    const charWidth = widths[i];
    const charX = x + charWidth / 2;

    const angleArg = (charX * 2 * Math.PI) / wl + phaseRad;
    const y = amplitude * Math.sin(angleArg);
    // Rotation = atan2 of derivative
    const derivative = amplitude * (2 * Math.PI / wl) * Math.cos(angleArg);
    const rotation = Math.atan2(derivative, 1);

    positions.push({ x: charX, y, rotation });
    x += charWidth + letterSpacing;
  }

  return positions;
}

/**
 * Dispatcher that calls the appropriate position computation based on textPathType.
 * Returns empty array for "none".
 */
export function computeTextPathPositions(params: {
  textPathType: "none" | "arc" | "circle" | "wave";
  chars: string[];
  widths: number[];
  letterSpacing: number;
  // Arc params
  radius?: number;
  direction?: "up" | "down";
  startAngle?: number;
  // Circle params
  clockwise?: boolean;
  // Wave params
  amplitude?: number;
  wavelength?: number;
  phase?: number;
}): CharPosition[] {
  const {
    textPathType,
    chars,
    widths,
    letterSpacing,
    radius = 300,
    direction = "up",
    startAngle = 0,
    clockwise = true,
    amplitude = 30,
    wavelength = 200,
    phase = 0,
  } = params;

  switch (textPathType) {
    case "arc":
      return computeArcPositions(chars, widths, radius, direction, startAngle, letterSpacing);
    case "circle":
      return computeCirclePositions(chars, widths, radius, startAngle, clockwise, letterSpacing);
    case "wave":
      return computeWavePositions(chars, widths, amplitude, wavelength, phase, letterSpacing);
    default:
      return [];
  }
}
