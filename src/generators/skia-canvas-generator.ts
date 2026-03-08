import type { EditorState, TextObject, ImageObject, ShapeObject, QRCodeObject, GroupObject } from "@/types/editor";
import { getEffectiveFont, resolveDirection } from "@/lib/font-utils";
import { getFontCategory } from "@/lib/fonts";
import { generateImageCode } from "./helpers/generate-image-code";
import { generateTextCode } from "./helpers/generate-text-code";
import { generateShapeCode } from "./helpers/generate-shape-code";
import { generateGroupCode, collectGroupTextObjects } from "./helpers/generate-group-code";
import { getSvgPathHelperCode } from "@/lib/svg-path-to-canvas";

/**
 * Generates complete, runnable Node.js code using skia-canvas.
 * Skia-canvas supports the same Canvas 2D API as node-canvas.
 * with async/await for QR code generation.
 *
 * @param state - Full editor state
 * @returns Self-contained CommonJS JavaScript file string
 */
export function generateSkiaCanvasCode(state: EditorState): string {
  const sections: string[] = [];

  // 1. Header comment block
  sections.push(generateHeader(state));

  // 2. Require statements
  sections.push(generateRequires(state));

  // 3. Font registration section
  sections.push(generateFontRegistration(state));

  // 3b. SVG path helper (needed for icons and custom pen-tool shapes)
  if (needsSvgPathHelper(state)) {
    sections.push(getSvgPathHelperCode());
    sections.push("");
  }

  // 4. Main async function
  sections.push("async function generateImage() {");

  // 5. Canvas creation
  sections.push(generateCanvasCreation(state));

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
  const deps = hasQRCode ? "skia-canvas qrcode" : "skia-canvas";

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
  let requires = `const { createCanvas, loadImage, registerFont } = require("skia-canvas");
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

  // Collect all text objects including those inside groups
  const allTextObjects: TextObject[] = [];
  for (const obj of state.objects) {
    if (obj.type === "text") allTextObjects.push(obj as TextObject);
    else if (obj.type === "group") allTextObjects.push(...collectGroupTextObjects(obj as GroupObject));
  }

  // Collect all unique fonts from text objects
  for (const obj of allTextObjects) {
    if (obj.visible !== false) {
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
    const escapedFont = font.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`registerFont("./fonts/${escapedFont}.ttf", { family: "${escapedFont}" });`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates canvas creation code.
 */
function generateCanvasCreation(state: EditorState): string {
  return `  const canvas = createCanvas(${state.canvasWidth}, ${state.canvasHeight});
  const ctx = canvas.getContext("2d");

`;
}

/**
 * Generates background rendering code.
 */
function generateBackground(state: EditorState): string {
  const lines: string[] = [];

  if (state.backgroundImage) {
    lines.push("  // Background image");
    lines.push('  const bgImage = await loadImage("./images/background.png");');
    lines.push(
      `  ctx.drawImage(bgImage, 0, 0, ${state.canvasWidth}, ${state.canvasHeight});`
    );
    lines.push("");
  } else {
    lines.push("  // Background fill");
    lines.push(`  ctx.fillStyle = "${state.backgroundColor}";`);
    lines.push(`  ctx.fillRect(0, 0, ${state.canvasWidth}, ${state.canvasHeight});`);
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
        lines.push(generateShapeCode(shapeObj, layerIndex));
        break;
      }
      case "qrcode": {
        const qrObj = obj as QRCodeObject;
        lines.push(generateQRCodeCode(qrObj, layerIndex));
        break;
      }
      case "group": {
        const groupObj = obj as GroupObject;
        lines.push(generateGroupCode(groupObj, layerIndex));
        break;
      }
    }

    layerIndex++;
  }

  return lines.join("\n");
}

/**
 * Checks whether any visible objects require the applySvgPath runtime helper
 * (icons or custom pen-tool shapes, including those inside groups).
 */
function needsSvgPathHelper(state: EditorState): boolean {
  for (const obj of state.objects) {
    if (obj.visible === false) continue;
    if (obj.type === "shape") {
      const s = obj as ShapeObject;
      if ((s.shapeType === "icon" && s.svgPath) || (s.shapeType === "custom" && s.customPath)) return true;
    }
    if (obj.type === "group") {
      const g = obj as GroupObject;
      for (const child of g.children) {
        if (child.type === "shape") {
          const s = child as ShapeObject;
          if ((s.shapeType === "icon" && s.svgPath) || (s.shapeType === "custom" && s.customPath)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Generates the output saving code.
 */
function generateOutput(): string {
  return `
  // Save output
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./output.png", buffer);
  console.log("Image saved to ./output.png");
`;
}

/**
 * Generates QR code rendering code.
 */
function generateQRCodeCode(qr: QRCodeObject, index: number): string {
  const lines: string[] = [];

  // Layer comment
  lines.push(`  // Layer ${index}: ${qr.name || "QR Code"}`);
  lines.push("  ctx.save();");

  // Opacity (if not 1)
  const needsAlphaReset = qr.opacity < 1;
  if (needsAlphaReset) {
    lines.push(`  ctx.globalAlpha = ${qr.opacity};`);
  }

  // Blend mode (if not source-over)
  const needsBlendReset = qr.blendMode !== "source-over";
  if (needsBlendReset) {
    lines.push(`  ctx.globalCompositeOperation = "${qr.blendMode}";`);
  }

  // Shadow (if enabled)
  if (qr.shadowEnabled) {
    const shadowOpacity = qr.shadowColor.length >= 9
      ? parseInt(qr.shadowColor.slice(7, 9), 16) / 255
      : 1;
    const shadowColorHex = qr.shadowColor.slice(0, 7);
    lines.push(`  ctx.shadowColor = "${shadowColorHex}";`);
    lines.push(`  ctx.shadowBlur = ${qr.shadowBlur};`);
    lines.push(`  ctx.shadowOffsetX = ${qr.shadowOffsetX};`);
    lines.push(`  ctx.shadowOffsetY = ${qr.shadowOffsetY};`);
    lines.push(`  ctx.shadowOpacity = ${shadowOpacity};`);
  }

  // Rotation around center
  if (qr.rotation !== 0) {
    const centerX = qr.x + qr.width / 2;
    const centerY = qr.y + qr.height / 2;
    const radians = (qr.rotation * Math.PI) / 180;
    lines.push(`  ctx.translate(${centerX}, ${centerY});`);
    lines.push(`  ctx.rotate(${radians});`);
    lines.push(`  ctx.translate(${-centerX}, ${-centerY});`);
  }

  // Create offscreen canvas for QR code
  const escapedData = qr.data.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  lines.push(`  const qrCanvas${index} = createCanvas(${qr.width}, ${qr.height});`);
  lines.push(`  await QRCode.toCanvas(qrCanvas${index}, "${escapedData}", {`);
  lines.push(`    errorCorrectionLevel: "${qr.errorCorrectionLevel}",`);
  lines.push(`    color: { dark: "${qr.foregroundColor}", light: "${qr.backgroundColor}" },`);
  lines.push(`    margin: ${qr.padding},`);
  lines.push(`    width: ${qr.width}`);
  lines.push(`  });`);
  lines.push(`  ctx.drawImage(qrCanvas${index}, ${qr.x}, ${qr.y}, ${qr.width}, ${qr.height});`);

  // Reset shadow
  if (qr.shadowEnabled) {
    lines.push("  ctx.shadowColor = 'transparent';");
    lines.push("  ctx.shadowBlur = 0;");
    lines.push("  ctx.shadowOffsetX = 0;");
    lines.push("  ctx.shadowOffsetY = 0;");
  }

  // Reset blend mode
  if (needsBlendReset) {
    lines.push("  ctx.globalCompositeOperation = 'source-over';");
  }

  // Reset globalAlpha if changed
  if (needsAlphaReset) {
    lines.push("  ctx.globalAlpha = 1;");
  }

  lines.push("  ctx.restore();");
  lines.push("");

  return lines.join("\n");
}
