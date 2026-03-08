import type { RichTextSegment, RichTextLine, RichTextChunk, ResolvedSegmentStyle } from "@/types/rich-text";
import type { TextObject } from "@/types/editor";
import { resolveSegmentStyle } from "@/types/rich-text";

/**
 * Text measurement function type.
 * Takes font shorthand and text, returns pixel width.
 */
export type MeasureTextFunction = (fontShorthand: string, text: string, letterSpacing: number) => number;

/**
 * Token representing a word or whitespace for wrapping.
 */
interface WrapToken {
  text: string;
  segmentIndex: number;
  startInSegment: number;
  resolvedStyle: ResolvedSegmentStyle;
  isWord: boolean; // false for whitespace
}

/**
 * Builds a CSS font shorthand string from resolved style.
 */
function buildFontShorthand(style: ResolvedSegmentStyle): string {
  const parts: string[] = [];
  if (style.fontStyle === "italic") parts.push("italic");
  if (style.fontWeight === "bold") parts.push("bold");
  parts.push(`${style.fontSize}px`);
  parts.push(`"${style.fontFamily}"`);
  return parts.join(" ");
}

/**
 * Tokenizes segments into words while preserving segment ownership.
 */
function tokenizeSegments(
  segments: RichTextSegment[],
  parent: TextObject,
  globalFont: string | null
): WrapToken[] {
  const tokens: WrapToken[] = [];

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    const resolvedStyle = resolveSegmentStyle(segment, parent, globalFont);

    // Split by whitespace while keeping track of positions
    let currentPos = 0;
    const text = segment.text;

    // Use regex to split into words and whitespace
    const wordPattern = /\s+|\S+/g;
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
      const tokenText = match[0];
      tokens.push({
        text: tokenText,
        segmentIndex: segIdx,
        startInSegment: currentPos,
        resolvedStyle,
        isWord: !/^\s+$/.test(tokenText),
      });
      currentPos += tokenText.length;
    }
  }

  return tokens;
}

/**
 * Core wrapping algorithm with injectable measurement function.
 * Returns wrapped lines with chunks containing resolved styles.
 */
