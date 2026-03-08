import type { EditorState, TextObject, ImageObject, ShapeObject, QRCodeObject, GroupObject } from "@/types/editor";
import { getEffectiveFont, resolveDirection } from "@/lib/font-utils";
import { getFontCategory } from "@/lib/fonts";
import { isPlainRichText } from "@/types/rich-text";
import { generateImageCode } from "./helpers/generate-image-code";
import { generateTextCode } from "./helpers/generate-text-code";
import { generateShapeCode } from "./helpers/generate-shape-code";
import { flattenGroupForRendering } from "@/lib/group-utils";

/**
 * Generates complete, runnable Node.js code using the Jimp library.
 * With async/await for QR code generation.
 *
 * @param state - Full editor state
 * @returns Self-contained CommonJS JavaScript file string
 */
export function generateJimpCode(state: EditorState): string {
  const sections: string[] = [];

  // 1. Header comment block
  sections.push(generateHeader(state));

  // 2. Require statements
  sections.push(generateRequires(state));

  // 3. Font registration section
  sections.push(generateFontRegistration(state));

  // 4. Main async function
  sections.push("async function generateImage() {");

  // 5. Jimp image creation
  sections.push(generateJimpCreation(state));

  // 6. Background rendering
  sections.push(generateBackground(state));

  // 7. Object rendering
  sections.push(generateObjects(state));

  // 8. Output saving
  sections.push(generateOutput());

  // 9. Close function and invoke
  sections.push("}");
  sections.push("generateImage().catch(console.error);");

  return sections.join("\n");
}

/**
 * Generates the header comment block.
 */
function generateHeader(state: EditorState): string {
  const timestamp = new Date().toISOString();
  const hasQRCode = state.objects.some((o) => o.type === "qrcode");
  const deps = hasQRCode ? "jimp qrcode" : "jimp";

  return `/**
 * ConvoCode - Visual Canvas Code Generator - Generated Code
 * Generated: ${timestamp}
 *
 * Install dependencies:
 *   npm install ${deps}
 *
 * Usage:
 *   node generated-code.js
 *
 * Note: Place image files in ./images/ directory relative to this script.
 * Note: Place font files in ./fonts/ directory relative to this script.
 */

`;
}

/**
 * Generates the require statements.
 */
function generateRequires(state: EditorState): string {
  const hasQRCode = state.objects.some((o) => o.type === "qrcode");
  let requires = `const Jimp = require("jimp");
const fs = require("fs");
`;
  if (hasQRCode) {
    requires += `const QRCode = require("qrcode");
`;
  }
  return requires + "\n";
}

/**
 * Generates font registration for all unique fonts used in text objects.
 */
