import type { EditorState, TextObject, ImageObject, ShapeObject, QRCodeObject, GroupObject } from "@/types/editor";
import { getEffectiveFont, resolveDirection } from "@/lib/font-utils";
import { getFontCategory } from "@/lib/fonts";
import { isPlainRichText } from "@/types/rich-text";
import { wrapRichText } from "@/lib/rich-text-wrap";
import { generateImageCode } from "./helpers/generate-image-code";
import { generateTextCode } from "./helpers/generate-text-code";
import { generateShapeCode } from "./helpers/generate-shape-code";
import { flattenGroupForRendering } from "@/lib/group-utils";

/**
 * Generates complete, runnable Node.js code using the sharp library.
 * With async/await for QR code generation.
 *
 * @param state - Full editor state
 * @returns Self-contained CommonJS JavaScript file string
 */
export function generateSharpCode(state: EditorState): string {
  const sections: string[] = [];

  // 1. Header comment block
  sections.push(generateHeader(state));

  // 2. Require statements
  sections.push(generateRequires(state));

  // 3. Font registration section
  sections.push(generateFontRegistration(state));

  // 4. Main async function
  sections.push("async function generateImage() {");

  // 5. Sharp pipeline creation
  sections.push(generateSharpCreation(state));

  // 6. Background
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
  const deps = hasQRCode ? "sharp qrcode" : "sharp";

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
  let requires = `const sharp = require("sharp");
const fs = require("fs");
`;
  if (hasQRCode) {
    requires += `const QRCode = require("qrcode");
`;
  }

  const hasText = state.objects.some((o) => o.type === "text");
  if (hasText) {
    requires += `// Note: Emoji rendering requires an emoji font installed on the system.
// On Linux: sudo apt install fonts-noto-color-emoji
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
 * Generates Sharp pipeline creation code.
 */
function generateSharpCreation(state: EditorState): string {
  const lines: string[] = [];

  lines.push(`  const width = ${state.canvasWidth};`);
  lines.push(`  const height = ${state.canvasHeight};`);

  return lines.join("\n") + "\n";
}

/**
 * Generates background rendering code.
 */
function generateBackground(state: EditorState): string {
  const lines: string[] = [];

  if (state.backgroundImage) {
    lines.push("  // Background image");
    lines.push('  const bgImage = await sharp("./images/background.png").resize(width, height).toBuffer();');
  } else {
    lines.push("  // Background fill");
    // Convert hex to RGBA for sharp
    const hex = state.backgroundColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
    lines.push(`  const bgImage = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: ${r}, g: ${g}, b: ${b}, alpha: ${a} }
    }
  }).png().toBuffer();`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates object rendering code by iterating through visible objects.
 */
function generateObjects(state: EditorState): string {
  const lines: string[] = [];
  const composites: string[] = [];

  let layerIndex = 1;

  for (const obj of state.objects) {
    // Skip hidden objects
    if (obj.visible === false) {
      continue;
    }

    switch (obj.type) {
      case "image": {
        const imageObj = obj as ImageObject;
        lines.push(`  // Layer ${layerIndex}: ${imageObj.name || "Image"}`);
        const escapedName = imageObj.originalName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        lines.push(`  const img${layerIndex} = await sharp("./images/${escapedName}").resize(${Math.round(imageObj.width)}, ${Math.round(imageObj.height)}).toBuffer();`);
        composites.push(`{ input: img${layerIndex}, left: ${Math.round(imageObj.x)}, top: ${Math.round(imageObj.y)} }`);
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

        // Curved text: generate SVG with per-character transforms
        if (textObj.textPathType && textObj.textPathType !== "none") {
          const svgCode = generateCurvedTextSvgCode(textObj, layerIndex, effectiveFont);
          lines.push(svgCode);
          composites.push(`{ input: curvedTextBuffer${layerIndex}, left: 0, top: 0 }`);
          break;
        }

        // Rich text: generate SVG with tspan elements
        if (textObj.richContent && !isPlainRichText(textObj.richContent)) {
          const svgCode = generateRichTextSvgCode(textObj, layerIndex, effectiveFont, state.globalFont);
          lines.push(svgCode);
          composites.push(`{ input: textSvgBuffer${layerIndex}, left: ${Math.round(textObj.x)}, top: ${Math.round(textObj.y)} }`);
          break;
        }

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
        if (shapeObj.shapeType === "icon" && shapeObj.svgPath) {
          const iconCode = generateIconShapeCode(shapeObj, layerIndex);
          lines.push(iconCode);
          composites.push(`{ input: iconBuffer${layerIndex}, left: ${Math.round(shapeObj.x)}, top: ${Math.round(shapeObj.y)} }`);
        } else if (shapeObj.shapeType === "custom" && shapeObj.customPath) {
          const customCode = generateCustomShapeSvgCode(shapeObj, layerIndex);
          lines.push(customCode);
          composites.push(`{ input: customShapeBuffer${layerIndex}, left: ${Math.round(shapeObj.x)}, top: ${Math.round(shapeObj.y)} }`);
        } else {
          lines.push(generateShapeCode(shapeObj, layerIndex));
        }
        break;
      }
      case "qrcode": {
        const qrObj = obj as QRCodeObject;
        const qrCode = generateQRCodeCode(qrObj, layerIndex);
        lines.push(qrCode);
        composites.push(`{ input: qrBuffer${layerIndex}, left: ${Math.round(qrObj.x)}, top: ${Math.round(qrObj.y)} }`);
        break;
      }
      case "group": {
        // Flatten group to absolute positions for sharp compositing
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

  // Generate composite array
  if (composites.length > 0) {
    lines.push("");
    lines.push("  // Composite all layers");
    lines.push(`  const result = await sharp(bgImage)`);
    lines.push(`    .composite([`);
    lines.push(`      ${composites.join(",\n      ")}`);
    lines.push(`    ])`);
    lines.push(`    .png()`);
    lines.push(`    .toBuffer();`);
  } else {
    lines.push("  const result = bgImage;");
  }

  return lines.join("\n");
}

