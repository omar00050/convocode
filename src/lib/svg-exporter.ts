/**
 * SVG Exporter — converts canvas editor state to a standalone SVG document.
 * No "use client" needed — pure functions, no Konva or browser APIs required.
 */

import type { GradientDef, BackgroundType } from "@/types/gradient";
import type { PatternDef } from "@/types/pattern";
import type {
  AnyCanvasObject,
  ShapeObject,
  TextObject,
  ImageObject,
  QRCodeObject,
  GroupObject,
} from "@/types/editor";
import { generateQRMatrix, drawQRToCanvas } from "@/lib/qr-encoder";

// ─────────────────────────────────────────────────────────────────────────────
// Internal context — accumulates defs during SVG generation
// ─────────────────────────────────────────────────────────────────────────────

interface SvgDef {
  id: string;
  element: string;
}

interface SvgGenerationContext {
  defs: SvgDef[];
  defCounter: number;
}

function mkCtx(): SvgGenerationContext {
  return { defs: [], defCounter: 0 };
}

function nextId(ctx: SvgGenerationContext, prefix: string): string {
  return `${prefix}_${ctx.defCounter++}`;
}

function addDef(ctx: SvgGenerationContext, element: string): string {
  const id = nextId(ctx, element.startsWith("<filter") ? "shadow" :
    element.startsWith("<linearGradient") || element.startsWith("<radialGradient") ? "grad" :
    element.startsWith("<pattern") ? "pat" :
    element.startsWith("<clipPath") ? "clip" : "def");
  // Extract id from element (already set before this call)
  ctx.defs.push({ id, element });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient defs
// ─────────────────────────────────────────────────────────────────────────────

function generateSvgGradientDef(gradient: GradientDef, id: string): string {
  const stops = gradient.stops
    .map((s) => `<stop offset="${s.position}" stop-color="${s.color}"/>`)
    .join("");

  if (gradient.type === "linear") {
    const rad = ((gradient.angle - 90) * Math.PI) / 180;
    const x1 = 50 - Math.cos(rad) * 50;
    const y1 = 50 - Math.sin(rad) * 50;
    const x2 = 50 + Math.cos(rad) * 50;
    const y2 = 50 + Math.sin(rad) * 50;
    return `<linearGradient id="${id}" x1="${x1.toFixed(2)}%" y1="${y1.toFixed(2)}%" x2="${x2.toFixed(2)}%" y2="${y2.toFixed(2)}%" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
  } else {
    // Radial: uses objectBoundingBox fractions
    return `<radialGradient id="${id}" cx="${gradient.centerX}" cy="${gradient.centerY}" r="${gradient.radius}" gradientUnits="objectBoundingBox">${stops}</radialGradient>`;
  }
}

function addGradient(gradient: GradientDef, ctx: SvgGenerationContext): string {
  const id = `grad_${ctx.defCounter++}`;
  ctx.defs.push({ id, element: generateSvgGradientDef(gradient, id) });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shadow filter defs
// ─────────────────────────────────────────────────────────────────────────────

function addShadowFilter(
  shadow: { shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number },
  ctx: SvgGenerationContext
): string {
  const id = `shadow_${ctx.defCounter++}`;
  const color = shadow.shadowColor;
  const element = `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feDropShadow dx="${shadow.shadowOffsetX}" dy="${shadow.shadowOffsetY}" stdDeviation="${shadow.shadowBlur / 2}" flood-color="${color}"/>` +
    `</filter>`;
  ctx.defs.push({ id, element });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern defs (approximation)
// ─────────────────────────────────────────────────────────────────────────────

function addPatternDef(pattern: PatternDef, ctx: SvgGenerationContext): string {
  const id = `pat_${ctx.defCounter++}`;
  const size = (pattern.scale ?? 1) * 20;
  const color = pattern.foregroundColor ?? "#cccccc";
  const bg = pattern.backgroundColor ?? "transparent";
  let geometry = "";

  switch (pattern.patternType) {
    case "dots":
      geometry = `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.2}" fill="${color}"/>`;
      break;
    case "horizontalLines":
      geometry = `<line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="${color}" stroke-width="1.5"/>`;
      break;
    case "verticalLines":
      geometry = `<line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="${color}" stroke-width="1.5"/>`;
      break;
    case "grid":
      geometry = `<rect width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="0.5"/>`;
      break;
    case "diagonalLines":
      geometry = `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="1.5"/>`;
      break;
    case "diagonalLinesReverse":
      geometry = `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="1.5"/>`;
      break;
    case "crosshatch":
    case "diagonalCrosshatch":
      geometry = `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="1"/>` +
        `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="1"/>`;
      break;
    default:
      geometry = `<rect width="${size}" height="${size}" fill="${color}" opacity="0.3"/>`;
  }

  const element = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/>` +
    geometry +
    `</pattern>`;
  ctx.defs.push({ id, element });
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transform helpers
// ─────────────────────────────────────────────────────────────────────────────

function objectToSvgTransform(obj: { x: number; y: number; width: number; height: number; rotation: number }): string {
  if (!obj.rotation) return `translate(${obj.x},${obj.y})`;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  return `translate(${obj.x},${obj.y}) rotate(${obj.rotation},${obj.width / 2},${obj.height / 2})`;
}

function sharedAttrs(obj: { opacity: number; blendMode: string; shadowEnabled: boolean },
  shadowId: string | null): string {
  let attrs = "";
  if (obj.opacity !== 1) attrs += ` opacity="${obj.opacity}"`;
  if (obj.blendMode && obj.blendMode !== "source-over") {
    attrs += ` style="mix-blend-mode:${blendModeToSvg(obj.blendMode)}"`;
  }
  if (obj.shadowEnabled && shadowId) attrs += ` filter="url(#${shadowId})"`;
  return attrs;
}

function blendModeToSvg(mode: string): string {
  const map: Record<string, string> = {
    "source-over": "normal",
    "multiply": "multiply",
    "screen": "screen",
    "overlay": "overlay",
    "darken": "darken",
    "lighten": "lighten",
    "color-dodge": "color-dodge",
    "color-burn": "color-burn",
    "hard-light": "hard-light",
    "soft-light": "soft-light",
    "difference": "difference",
    "exclusion": "exclusion",
    "hue": "hue",
    "saturation": "saturation",
    "color": "color",
    "luminosity": "luminosity",
  };
  return map[mode] ?? "normal";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fill helper
// ─────────────────────────────────────────────────────────────────────────────

function resolveFill(
  fill: string,
  fillType: string | undefined,
  fillGradient: GradientDef | undefined | null,
  fillPattern: PatternDef | undefined | null,
  ctx: SvgGenerationContext
): string {
  if (fillType === "linearGradient" || fillType === "radialGradient") {
    if (fillGradient) return `url(#${addGradient(fillGradient, ctx)})`;
  }
  if (fillType === "pattern") {
    if (fillPattern) return `url(#${addPatternDef(fillPattern, ctx)})`;
  }
  return fill === "transparent" ? "none" : (fill || "none");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape SVG generation
// ─────────────────────────────────────────────────────────────────────────────

function generateShapeSvg(shape: ShapeObject, ctx: SvgGenerationContext): string {
  if (!shape.visible) return "";

  const shadowId = shape.shadowEnabled
    ? addShadowFilter(shape, ctx) : null;

  const fill = resolveFill(shape.fill, shape.fillType, shape.fillGradient, shape.fillPattern, ctx);
  const stroke = shape.stroke && shape.strokeWidth > 0
    ? ` stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"` : "";
  const transform = ` transform="${objectToSvgTransform(shape)}"`;
  const shared = sharedAttrs(shape, shadowId);

  const { x, y, width, height } = shape;

  switch (shape.shapeType) {
    case "rect": {
      const rx = shape.cornerRadius ? shape.cornerRadius : 0;
      return `<rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="${fill}"${stroke}${transform}${shared}/>`;
    }
    case "circle":
      return `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}"${stroke}${transform}${shared}/>`;
    case "triangle": {
      const pts = `${width / 2},0 ${width},${height} 0,${height}`;
      return `<polygon points="${pts}" fill="${fill}"${stroke}${transform}${shared}/>`;
    }
    case "diamond": {
      const pts = `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
      return `<polygon points="${pts}" fill="${fill}"${stroke}${transform}${shared}/>`;
    }
    case "polygon": {
      const sides = shape.sides ?? 6;
      const pts = polygonPoints(width / 2, height / 2, width / 2, height / 2, sides);
      return `<polygon points="${pts}" fill="${fill}"${stroke}${transform}${shared}/>`;
    }
    case "star": {
      const outer = Math.min(width, height) / 2;
      const inner = shape.innerRadius ?? outer * 0.4;
      const spikes = shape.sides ?? 5;
      const pts = starPoints(width / 2, height / 2, outer, inner, spikes);
      return `<polygon points="${pts}" fill="${fill}"${stroke}${transform}${shared}/>`;
    }
    case "icon":
      if (shape.svgPath) {
        const scaleX = width / 24;
        const scaleY = height / 24;
        return `<g transform="${objectToSvgTransform(shape)}"${shared}>` +
          `<path d="${shape.svgPath}" fill="${fill}"${stroke} transform="scale(${scaleX},${scaleY})"/>` +
          `</g>`;
      }
      return "";
    case "custom":
      if (shape.customPath) {
        const scaleX = shape.customPathOriginalWidth ? width / shape.customPathOriginalWidth : 1;
        const scaleY = shape.customPathOriginalHeight ? height / shape.customPathOriginalHeight : 1;
        return `<g transform="${objectToSvgTransform(shape)}"${shared}>` +
          `<path d="${shape.customPath}" fill="${fill}"${stroke} transform="scale(${scaleX},${scaleY})"/>` +
          `</g>`;
      }
      return "";
    case "arrow": {
      const arrowHead = width * 0.3;
      const arrowY = height / 2;
      const d = `M0,${arrowY} L${width - arrowHead},${arrowY} M${width - arrowHead},${arrowY - height * 0.2} L${width},${arrowY} L${width - arrowHead},${arrowY + height * 0.2}`;
      return `<path d="${d}" fill="none" stroke="${fill !== "none" ? fill : (shape.stroke || "#000000")}" stroke-width="${Math.max(1, shape.strokeWidth)}"${transform}${shared}/>`;
    }
    case "line": {
      const lineY = height / 2;
      return `<line x1="0" y1="${lineY}" x2="${width}" y2="${lineY}" stroke="${fill !== "none" ? fill : (shape.stroke || "#000000")}" stroke-width="${Math.max(1, shape.strokeWidth)}"${transform}${shared}/>`;
    }
    default:
      return `<rect x="0" y="0" width="${width}" height="${height}" fill="${fill}"${stroke}${transform}${shared}/>`;
  }
}

function polygonPoints(cx: number, cy: number, rx: number, ry: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * 2 * Math.PI - Math.PI / 2;
    pts.push(`${(cx + rx * Math.cos(a)).toFixed(2)},${(cy + ry * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, spikes: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (spikes * 2)) * 2 * Math.PI - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Text SVG generation
// ─────────────────────────────────────────────────────────────────────────────

function generateTextSvg(text: TextObject, ctx: SvgGenerationContext): string {
  if (!text.visible) return "";

  const shadowId = text.shadowEnabled ? addShadowFilter(text, ctx) : null;
  const shared = sharedAttrs(text, shadowId);
  const transform = ` transform="${objectToSvgTransform(text)}"`;

  const family = text.fontFamily ?? "Arial, sans-serif";
  const size = text.fontSize;
  const weight = text.fontWeight;
  const style = text.fontStyle;

  let fill = text.fill;
  if ((text.fillType === "linearGradient" || text.fillType === "radialGradient") && text.fillGradient) {
    fill = `url(#${addGradient(text.fillGradient, ctx)})`;
  }

  const anchor = text.textAlign === "center" ? "middle" : text.textAlign === "right" ? "end" : "start";
  const anchorX = text.textAlign === "center" ? text.width / 2
    : text.textAlign === "right" ? text.width : 0;

  const strokeAttr = text.strokeEnabled && text.strokeWidth > 0
    ? ` paint-order="stroke" stroke="${text.strokeColor}" stroke-width="${text.strokeWidth}"`
    : "";

  // Curved text
  if (text.textPathType && text.textPathType !== "none") {
    return generateCurvedTextSvg(text, fill, shared, transform, strokeAttr);
  }

  // Rich text
  if (text.richContent && text.richContent.length > 0) {
    return generateRichTextSvg(text, fill, anchor, anchorX, shared, transform, strokeAttr, ctx);
  }

  // Plain text with line wrapping
  const lines = text.content.split("\n");
  const lineHeightPx = size * (text.lineHeight ?? 1.2);
  const baselineY = size; // first line at fontSize from top

  const tspans = lines.map((line, i) =>
    `<tspan x="${anchorX}" dy="${i === 0 ? 0 : lineHeightPx}">${escSvg(line || " ")}</tspan>`
  ).join("");

  return `<text x="${anchorX}" y="${baselineY}" font-family="${family}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${text.letterSpacing ?? 0}"${strokeAttr}${transform}${shared}>${tspans}</text>`;
}

function generateRichTextSvg(
  text: TextObject,
  defaultFill: string,
  anchor: string,
  anchorX: number,
  shared: string,
  transform: string,
  strokeAttr: string,
  ctx: SvgGenerationContext
): string {
  const segments = text.richContent!;
  const size = text.fontSize;
  const lineHeightPx = size * (text.lineHeight ?? 1.2);

  const tspanContent = segments.map((seg) => {
    const segFill = seg.fill ?? defaultFill;
    const segSize = seg.fontSize ?? size;
    const segWeight = seg.fontWeight ?? text.fontWeight;
    const segStyle = seg.fontStyle ?? text.fontStyle;
    const decAttr = seg.textDecoration ? ` text-decoration="${seg.textDecoration}"` : "";
    return `<tspan font-size="${segSize}" font-weight="${segWeight}" font-style="${segStyle}" fill="${segFill}"${decAttr}>${escSvg(seg.text)}</tspan>`;
  }).join("");

  return `<text x="${anchorX}" y="${size}" font-family="${text.fontFamily ?? "Arial, sans-serif"}" text-anchor="${anchor}"${strokeAttr}${transform}${shared}>${tspanContent}</text>`;
}

function generateCurvedTextSvg(
  text: TextObject,
  fill: string,
  shared: string,
  transform: string,
  strokeAttr: string
): string {
  // Emit a simple approximation: just render as regular text at the text origin.
  // Curved text requires canvas measurement which isn't available in a pure module.
  const anchor = text.textAlign === "center" ? "middle" : text.textAlign === "right" ? "end" : "start";
  const anchorX = text.textAlign === "center" ? text.width / 2
    : text.textAlign === "right" ? text.width : 0;
  const size = text.fontSize;
  return `<text x="${anchorX}" y="${size}" font-family="${text.fontFamily ?? "Arial, sans-serif"}" font-size="${size}" font-weight="${text.fontWeight}" fill="${fill}" text-anchor="${anchor}"${strokeAttr}${transform}${shared}>${escSvg(text.content)}</text>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image SVG generation
// ─────────────────────────────────────────────────────────────────────────────

function generateImageSvg(image: ImageObject, ctx: SvgGenerationContext): string {
  if (!image.visible) return "";

  const shadowId = image.shadowEnabled ? addShadowFilter(image, ctx) : null;
  const shared = sharedAttrs(image, shadowId);

  const { x, y, width, height, rotation } = image;

  // Handle flips and rotation
  let transform = `translate(${x},${y})`;
  if (rotation) transform += ` rotate(${rotation},${width / 2},${height / 2})`;
  if (image.flipX || image.flipY) {
    const sx = image.flipX ? -1 : 1;
    const sy = image.flipY ? -1 : 1;
    const tx = image.flipX ? width : 0;
    const ty = image.flipY ? height : 0;
    transform += ` translate(${tx},${ty}) scale(${sx},${sy})`;
  }

  // Image filters as SVG filter
  let filterAttr = "";
  const f = image.filters;
  const hasFilters = f && (f.brightness !== 0 || f.contrast !== 0 || f.saturation !== 0 ||
    f.blur !== 0 || f.sepia !== 0 || f.hueRotate !== 0);

  if (hasFilters && !shadowId) {
    const filterId = `imgfilter_${ctx.defCounter++}`;
    const filterDef = buildImageFilterDef(filterId, f);
    ctx.defs.push({ id: filterId, element: filterDef });
    filterAttr = ` filter="url(#${filterId})"`;
  }

  // Clip mask
  let clipAttr = "";
  if (image.maskType && image.maskType !== "none") {
    const clipId = `clip_${ctx.defCounter++}`;
    const clipDef = buildClipPath(clipId, width, height, image.maskType, image.maskRadius);
    ctx.defs.push({ id: clipId, element: clipDef });
    clipAttr = ` clip-path="url(#${clipId})"`;
  }

  return `<image href="${image.src}" x="0" y="0" width="${width}" height="${height}" ` +
    `preserveAspectRatio="xMidYMid meet" transform="${transform}"${filterAttr}${clipAttr}${shared}/>`;
}

function buildImageFilterDef(id: string, f: { brightness: number; contrast: number; saturation: number; blur: number; sepia: number; hueRotate: number }): string {
  const parts: string[] = [];

  if (f.blur > 0) parts.push(`<feGaussianBlur stdDeviation="${f.blur / 4}"/>`);

  // Sepia via colorMatrix
  if (f.sepia !== 0) {
    const s = f.sepia / 100;
    parts.push(
      `<feColorMatrix type="matrix" values="` +
      `${0.393 + 0.607 * (1 - s)} ${0.769 - 0.769 * (1 - s)} ${0.189 - 0.189 * (1 - s)} 0 0 ` +
      `${0.349 - 0.349 * (1 - s)} ${0.686 + 0.314 * (1 - s)} ${0.168 - 0.168 * (1 - s)} 0 0 ` +
      `${0.272 - 0.272 * (1 - s)} ${0.534 - 0.534 * (1 - s)} ${0.131 + 0.869 * (1 - s)} 0 0 ` +
      `0 0 0 1 0"/>`
    );
  }

  // Hue rotate
  if (f.hueRotate !== 0) {
    parts.push(`<feColorMatrix type="hueRotate" values="${f.hueRotate}"/>`);
  }

  // Saturation
  if (f.saturation !== 0) {
    const sv = 1 + f.saturation / 100;
    parts.push(`<feColorMatrix type="saturate" values="${sv}"/>`);
  }

  return `<filter id="${id}"><feComponentTransfer>` +
    (f.brightness !== 0 ? `<feFuncR type="linear" slope="${1 + f.brightness / 100}"/>` +
      `<feFuncG type="linear" slope="${1 + f.brightness / 100}"/>` +
      `<feFuncB type="linear" slope="${1 + f.brightness / 100}"/>` : "") +
    (f.contrast !== 0 ? `<feFuncR type="linear" slope="${1 + f.contrast / 100}" intercept="${-f.contrast / 200}"/>` +
      `<feFuncG type="linear" slope="${1 + f.contrast / 100}" intercept="${-f.contrast / 200}"/>` +
      `<feFuncB type="linear" slope="${1 + f.contrast / 100}" intercept="${-f.contrast / 200}"/>` : "") +
    `</feComponentTransfer>` +
    parts.join("") +
    `</filter>`;
}