function generateFontRegistration(state: EditorState): string {
  const lines: string[] = [];
  const uniqueFonts = new Set<string>();
  const fontSources = new Map<string, { source: string; isBuiltIn: boolean }>();

  // Collect all unique fonts from text objects
  for (const obj of state.objects) {
    if (obj.type === "text" && obj.visible !== false) {
      const textObj = obj as TextObject;
      const effectiveFont = getEffectiveFont(textObj, state);

      // Skip Arial as system font
      if (effectiveFont === "Arial") continue;

      if (!uniqueFonts.has(effectiveFont)) {
        uniqueFonts.add(effectiveFont);

        // Check if it's a built-in or uploaded font
        const builtIn = state.builtInFonts.find((f) => f.family === effectiveFont);
        const uploaded = state.uploadedFonts.find((f) => f.family === effectiveFont);

        if (builtIn) {
          fontSources.set(effectiveFont, {
            source: `// Download from Google Fonts: https://fonts.google.com/specimen/${encodeURIComponent(builtIn.family)}`,
            isBuiltIn: true,
          });
        } else if (uploaded) {
          fontSources.set(effectiveFont, {
            source: `// Custom font: ${uploaded.displayName || uploaded.family}`,
            isBuiltIn: false,
          });
        } else {
          fontSources.set(effectiveFont, {
            source: `// Font: ${effectiveFont} - ensure font file is available`,
            isBuiltIn: false,
          });
        }
      }
    }
  }

  if (uniqueFonts.size === 0) {
    return "// No custom fonts to register\n\n";
  }

  lines.push("// Font registration");
  for (const font of uniqueFonts) {
    const info = fontSources.get(font)!;
    lines.push(info.source);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates Jimp image creation code.
 */
function generateJimpCreation(state: EditorState): string {
  const lines: string[] = [];

  lines.push(`  const width = ${state.canvasWidth};`);
  lines.push(`  const height = ${state.canvasHeight};`);

  // Create image with background color
  const hex = state.backgroundColor;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  lines.push(`  const image = new Jimp(width, height, ${r << 24 | g << 16 | b << 8 | 255});`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates background rendering code.
 */
function generateBackground(state: EditorState): string {
  const lines: string[] = [];

  if (state.backgroundImage) {
    lines.push("  // Background image");
    lines.push('  const bgImage = await Jimp.read("./images/background.png");');
    lines.push("  image.blit(bgImage, 0, 0);");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generates object rendering code by iterating through visible objects.
 */
function generateObjects(state: EditorState): string {
  const lines: string[] = [];
  let layerIndex = 1;

  for (const obj of state.objects) {
    // Skip hidden objects
    if (obj.visible === false) {
      continue;
    }

    switch (obj.type) {
      case "image": {
        const imageObj = obj as ImageObject;
        lines.push(generateImageCode(imageObj, layerIndex));
        break;
      }
      case "text": {
        const textObj = obj as TextObject;
        // Skip empty text
        if (!textObj.content || textObj.content.trim() === "") {
          lines.push(`  // Layer ${layerIndex}: ${textObj.name || "Text"} (skipped - empty content)`);
          lines.push("");
          break;
        }

        // Curved text limitation notice
        if (textObj.textPathType && textObj.textPathType !== "none") {
          lines.push(`  // Layer ${layerIndex}: ${textObj.name || "Text"} (curved text: ${textObj.textPathType})`);
          lines.push(`  // Note: Curved text is not supported by Jimp. Text is rendered in a straight line.`);
          lines.push(`  // Consider using node-canvas or skia-canvas for curved text support.`);
          lines.push("");
        }

        // Rich text limitation notice
        if (textObj.richContent && !isPlainRichText(textObj.richContent)) {
          lines.push(`  // Layer ${layerIndex}: ${textObj.name || "Text"} (rich text)`);
          lines.push(`  // Note: Rich text with mixed styles is not supported by Jimp's text rendering.`);
          lines.push(`  // All text uses the parent object's font/size/color. Per-segment styles are ignored.`);
          lines.push(`  // Consider using node-canvas or skia-canvas for full rich text support.`);
          lines.push("");
        }

        const effectiveFont = getEffectiveFont(textObj, state);
        const direction = resolveDirection(textObj);

        // Look up font metadata for Arabic italic warning
        const allFonts = [...state.builtInFonts, ...state.uploadedFonts];
        const fontDef = allFonts.find((f) => f.family === effectiveFont);
        const fontMeta = fontDef
          ? { supportsItalic: fontDef.supportsItalic, category: getFontCategory(effectiveFont) }
          : undefined;

        lines.push(generateTextCode(textObj, effectiveFont, layerIndex, direction, fontMeta));
        break;
      }
      case "shape": {
        const shapeObj = obj as ShapeObject;
        if (shapeObj.shapeType === "custom") {
          lines.push(`  // Layer ${layerIndex}: ${shapeObj.name || "Custom Shape"} (custom path)`);
          lines.push(`  // Note: Custom shape paths are not supported by Jimp. Consider using node-canvas.`);
          lines.push(`  // The custom shape at layer ${layerIndex} is skipped.`);
          lines.push("");
        } else if (shapeObj.shapeType === "icon" && shapeObj.svgPath) {
          lines.push(`  // Layer ${layerIndex}: ${shapeObj.name || "Icon"} (${shapeObj.iconName ?? "icon"})`);
          lines.push(`  // Note: Jimp does not support SVG path rendering.`);
          lines.push(`  // The icon "${shapeObj.iconName ?? "icon"}" at layer ${layerIndex} cannot be rendered by Jimp.`);
          lines.push(`  // Consider using node-canvas or skia-canvas for icon support.`);
          lines.push("");
        } else {
          lines.push(generateShapeCode(shapeObj, layerIndex));
        }
        break;
      }
      case "qrcode": {
        const qrObj = obj as QRCodeObject;
        lines.push(generateQRCodeCode(qrObj, layerIndex));
        break;
      }
      case "group": {
        // Flatten group to absolute positions for jimp compositing
        const groupObj = obj as GroupObject;
        const flattened = flattenGroupForRendering(groupObj);
        lines.push(`  // Group ${layerIndex}: ${groupObj.name || "Group"} (flattened for compositing)`);
        for (const { object: child, transform } of flattened) {
          layerIndex++;
          const flatChild = { ...child, x: transform.x, y: transform.y, opacity: transform.opacity, rotation: transform.rotation };
          if (flatChild.type === "image") {
            lines.push(generateImageCode(flatChild as ImageObject, layerIndex));
          } else if (flatChild.type === "text") {
            const tObj = flatChild as TextObject;
            lines.push(generateTextCode(tObj, tObj.fontFamily ?? "Arial", layerIndex, tObj.direction === "rtl" ? "rtl" : "ltr"));
          } else if (flatChild.type === "shape") {
            lines.push(generateShapeCode(flatChild as ShapeObject, layerIndex));
          }
        }
        break;
      }
    }

    layerIndex++;
  }

  return lines.join("\n");
}

/**
 * Generates the output saving code.
 */
function generateOutput(): string {
  return `
  // Save output
  await image.writeAsync("./output.png");
  console.log("Image saved to ./output.png");
`;
}

/**
 * Generates QR code rendering code for Jimp.
 */
function generateQRCodeCode(qr: QRCodeObject, index: number): string {
  const lines: string[] = [];

  // Layer comment
  lines.push(`  // Layer ${index}: ${qr.name || "QR Code"}`);

  // Create QR buffer
  const escapedData = qr.data.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  lines.push(`  const qrBuffer${index} = await QRCode.toBuffer("${escapedData}", {`);
  lines.push(`    errorCorrectionLevel: "${qr.errorCorrectionLevel}",`);
  lines.push(`    color: { dark: "${qr.foregroundColor}", light: "${qr.backgroundColor}" },`);
  lines.push(`    margin: ${qr.padding},`);
  lines.push(`    width: ${qr.width},`);
  lines.push(`    type: "png"`);
  lines.push(`  });`);

  // Read QR image and composite
  lines.push(`  const qrImage${index} = await Jimp.read(qrBuffer${index});`);

  // Apply opacity if needed
  if (qr.opacity < 1) {
    lines.push(`  qrImage${index}.opacity(${qr.opacity});`);
  }

  // Rotate if needed
  if (qr.rotation !== 0) {
    lines.push(`  qrImage${index}.rotate(${qr.rotation});`);
  }

  // Composite onto main image
  lines.push(`  image.blit(qrImage${index}, ${Math.round(qr.x)}, ${Math.round(qr.y)});`);
  lines.push("");

  return lines.join("\n");
}