export function wrapRichText(
  richContent: RichTextSegment[],
  textObject: TextObject,
  measureText: MeasureTextFunction,
  globalFont: string | null
): RichTextLine[] {
  if (richContent.length === 0) {
    return [];
  }

  const maxWidth = textObject.width;
  const tokens = tokenizeSegments(richContent, textObject, globalFont);
  const lines: RichTextLine[] = [];
  let currentLineChunks: RichTextChunk[] = [];
  let currentLineWidth = 0;
  let currentLineMaxFontSize = 0;

  // Helper to finalize current line
  const finalizeLine = () => {
    if (currentLineChunks.length > 0) {
      lines.push({
        chunks: currentLineChunks,
        lineWidth: currentLineWidth,
        lineHeight: currentLineMaxFontSize * textObject.lineHeight,
      });
      currentLineChunks = [];
      currentLineWidth = 0;
      currentLineMaxFontSize = 0;
    }
  };

  // Helper to add a chunk
  const addChunk = (text: string, style: ResolvedSegmentStyle, width: number) => {
    currentLineChunks.push({
      text,
      measuredWidth: width,
      resolvedFontSize: style.fontSize,
      resolvedFontFamily: style.fontFamily,
      resolvedFontWeight: style.fontWeight,
      resolvedFontStyle: style.fontStyle,
      resolvedFill: style.fill,
      resolvedTextDecoration: style.textDecoration,
      resolvedLetterSpacing: style.letterSpacing,
    });
    currentLineWidth += width;
    currentLineMaxFontSize = Math.max(currentLineMaxFontSize, style.fontSize);
  };

  // Helper to measure text with style
  const measure = (text: string, style: ResolvedSegmentStyle): number => {
    const font = buildFontShorthand(style);
    return measureText(font, text, style.letterSpacing);
  };

  // Process tokens
  for (const token of tokens) {
    // Handle explicit newlines
    if (token.text === "\n") {
      finalizeLine();
      continue;
    }

    // Handle tokens that contain newlines (split them)
    if (token.text.includes("\n")) {
      const parts = token.text.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
          const tokenWidth = measure(parts[i], token.resolvedStyle);
          const fitsOnLine = currentLineWidth + tokenWidth <= maxWidth || currentLineChunks.length === 0;

          if (!fitsOnLine) {
            finalizeLine();
          }

          // Check if single word exceeds width - need character-by-character breaking
          if (tokenWidth > maxWidth && token.isWord) {
            // Character-by-character breaking for oversized words
            const chars = Array.from(parts[i]); // Emoji-safe
            let charAccum = "";
            let charAccumWidth = 0;

            for (const char of chars) {
              const charWidth = measure(charAccum + char, token.resolvedStyle);
              if (charAccumWidth > 0 && charWidth > maxWidth) {
                // Flush accumulated chars
                addChunk(charAccum, token.resolvedStyle, measure(charAccum, token.resolvedStyle));
                finalizeLine();
                charAccum = char;
                charAccumWidth = measure(char, token.resolvedStyle);
              } else {
                charAccum += char;
                charAccumWidth = charWidth;
              }
            }

            if (charAccum.length > 0) {
              const fitsRemaining = currentLineWidth + charAccumWidth <= maxWidth || currentLineChunks.length === 0;
              if (!fitsRemaining) {
                finalizeLine();
              }
              addChunk(charAccum, token.resolvedStyle, charAccumWidth);
            }
          } else {
            addChunk(parts[i], token.resolvedStyle, tokenWidth);
          }
        }

        // Add newline break after each part except the last
        if (i < parts.length - 1) {
          finalizeLine();
        }
      }
      continue;
    }

    const tokenWidth = measure(token.text, token.resolvedStyle);

    // Check if token fits on current line
    const fitsOnLine = currentLineWidth + tokenWidth <= maxWidth || currentLineChunks.length === 0;

    if (!fitsOnLine && token.isWord) {
      // Word doesn't fit - start new line
      finalizeLine();

      // Check if single word exceeds width - need character-by-character breaking
      if (tokenWidth > maxWidth) {
        const chars = Array.from(token.text); // Emoji-safe
        let charAccum = "";
        let charAccumWidth = 0;

        for (const char of chars) {
          const charWidth = measure(charAccum + char, token.resolvedStyle);
          if (charAccumWidth > 0 && charWidth > maxWidth) {
            // Flush accumulated chars
            addChunk(charAccum, token.resolvedStyle, measure(charAccum, token.resolvedStyle));
            finalizeLine();
            charAccum = char;
            charAccumWidth = measure(char, token.resolvedStyle);
          } else {
            charAccum += char;
            charAccumWidth = charWidth;
          }
        }

        if (charAccum.length > 0) {
          addChunk(charAccum, token.resolvedStyle, charAccumWidth);
        }
        continue;
      }
    }

    // Add token to current line
    addChunk(token.text, token.resolvedStyle, tokenWidth);
  }

  // Finalize last line
  finalizeLine();

  // Ensure at least one empty line if no content
  if (lines.length === 0) {
    lines.push({
      chunks: [],
      lineWidth: 0,
      lineHeight: textObject.fontSize * textObject.lineHeight,
    });
  }

  return lines;
}

// Offscreen canvas for browser text measurement
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

/**
 * Browser-based text measurement using offscreen canvas.
 */
function measureTextBrowser(fontShorthand: string, text: string, letterSpacing: number): number {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement("canvas");
    offscreenCtx = offscreenCanvas.getContext("2d");
  }

  if (!offscreenCtx) {
    return 0;
  }

  offscreenCtx.font = fontShorthand;
  const baseWidth = offscreenCtx.measureText(text).width;
  return baseWidth + Math.max(0, text.length - 1) * letterSpacing;
}

/**
 * Browser version of wrapRichText using offscreen canvas for measurement.
 */