function buildClipPath(id: string, w: number, h: number, maskType: string, maskRadius: number): string {
  let shape = "";
  switch (maskType) {
    case "circle":
      shape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
      break;
    case "roundedRect":
      shape = `<rect width="${w}" height="${h}" rx="${maskRadius}" ry="${maskRadius}"/>`;
      break;
    case "diamond": {
      const pts = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
      shape = `<polygon points="${pts}"/>`;
      break;
    }
    case "star": {
      const pts = starPoints(w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) * 0.2, 5);
      shape = `<polygon points="${pts}"/>`;
      break;
    }
    case "hexagon": {
      const pts = polygonPoints(w / 2, h / 2, w / 2, h / 2, 6);
      shape = `<polygon points="${pts}"/>`;
      break;
    }
    case "heart": {
      // Approximation
      shape = `<rect width="${w}" height="${h}" rx="${Math.min(w, h) * 0.4}"/>`;
      break;
    }
    default:
      shape = `<rect width="${w}" height="${h}"/>`;
  }
  return `<clipPath id="${id}">${shape}</clipPath>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR code SVG generation
// ─────────────────────────────────────────────────────────────────────────────

function generateQrCodeSvg(qr: QRCodeObject, ctx: SvgGenerationContext): string {
  if (!qr.visible) return "";

  const shadowId = qr.shadowEnabled ? addShadowFilter(qr, ctx) : null;
  const shared = sharedAttrs(qr, shadowId);
  const transform = ` transform="${objectToSvgTransform(qr)}"`;

  // Render QR to a small canvas and get data URL
  try {
    const matrix = generateQRMatrix(qr.data, qr.errorCorrectionLevel);
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (canvas) {
      canvas.width = qr.width;
      canvas.height = qr.height;
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        drawQRToCanvas(matrix, {
          foregroundColor: qr.foregroundColor,
          backgroundColor: qr.backgroundColor,
          padding: qr.padding,
          style: qr.style,
          width: qr.width,
          height: qr.height,
        }, ctx2d);
        const dataUrl = canvas.toDataURL("image/png");
        return `<image href="${dataUrl}" x="0" y="0" width="${qr.width}" height="${qr.height}"${transform}${shared}/>`;
      }
    }
  } catch {
    // Fallback: render placeholder rect
  }

  return `<rect x="0" y="0" width="${qr.width}" height="${qr.height}" fill="${qr.backgroundColor}"${transform}${shared}/>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group SVG generation
