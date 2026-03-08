import type { RichTextSegment, RangeStyles, ResolvedSegmentStyle } from "@/types/rich-text";
import type { TextObject } from "@/types/editor";
import { resolveSegmentStyle, mergeAdjacentSegments } from "@/types/rich-text";

/**
 * Maps a flat character index to a segment position.
 * Returns the segment index and the offset within that segment.
 */
export function characterIndexToSegmentPosition(
  richContent: RichTextSegment[],
  charIndex: number
): { segmentIndex: number; offsetInSegment: number } {
  let currentIndex = 0;

  for (let segmentIndex = 0; segmentIndex < richContent.length; segmentIndex++) {
    const segmentLength = richContent[segmentIndex].text.length;
    const segmentStart = currentIndex;
    const segmentEnd = currentIndex + segmentLength;

    if (charIndex >= segmentStart && charIndex < segmentEnd) {
      return {
        segmentIndex,
        offsetInSegment: charIndex - segmentStart,
      };
    }

    currentIndex = segmentEnd;
  }

  // Index at end of text - return last segment position
  const lastSegmentIndex = richContent.length - 1;
  if (lastSegmentIndex >= 0) {
    return {
      segmentIndex: lastSegmentIndex,
      offsetInSegment: richContent[lastSegmentIndex].text.length,
    };
  }

  return { segmentIndex: 0, offsetInSegment: 0 };
}

/**
 * Gets the resolved style at a specific character index.
 */
export function getStyleAtIndex(
  richContent: RichTextSegment[],
  charIndex: number,
  parent: TextObject,
  globalFont: string | null
): ResolvedSegmentStyle {
  const { segmentIndex } = characterIndexToSegmentPosition(richContent, charIndex);
  return resolveSegmentStyle(richContent[segmentIndex], parent, globalFont);
}

/**
 * Gets the style status for a range (for toolbar display).
 * Returns uniform/mixed status for each property.
 */
export function getStylesInRange(
  richContent: RichTextSegment[],
  startIndex: number,
  endIndex: number,
  parent: TextObject,
  globalFont: string | null
): RangeStyles {
  const result: RangeStyles = {
    fontWeight: { value: null, uniform: true },
    fontStyle: { value: null, uniform: true },
    fontSize: { value: null, uniform: true },
    fill: { value: null, uniform: true },
    textDecoration: { value: null, uniform: true },
    letterSpacing: { value: null, uniform: true },
  };

  if (startIndex >= endIndex || richContent.length === 0) {
    return result;
  }

  // Collect all styles in the range
  const styles: ResolvedSegmentStyle[] = [];
  let currentIndex = 0;

  for (const segment of richContent) {
    const segmentStart = currentIndex;
    const segmentEnd = currentIndex + segment.text.length;

    // Check if this segment overlaps with the selection
    if (segmentEnd > startIndex && segmentStart < endIndex) {
      styles.push(resolveSegmentStyle(segment, parent, globalFont));
    }

    currentIndex = segmentEnd;
  }

  if (styles.length === 0) {
    return result;
  }

  // Check each property for uniformity
  const firstStyle = styles[0];

  result.fontWeight.value = firstStyle.fontWeight;
  result.fontStyle.value = firstStyle.fontStyle;
  result.fontSize.value = firstStyle.fontSize;
  result.fill.value = firstStyle.fill;
  result.textDecoration.value = firstStyle.textDecoration;
  result.letterSpacing.value = firstStyle.letterSpacing;

  for (let i = 1; i < styles.length; i++) {
    const style = styles[i];
    if (style.fontWeight !== firstStyle.fontWeight) result.fontWeight.uniform = false;
    if (style.fontStyle !== firstStyle.fontStyle) result.fontStyle.uniform = false;
    if (style.fontSize !== firstStyle.fontSize) result.fontSize.uniform = false;
    if (style.fill !== firstStyle.fill) result.fill.uniform = false;
    if (style.textDecoration !== firstStyle.textDecoration) result.textDecoration.uniform = false;
    if (style.letterSpacing !== firstStyle.letterSpacing) result.letterSpacing.uniform = false;
  }

  return result;
}

/**
 * Style to apply to a text range.
 */
export interface StyleOverride {
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: "normal" | "bold" | null;
  fontStyle?: "normal" | "italic" | null;
  fill?: string | null;
  textDecoration?: string | null;
  letterSpacing?: number | null;
}

/**
 * Applies a style override to a character range within richContent.
 * Splits segments at boundaries, applies the style, and merges result.
 */