/**
 * Generates the output saving code.
 */
function generateOutput(): string {
  return `
  // Save output
  fs.writeFileSync("./output.png", result);
  console.log("Image saved to ./output.png");
`;
}

/**
 * Generates rich text SVG rendering code for sharp using per-line text + tspan elements.
 * Pre-wraps text using approximate character-width measurement.
 */
function generateRichTextSvgCode(text: TextObject, index: number, effectiveFont: string, globalFont: string | null): string {
  const lines: string[] = [];

  lines.push(`  // Layer ${index}: ${text.name || "Text"} (rich text)`);

  // Use approximate char-width measurement for pre-wrapping at code-gen time
  const approxMeasure = (fontShorthand: string, t: string, letterSpacing: number): number => {
    const sizeMatch = fontShorthand.match(/(\d+)px/);
    const fontSize = sizeMatch ? parseInt(sizeMatch[1]) : 16;
    return Array.from(t).length * (fontSize * 0.55) + Math.max(0, Array.from(t).length - 1) * letterSpacing;
  };

  const wrappedLines = wrapRichText(text.richContent!, text, approxMeasure, globalFont);

  const escapedFont = effectiveFont.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  let svgTextContent = "";
  let currentY = 0;
  for (const line of wrappedLines) {
    if (line.chunks.length === 0) {
      currentY += line.lineHeight;
      continue;
    }

    let drawX = 0;
    if (text.textAlign === "center") drawX = (text.width - line.lineWidth) / 2;
    else if (text.textAlign === "right") drawX = text.width - line.lineWidth;

    const tspans = line.chunks.map((chunk) => {
      const fontWeight = chunk.resolvedFontWeight !== "normal" ? ` font-weight="${chunk.resolvedFontWeight}"` : "";
      const fontStyle = chunk.resolvedFontStyle !== "normal" ? ` font-style="${chunk.resolvedFontStyle}"` : "";
      const textDecoration = chunk.resolvedTextDecoration && chunk.resolvedTextDecoration !== "none"
        ? ` text-decoration="${chunk.resolvedTextDecoration}"`
        : "";
      const escapedChunkFont = chunk.resolvedFontFamily.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const escapedText = chunk.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const tspan = `<tspan font-family="${escapedChunkFont}" font-size="${chunk.resolvedFontSize}" fill="${chunk.resolvedFill}"${fontWeight}${fontStyle}${textDecoration}>${escapedText}</tspan>`;
      drawX += chunk.measuredWidth;
      return tspan;
    });

    svgTextContent += `<text x="${Math.round(drawX < 0 ? 0 : (text.textAlign === "left" ? 0 : drawX))}" y="${Math.round(currentY + line.lineHeight * 0.85)}" font-family="${escapedFont}">${tspans.join("")}</text>`;
    currentY += line.lineHeight;
  }

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${text.width}" height="${text.height || Math.max(currentY, text.fontSize)}">${svgTextContent}</svg>`;
  const escapedSvg = svgStr.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
  lines.push(`  const textSvgBuffer${index} = Buffer.from(\`${escapedSvg}\`);`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates icon shape rendering code for sharp (SVG composite approach).
 */
function generateIconShapeCode(shape: ShapeObject, index: number): string {
  const lines: string[] = [];
  const escapedPath = (shape.svgPath ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const scaleX = (shape.width / 24).toFixed(4);
  const scaleY = (shape.height / 24).toFixed(4);
  const opacity = shape.opacity < 1 ? shape.opacity : 1;

  lines.push(`  // Layer ${index}: ${shape.name || "Icon"} (${shape.iconName ?? "icon"})`);
  lines.push(`  const iconSvg${index} = \`<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}" viewBox="0 0 ${shape.width} ${shape.height}"><path d="${escapedPath}" transform="scale(${scaleX}, ${scaleY})" stroke="${shape.fill}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/></svg>\`;`);
  lines.push(`  const iconBuffer${index} = Buffer.from(iconSvg${index});`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates QR code rendering code for sharp.
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

  // Apply opacity and rotation if needed via sharp
  if (qr.opacity < 1 || qr.rotation !== 0) {
    lines.push(`  qrBuffer${index} = await sharp(qrBuffer${index})`);
    if (qr.opacity < 1) {
      lines.push(`    .flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } })`);
      lines.push(`    .modulate({ brightness: 1 })`);
    }
    if (qr.rotation !== 0) {
      lines.push(`    .rotate(${qr.rotation})`);
    }
    lines.push(`    .png().toBuffer();`);
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Generates sharp SVG compositing code for curved text.
 * Each character is placed as a <text> element with a transform attribute.
 */
function generateCurvedTextSvgCode(text: TextObject, index: number, effectiveFont: string): string {
  const lines: string[] = [];
  const pathType = text.textPathType ?? "arc";
  const ls = text.letterSpacing;
  const chars = Array.from(text.content);
  if (chars.length === 0) return "";

  const escapedFont = effectiveFont.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const fontSize = text.fontSize;
  const fill = text.fill;

  const approxCharWidth = (char: string) => {
    if (char === " ") return fontSize * 0.3;
    if ("ijl1j".includes(char)) return fontSize * 0.35;
    if ("mwMW".includes(char)) return fontSize * 0.85;
    return fontSize * 0.58;
  };

  const widths = chars.map(approxCharWidth);
  const totalW = widths.reduce((s: number, w: number) => s + w, 0) + Math.max(0, chars.length - 1) * ls;

  const svgParts: string[] = [];
  let curX = -totalW / 2;

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    const midX = curX + w / 2;
    let px = 0, py = 0, rot = 0;

    if (pathType === "arc") {
      const r = text.textPathRadius ?? 300;
      const dir = text.textPathDirection ?? "up";
      const startDeg = text.textPathStartAngle ?? 0;
      const totalAngle = totalW / r;
      const startAngle = (startDeg * Math.PI / 180) - totalAngle / 2;
      const charAngle = startAngle + midX / r;
      if (dir === "up") {
        px = r * Math.sin(charAngle);
        py = r - r * Math.cos(charAngle);
        rot = charAngle * 180 / Math.PI;
      } else {
        px = r * Math.sin(charAngle);
        py = -r + r * Math.cos(charAngle);
        rot = (charAngle + Math.PI) * 180 / Math.PI;
      }
    } else if (pathType === "circle") {
      const r = text.textPathRadius ?? 150;
      const startDeg = text.textPathStartAngle ?? 0;
      const cw = text.textPathClockwise ?? true;
      const dir = cw ? 1 : -1;
      const startAngle = (startDeg - 90) * Math.PI / 180;
      const charAngle = startAngle + (midX / r) * dir;
      px = r * Math.cos(charAngle);
      py = r * Math.sin(charAngle);
      rot = (charAngle + Math.PI / 2) * 180 / Math.PI;
    } else {
      const amp = text.textPathAmplitude ?? 30;
      const wl = text.textPathWavelength ?? 200;
      const phaseDeg = text.textPathPhase ?? 0;
      const phaseRad = phaseDeg * Math.PI / 180;
      const arg = midX * 2 * Math.PI / wl + phaseRad;
      py = amp * Math.sin(arg);
      const deriv = amp * (2 * Math.PI / wl) * Math.cos(arg);
      rot = Math.atan2(deriv, 1) * 180 / Math.PI;
      px = midX;
    }

    const cx = text.x + text.width / 2 + px;
    const cy = text.y + text.height / 2 + py;

    const escapedChar = chars[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const fontWeight = text.fontWeight === "bold" ? ` font-weight="bold"` : "";
    const fontStyle = text.fontStyle === "italic" ? ` font-style="italic"` : "";
    svgParts.push(
      `<text x="0" y="0" font-family="${escapedFont}" font-size="${fontSize}" fill="${fill}"${fontWeight}${fontStyle} text-anchor="middle" dominant-baseline="central" transform="translate(${Math.round(cx)}, ${Math.round(cy)}) rotate(${rot.toFixed(1)})">${escapedChar}</text>`
    );
    curX += w + ls;
  }

  // Use the canvas dimensions for the SVG so compositing is correct
  const svgW = 2000; // use large canvas; left/top will be 0
  const svgH = 2000;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">${svgParts.join("")}</svg>`;

  lines.push(`  // Layer ${index}: ${text.name || "Text"} (curved: ${pathType})`);
  lines.push(`  const curvedTextSvg${index} = Buffer.from(\`${svgContent.replace(/`/g, "\\`")}\`);`);
  lines.push(`  const curvedTextBuffer${index} = curvedTextSvg${index};`);
  lines.push("");
  return lines.join("\n");
}

/**
 * Generates sharp SVG compositing code for a custom pen-tool shape.
 */
function generateCustomShapeSvgCode(shape: ShapeObject, index: number): string {
  const lines: string[] = [];
  const origW = shape.customPathOriginalWidth ?? shape.width;
  const origH = shape.customPathOriginalHeight ?? shape.height;
  const scaleX = origW > 0 ? shape.width / origW : 1;
  const scaleY = origH > 0 ? shape.height / origH : 1;
  const escapedPath = (shape.customPath ?? "").replace(/&/g, "&amp;");

  const fillAttr = shape.fill === "transparent" ? `fill="none"` : `fill="${shape.fill}"`;
  const strokeAttr = shape.strokeWidth > 0 ? ` stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"` : "";
  const opacity = shape.opacity < 1 ? ` opacity="${shape.opacity}"` : "";
  const scaleTransform = `scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}"><path d="${escapedPath}" ${fillAttr}${strokeAttr}${opacity} transform="${scaleTransform}"/></svg>`;

  lines.push(`  // Layer ${index}: ${shape.name || "Custom Shape"}`);
  lines.push(`  const customShapeSvg${index} = Buffer.from(\`${svgContent.replace(/`/g, "\\`")}\`);`);
  lines.push(`  const customShapeBuffer${index} = customShapeSvg${index};`);
  lines.push("");
  return lines.join("\n");
}