// ─────────────────────────────────────────────────────────────────────────────

function generateGroupSvg(group: GroupObject, ctx: SvgGenerationContext): string {
  if (!group.visible) return "";

  const shadowId = group.shadowEnabled ? addShadowFilter(group, ctx) : null;
  const shared = sharedAttrs(group, shadowId);
  const transform = objectToSvgTransform(group);

  const childrenSvg = group.children
    .map((child) => generateObjectSvg(child, ctx))
    .join("\n");

  return `<g transform="${transform}"${shared}>\n${childrenSvg}\n</g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function generateObjectSvg(obj: AnyCanvasObject, ctx: SvgGenerationContext): string {
  switch (obj.type) {
    case "shape": return generateShapeSvg(obj as ShapeObject, ctx);
    case "text": return generateTextSvg(obj as TextObject, ctx);
    case "image": return generateImageSvg(obj as ImageObject, ctx);
    case "qrcode": return generateQrCodeSvg(obj as QRCodeObject, ctx);
    case "group": return generateGroupSvg(obj as GroupObject, ctx);
    default: return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

export function exportToSVG(state: {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundType: BackgroundType;
  backgroundGradient: GradientDef | null;
  backgroundPattern: PatternDef | null;
  objects: AnyCanvasObject[];
}): string {
  const { canvasWidth: w, canvasHeight: h } = state;
  const ctx = mkCtx();

  // Background fill
  let bgFill: string;
  if (state.backgroundType === "gradient" && state.backgroundGradient) {
    bgFill = `url(#${addGradient(state.backgroundGradient, ctx)})`;
  } else if (state.backgroundType === "pattern" && state.backgroundPattern) {
    bgFill = `url(#${addPatternDef(state.backgroundPattern, ctx)})`;
  } else {
    bgFill = state.backgroundColor === "transparent" ? "none" : state.backgroundColor;
  }

  // Generate all object SVGs (this also populates ctx.defs)
  const objectsSvg = state.objects.map((o) => generateObjectSvg(o, ctx)).join("\n");

  // Assemble defs
  const defsContent = ctx.defs.map((d) => d.element).join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n` +
    (defsContent ? `<defs>\n${defsContent}\n</defs>\n` : "") +
    `<rect width="${w}" height="${h}" fill="${bgFill}"/>\n` +
    objectsSvg + "\n" +
    `</svg>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function escSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
