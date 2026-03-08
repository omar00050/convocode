/**
 * Emoji utility functions for correct Unicode grapheme cluster handling.
 * Used for text measurement and character iteration in code generation.
 */

// Regex matching common emoji Unicode ranges:
// - Basic emoji symbols (U+2600–U+27FF)
// - Supplementary emoji (U+1F300–U+1FAFF)
// - Variation selectors (U+FE00–U+FE0F)
// - Regional indicator symbols (U+1F1E0–U+1F1FF)
// - Combining enclosing marks (U+20D0–U+20FF)
const EMOJI_REGEX =
  /[\u2600-\u27FF\uFE00-\uFE0F]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|\u200D|[\u20D0-\u20FF]/;

/**
 * Returns true if the given character (single grapheme) is or contains emoji.
 */
export function isEmoji(char: string): boolean {
  return EMOJI_REGEX.test(char);
}

/**
 * Splits text into an array of visual characters (grapheme clusters).
 * Each multi-codepoint emoji sequence is returned as a single element.
 *
 * Uses Intl.Segmenter when available (modern browsers/Node 16+),
 * with Array.from() as fallback for surrogate pair handling.
 */
export function splitTextPreservingEmoji(text: string): string[] {
  if (
    typeof Intl !== "undefined" &&
    "Segmenter" in Intl
  ) {
    // Intl.Segmenter correctly handles ZWJ sequences and variation selectors
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  // Array.from correctly handles surrogate pairs (emoji outside BMP)
  return Array.from(text);
}

/**
 * Measures the pixel width of text with letter spacing applied.
 * Uses grapheme-cluster-aware splitting to correctly measure emoji.
 *
 * @param ctx - Canvas 2D rendering context with font set
 * @param text - Text string to measure
 * @param letterSpacing - Additional spacing in pixels between each character
 * @returns Total pixel width of the rendered text
 */
export function measureTextWithEmoji(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number {
  const chars = splitTextPreservingEmoji(text);
  if (chars.length === 0) return 0;

  let totalWidth = 0;
  for (const char of chars) {
    totalWidth += ctx.measureText(char).width + letterSpacing;
  }
  // Subtract the trailing letterSpacing added after last character
  totalWidth -= letterSpacing;

  return totalWidth;
}