export function wrapRichTextForCanvas(
  richContent: RichTextSegment[],
  textObject: TextObject,
  globalFont: string | null
): RichTextLine[] {
  return wrapRichText(richContent, textObject, measureTextBrowser, globalFont);
}

/**
 * Generates JavaScript code string of the wrapRichText function for generated code output.
 * This is used by code generators to include inline wrapping logic.
 */
export function generateWrapRichTextCode(): string {
  return `
// Text measurement helper
function measureTextWidth(ctx, text, letterSpacing) {
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

// Rich text wrapping function
function wrapRichText(ctx, richContent, parentStyle, maxWidth, lineHeight) {
  if (maxWidth <= 0 || richContent.length === 0) return [];

  const lines = [];
  let currentLine = { chunks: [], width: 0, maxFontSize: parentStyle.fontSize };

  const buildFont = (chunk) => {
    const parts = [];
    if (chunk.fontStyle === "italic") parts.push("italic");
    if (chunk.fontWeight === "bold") parts.push("bold");
    parts.push(chunk.fontSize + "px");
    parts.push("\\"" + chunk.fontFamily + "\\"");
    return parts.join(" ");
  };

  const measure = (text, chunk) => {
    ctx.font = buildFont(chunk);
    return measureTextWidth(ctx, text, chunk.letterSpacing);
  };

  const addChunk = (text, chunk, width) => {
    currentLine.chunks.push({ text, ...chunk, width });
    currentLine.width += width;
    currentLine.maxFontSize = Math.max(currentLine.maxFontSize, chunk.fontSize);
  };

  const finalizeLine = () => {
    if (currentLine.chunks.length > 0) {
      lines.push({
        chunks: currentLine.chunks,
        width: currentLine.width,
        height: currentLine.maxFontSize * lineHeight
      });
      currentLine = { chunks: [], width: 0, maxFontSize: parentStyle.fontSize };
    }
  };

  for (const segment of richContent) {
    const chunk = {
      fontFamily: segment.fontFamily || parentStyle.fontFamily,
      fontSize: segment.fontSize || parentStyle.fontSize,
      fontWeight: segment.fontWeight || parentStyle.fontWeight,
      fontStyle: segment.fontStyle || parentStyle.fontStyle,
      fill: segment.fill || parentStyle.fill,
      textDecoration: segment.textDecoration || parentStyle.textDecoration,
      letterSpacing: segment.letterSpacing !== null ? segment.letterSpacing : parentStyle.letterSpacing
    };

    // Split by explicit newlines first
    const paragraphs = segment.text.split("\\n");

    for (let p = 0; p < paragraphs.length; p++) {
      if (p > 0) finalizeLine(); // Explicit line break

      const para = paragraphs[p];
      if (!para) continue;

      // Tokenize into words
      const words = para.split(/(\\s+)/);

      for (const word of words) {
        if (!word) continue;

        const wordWidth = measure(word, chunk);
        const fits = currentLine.width + wordWidth <= maxWidth || currentLine.chunks.length === 0;

        if (!fits && !/^\\s+$/.test(word)) {
          finalizeLine();

          // Character-level breaking for oversized words
          if (wordWidth > maxWidth) {
            const chars = Array.from(word);
            let accum = "";
            let accumWidth = 0;

            for (const char of chars) {
              const charWidth = measure(accum + char, chunk);
              if (accumWidth > 0 && charWidth > maxWidth) {
                addChunk(accum, chunk, measure(accum, chunk));
                finalizeLine();
                accum = char;
                accumWidth = measure(char, chunk);
              } else {
                accum += char;
                accumWidth = charWidth;
              }
            }

            if (accum) {
              addChunk(accum, chunk, measure(accum, chunk));
            }
            continue;
          }
        }

        addChunk(word, chunk, wordWidth);
      }
    }
  }

  finalizeLine();
  return lines.length ? lines : [{ chunks: [], width: 0, height: parentStyle.fontSize * lineHeight }];
}
`;
}
