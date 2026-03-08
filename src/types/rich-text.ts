import type { TextObject } from "./editor";

/**
 * A contiguous run of characters sharing the same inline style overrides.
 * Null values inherit from the parent TextObject.
 */
export interface RichTextSegment {
  text: string;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: "normal" | "bold" | null;
  fontStyle: "normal" | "italic" | null;
  fill: string | null;
  textDecoration: "none" | "underline" | "line-through" | "underline line-through" | null;
  letterSpacing: number | null;
}

/**
 * A portion of a RichTextSegment that falls on a single line after wrapping.
 * All style fields are fully resolved (no nulls).
 */
export interface RichTextChunk {
  text: string;
  measuredWidth: number;
  resolvedFontSize: number;
  resolvedFontFamily: string;
  resolvedFontWeight: "normal" | "bold";
  resolvedFontStyle: "normal" | "italic";
  resolvedFill: string;
  resolvedTextDecoration: string;
  resolvedLetterSpacing: number;
}

/**
 * A single wrapped line of text composed of one or more chunks.
 */
export interface RichTextLine {
  chunks: RichTextChunk[];
  lineWidth: number;
  lineHeight: number;
}

/**
 * Resolved style object with all nulls filled in from parent.
 */
export interface ResolvedSegmentStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  fill: string;
  textDecoration: string;
  letterSpacing: number;
}

/**
 * Style status for a range selection (for toolbar display).
 * Each property can be "uniform" (same across selection) or "mixed".
 */
export interface RangeStyles {
  fontWeight: { value: "normal" | "bold" | null; uniform: boolean };
  fontStyle: { value: "normal" | "italic" | null; uniform: boolean };
  fontSize: { value: number | null; uniform: boolean };
  fill: { value: string | null; uniform: boolean };
  textDecoration: { value: string | null; uniform: boolean };
  letterSpacing: { value: number | null; uniform: boolean };
}

/**
 * Creates a segment with all style fields null (inherits everything from parent).
 */
export function createDefaultSegment(text: string): RichTextSegment {
  return {
    text,
    fontFamily: null,
    fontSize: null,
    fontWeight: null,
    fontStyle: null,
    fill: null,
    textDecoration: null,
    letterSpacing: null,
  };
}

/**
 * Resolves a segment's style by filling nulls with parent TextObject values.
 * Uses the font cascade: segment → textObject → globalFont → "Arial"
 */
export function resolveSegmentStyle(
  segment: RichTextSegment,
  parent: TextObject,
  globalFont: string | null
): ResolvedSegmentStyle {
  return {
    fontFamily: segment.fontFamily ?? parent.fontFamily ?? globalFont ?? "Arial",
    fontSize: segment.fontSize ?? parent.fontSize,
    fontWeight: segment.fontWeight ?? parent.fontWeight,
    fontStyle: segment.fontStyle ?? parent.fontStyle,
    fill: segment.fill ?? parent.fill,
    textDecoration: segment.textDecoration ?? parent.textDecoration,
    letterSpacing: segment.letterSpacing ?? parent.letterSpacing,
  };
}

/**
 * Concatenates all segment text values to produce plain text content.
 */
export function segmentsToPlainText(segments: RichTextSegment[]): string {
  return segments.map((s) => s.text).join("");
}

/**
 * Converts plain text to a single-segment array with default (inherit-all) styling.
 */
export function plainTextToSegments(text: string): RichTextSegment[] {
  return [createDefaultSegment(text)];
}

/**
 * Checks if two segments have identical non-text style properties.
 * Used for merging adjacent segments.
 */
function segmentsHaveSameStyles(a: RichTextSegment, b: RichTextSegment): boolean {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.fill === b.fill &&
    a.textDecoration === b.textDecoration &&
    a.letterSpacing === b.letterSpacing
  );
}

/**
 * Merges adjacent segments with identical style properties and removes empty segments.
 * This normalization keeps the richContent array minimal and clean.
 */
export function mergeAdjacentSegments(segments: RichTextSegment[]): RichTextSegment[] {
  if (segments.length === 0) return [];

  const result: RichTextSegment[] = [];
  let current: RichTextSegment | null = null;

  for (const segment of segments) {
    // Skip empty segments
    if (segment.text.length === 0) continue;

    if (current === null) {
      current = { ...segment };
    } else {
      const currentSegment = current as RichTextSegment;
      if (segmentsHaveSameStyles(currentSegment, segment)) {
        // Merge with current
        current = {
          ...currentSegment,
          text: currentSegment.text + segment.text,
        };
      } else {
        // Push current and start new
        result.push(currentSegment);
        current = { ...segment };
      }
    }
  }

  if (current !== null) {
    result.push(current);
  }

  return result;
}

/**
 * Checks if richContent represents plain text (can use fast path).
 * Returns true if richContent is null, or is a single segment with all null styles.
 */
export function isPlainRichText(richContent: RichTextSegment[] | null | undefined): boolean {
  if (!richContent || richContent.length === 0) return true;
  if (richContent.length > 1) return false;

  const segment = richContent[0];
  return (
    segment.fontFamily === null &&
    segment.fontSize === null &&
    segment.fontWeight === null &&
    segment.fontStyle === null &&
    segment.fill === null &&
    segment.textDecoration === null &&
    segment.letterSpacing === null
  );
}

/**
 * Checks if richContent has any explicit style overrides.
 * Used to determine if "Rich text: styles vary" indicator should show.
 */
export function hasStyleOverrides(richContent: RichTextSegment[] | null | undefined): boolean {
  if (!richContent) return false;

  return richContent.some(
    (segment) =>
      segment.fontFamily !== null ||
      segment.fontSize !== null ||
      segment.fontWeight !== null ||
      segment.fontStyle !== null ||
      segment.fill !== null ||
      segment.textDecoration !== null ||
      segment.letterSpacing !== null
  );
}