export function applyStyleToRange(
  richContent: RichTextSegment[],
  startIndex: number,
  endIndex: number,
  style: StyleOverride
): RichTextSegment[] {
  if (startIndex >= endIndex || richContent.length === 0) {
    return richContent;
  }

  // Build a new segments array with proper splits
  const newSegments: RichTextSegment[] = [];
  let currentIndex = 0;

  for (let segIdx = 0; segIdx < richContent.length; segIdx++) {
    const segment = richContent[segIdx];
    const segmentStart = currentIndex;
    const segmentEnd = currentIndex + segment.text.length;

    // Determine overlap with selection
    const overlapStart = Math.max(segmentStart, startIndex);
    const overlapEnd = Math.min(segmentEnd, endIndex);

    if (overlapStart < overlapEnd) {
      // There is overlap - need to potentially split this segment
      const localStart = overlapStart - segmentStart;
      const localEnd = overlapEnd - segmentStart;

      // Part before selection
      if (localStart > 0) {
        newSegments.push({
          ...segment,
          text: segment.text.slice(0, localStart),
        });
      }

      // Part in selection (with style applied)
      newSegments.push({
        ...segment,
        text: segment.text.slice(localStart, localEnd),
        // Apply style overrides (explicit values override nulls)
        fontFamily: style.fontFamily !== undefined ? style.fontFamily : segment.fontFamily,
        fontSize: style.fontSize !== undefined ? style.fontSize : segment.fontSize,
        fontWeight: style.fontWeight !== undefined ? style.fontWeight : segment.fontWeight,
        fontStyle: style.fontStyle !== undefined ? style.fontStyle : segment.fontStyle,
        fill: style.fill !== undefined ? style.fill : segment.fill,
        textDecoration:
          style.textDecoration !== undefined
            ? (style.textDecoration as RichTextSegment["textDecoration"])
            : segment.textDecoration,
        letterSpacing:
          style.letterSpacing !== undefined ? style.letterSpacing : segment.letterSpacing,
      });

      // Part after selection
      if (localEnd < segment.text.length) {
        newSegments.push({
          ...segment,
          text: segment.text.slice(localEnd),
        });
      }
    } else {
      // No overlap - keep segment as-is
      newSegments.push({ ...segment });
    }

    currentIndex = segmentEnd;
  }

  return mergeAdjacentSegments(newSegments);
}

/**
 * Inserts text at a specific character index.
 * The inserted text inherits the style of the segment at the insertion point.
 */
export function insertTextAtIndex(
  richContent: RichTextSegment[],
  charIndex: number,
  text: string
): RichTextSegment[] {
  if (text.length === 0) return richContent;
  if (richContent.length === 0) {
    return [{ text, fontFamily: null, fontSize: null, fontWeight: null, fontStyle: null, fill: null, textDecoration: null, letterSpacing: null }];
  }

  const { segmentIndex, offsetInSegment } = characterIndexToSegmentPosition(richContent, charIndex);
  const segment = richContent[segmentIndex];

  // Split the segment and insert new text with inherited style
  const newSegments: RichTextSegment[] = [];

  // Add segments before the target segment
  for (let i = 0; i < segmentIndex; i++) {
    newSegments.push({ ...richContent[i] });
  }

  // Part before insertion
  if (offsetInSegment > 0) {
    newSegments.push({
      ...segment,
      text: segment.text.slice(0, offsetInSegment),
    });
  }

  // Inserted text (inherits style from current segment)
  newSegments.push({
    ...segment,
    text: text,
  });

  // Part after insertion
  if (offsetInSegment < segment.text.length) {
    newSegments.push({
      ...segment,
      text: segment.text.slice(offsetInSegment),
    });
  }

  // Add segments after the target segment
  for (let i = segmentIndex + 1; i < richContent.length; i++) {
    newSegments.push({ ...richContent[i] });
  }

  return mergeAdjacentSegments(newSegments);
}

/**
 * Deletes text in a character range.
 * Cleans up segments after deletion.
 */
export function deleteTextRange(
  richContent: RichTextSegment[],
  startIndex: number,
  endIndex: number
): RichTextSegment[] {
  if (startIndex >= endIndex || richContent.length === 0) {
    return richContent;
  }

  const newSegments: RichTextSegment[] = [];
  let currentIndex = 0;

  for (const segment of richContent) {
    const segmentStart = currentIndex;
    const segmentEnd = currentIndex + segment.text.length;

    // Determine overlap with deletion range
    const overlapStart = Math.max(segmentStart, startIndex);
    const overlapEnd = Math.min(segmentEnd, endIndex);

    if (overlapStart >= overlapEnd) {
      // No overlap - keep segment as-is
      newSegments.push({ ...segment });
    } else {
      // There is overlap - need to remove part of this segment
      const localStart = overlapStart - segmentStart;
      const localEnd = overlapEnd - segmentStart;

      // Part before deletion
      const beforeText = segment.text.slice(0, localStart);
      // Part after deletion
      const afterText = segment.text.slice(localEnd);

      if (beforeText.length > 0 && afterText.length > 0) {
        // Both parts exist - need to handle separately
        // The after part will be merged with subsequent segments by mergeAdjacentSegments
        newSegments.push({ ...segment, text: beforeText });
        newSegments.push({ ...segment, text: afterText });
      } else if (beforeText.length > 0) {
        newSegments.push({ ...segment, text: beforeText });
      } else if (afterText.length > 0) {
        newSegments.push({ ...segment, text: afterText });
      }
      // If both empty, the entire segment is deleted - don't add anything
    }

    currentIndex = segmentEnd;
  }

  return mergeAdjacentSegments(newSegments);
}

/**
 * Computes the text diff between old and new text.
 * Returns inserted text range and deleted text range.
 */
export function computeTextDiff(
  oldText: string,
  newText: string
): { deletedRange: { start: number; end: number } | null; insertedText: { start: number; text: string } | null } {
  // Find common prefix
  let commonPrefix = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (commonPrefix < minLen && oldText[commonPrefix] === newText[commonPrefix]) {
    commonPrefix++;
  }

  // Find common suffix
  let commonSuffix = 0;
  while (
    commonSuffix < minLen - commonPrefix &&
    oldText[oldText.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]
  ) {
    commonSuffix++;
  }

  const deletedRange =
    oldText.length > commonPrefix + commonSuffix
      ? { start: commonPrefix, end: oldText.length - commonSuffix }
      : null;

  const insertedText =
    newText.length > commonPrefix + commonSuffix
      ? { start: commonPrefix, text: newText.slice(commonPrefix, newText.length - commonSuffix) }
      : null;

  return { deletedRange, insertedText };
}
