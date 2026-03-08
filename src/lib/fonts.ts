import type { FontDef } from "@/types/editor";

/**
 * Built-in font definitions.
 * Arial is a system font (no file needed), all others have local .ttf files.
 */
export const BUILT_IN_FONTS: FontDef[] = [
  // English fonts (8)
  {
    family: "Arial",
    displayName: "Arial",
    source: "built-in",
    url: undefined,
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Roboto",
    displayName: "Roboto",
    source: "built-in",
    url: "/fonts/Roboto-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Inter",
    displayName: "Inter",
    source: "built-in",
    url: "/fonts/Inter-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Montserrat",
    displayName: "Montserrat",
    source: "built-in",
    url: "/fonts/Montserrat-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Open Sans",
    displayName: "Open Sans",
    source: "built-in",
    url: "/fonts/OpenSans-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Poppins",
    displayName: "Poppins",
    source: "built-in",
    url: "/fonts/Poppins-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Lato",
    displayName: "Lato",
    source: "built-in",
    url: "/fonts/Lato-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Playfair Display",
    displayName: "Playfair Display",
    source: "built-in",
    url: "/fonts/PlayfairDisplay-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  // Arabic fonts (8)
  {
    family: "Cairo",
    displayName: "Cairo",
    source: "built-in",
    url: "/fonts/Cairo-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Tajawal",
    displayName: "Tajawal",
    source: "built-in",
    url: "/fonts/Tajawal-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Amiri",
    displayName: "Amiri",
    source: "built-in",
    url: "/fonts/Amiri-Regular.ttf",
    supportsBold: true,
    supportsItalic: true,
  },
  {
    family: "Noto Kufi Arabic",
    displayName: "Noto Kufi Arabic",
    source: "built-in",
    url: "/fonts/NotoKufiArabic-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Almarai",
    displayName: "Almarai",
    source: "built-in",
    url: "/fonts/Almarai-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Changa",
    displayName: "Changa",
    source: "built-in",
    url: "/fonts/Changa-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "El Messiri",
    displayName: "El Messiri",
    source: "built-in",
    url: "/fonts/ElMessiri-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
  {
    family: "Readex Pro",
    displayName: "Readex Pro",
    source: "built-in",
    url: "/fonts/ReadexPro-Regular.ttf",
    supportsBold: true,
    supportsItalic: false,
  },
];

/** Set of Arabic font family names for quick lookup */
const ARABIC_FONT_FAMILIES = new Set([
  "Cairo",
  "Tajawal",
  "Amiri",
  "Noto Kufi Arabic",
  "Almarai",
  "Changa",
  "El Messiri",
  "Readex Pro",
]);

/** English fonts subset */
export const ENGLISH_FONTS = BUILT_IN_FONTS.filter(
  (font) => !ARABIC_FONT_FAMILIES.has(font.family)
);

/** Arabic fonts subset */
export const ARABIC_FONTS = BUILT_IN_FONTS.filter((font) =>
  ARABIC_FONT_FAMILIES.has(font.family)
);

/**
 * Returns the category of a font family.
 * @param family - The font family name
 * @returns "arabic" if the font is Arabic, "english" otherwise
 */
export function getFontCategory(family: string): "english" | "arabic" {
  return ARABIC_FONT_FAMILIES.has(family) ? "arabic" : "english";
}
