/**
 * Pattern type identifiers for all supported geometric patterns.
 */
export type PatternType =
  | "dots"
  | "horizontalLines"
  | "verticalLines"
  | "diagonalLines"
  | "diagonalLinesReverse"
  | "crosshatch"
  | "diagonalCrosshatch"
  | "grid"
  | "chevron"
  | "waves";

/**
 * Definition for a repeating geometric pattern fill.
 */
export interface PatternDef {
  patternType: PatternType;
  foregroundColor: string;  // hex #RRGGBB, default "#000000"
  backgroundColor: string;  // hex #RRGGBB or "transparent", default "transparent"
  scale: number;            // 0.5–3.0, default 1.0
  rotation: number;         // 0–360 degrees, default 0
}

/**
 * Display options for pattern type selector dropdown.
 */
export const PATTERN_TYPES: { value: PatternType; label: string }[] = [
  { value: "dots", label: "Dots" },
  { value: "horizontalLines", label: "Horizontal Lines" },
  { value: "verticalLines", label: "Vertical Lines" },
  { value: "diagonalLines", label: "Diagonal Lines" },
  { value: "diagonalLinesReverse", label: "Diagonal Lines Reverse" },
  { value: "crosshatch", label: "Crosshatch" },
  { value: "diagonalCrosshatch", label: "Diagonal Crosshatch" },
  { value: "grid", label: "Grid" },
  { value: "chevron", label: "Chevron" },
  { value: "waves", label: "Waves" },
];

/**
 * Default pattern configuration (dots pattern, black on transparent).
 */
export const DEFAULT_PATTERN: PatternDef = {
  patternType: "dots",
  foregroundColor: "#000000",
  backgroundColor: "transparent",
  scale: 1.0,
  rotation: 0,
};
