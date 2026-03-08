import type { TextObject, EditorState } from "@/types/editor";

/**
 * Returns the effective font for a text object based on the font cascade:
 * 1. Text object's fontFamily (if not null)
 * 2. Global font (if not null)
 * 3. "Arial" as fallback
 */
export function getEffectiveFont(
  textObj: TextObject,
  state: Pick<EditorState, "globalFont">,
): string {
  if (textObj.fontFamily !== null) {
    return textObj.fontFamily;
  }
  if (state.globalFont !== null) {
    return state.globalFont;
  }
  return "Arial";
}

/**
 * Detects text direction by checking the first significant character.
 * Returns "rtl" for Arabic, Hebrew, or Thaana text, "ltr" otherwise.
 */
export function detectDirection(text: string): "rtl" | "ltr" {
  // Strip leading whitespace, punctuation, and digits to find first significant alphabetic character
  const trimmed = text.replace(/^[\s\d\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^`{|}~]*/, "");

  if (trimmed.length === 0) {
    return "ltr";
  }

  // Check first significant character against RTL Unicode ranges:
  // - Arabic: U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF
  // - Hebrew: U+0590–U+05FF, U+FB1D–U+FB4F
  // - Thaana: U+0780–U+07BF
  const firstChar = trimmed.charAt(0);
  const rtlRegex =
    /[\u0600-\u06FF\u0750-\u077F\u0780-\u07BF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF\uFB1D-\uFB4F]/;

  return rtlRegex.test(firstChar) ? "rtl" : "ltr";
}

/**
 * Resolves the effective direction for a text object.
 * If direction is "auto", detects from content; otherwise returns the forced direction.
 */
export function resolveDirection(textObj: TextObject): "rtl" | "ltr" {
  if (textObj.direction === "auto") {
    return detectDirection(textObj.content);
  }
  return textObj.direction;
}

/**
 * Returns the default text alignment for a given direction.
 * RTL defaults to "right", LTR defaults to "left".
 */
export function getDefaultAlignForDirection(direction: "rtl" | "ltr"): "right" | "left" {
  return direction === "rtl" ? "right" : "left";
}
