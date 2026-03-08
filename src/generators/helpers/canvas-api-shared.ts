import type { ImageObject, TextObject, ShapeObject, MaskType } from "@/types/editor";
import { isPlainRichText } from "@/types/rich-text";
import { generateWrapRichTextCode } from "@/lib/rich-text-wrap";
import { generateShadowSetupCode } from "./generate-shadow-code";

/**
 * Generates Canvas 2D clip path commands for a given mask type.
 * The path is drawn relative to (x, y) within a (width x height) bounding box.
 */
function generateMaskClipCode(
  maskType: MaskType,
  x: number | string,
  y: number | string,
  width: number,
  height: number,
  maskRadius: number
): string[] {
  const lines: string[] = [];
  lines.push("  ctx.beginPath();");

  switch (maskType) {
    case "circle": {
      const cx = typeof x === "number" ? x + width / 2 : `${x} + ${width / 2}`;
      const cy = typeof y === "number" ? y + height / 2 : `${y} + ${height / 2}`;
      const rx = width / 2;
      const ry = height / 2;
      lines.push(`  ctx.ellipse(${cx}, ${cy}, ${rx}, ${ry}, 0, 0, Math.PI * 2);`);
      break;
    }
    case "roundedRect": {
      const r = Math.min(maskRadius, width / 2, height / 2);
      lines.push(`  ctx.roundRect(${x}, ${y}, ${width}, ${height}, ${r});`);
      break;
    }
    case "star": {
      const cx2 = typeof x === "number" ? x + width / 2 : `${x} + ${width / 2}`;
      const cy2 = typeof y === "number" ? y + height / 2 : `${y} + ${height / 2}`;
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR * 0.4;
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const radius = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / pts) * i - Math.PI / 2;
        const px = (Math.cos(angle) * radius).toFixed(2);
        const py = (Math.sin(angle) * radius).toFixed(2);
        if (i === 0) {
          lines.push(`  ctx.moveTo(${cx2} + ${px}, ${cy2} + ${py});`);
        } else {
          lines.push(`  ctx.lineTo(${cx2} + ${px}, ${cy2} + ${py});`);
        }
      }
      lines.push("  ctx.closePath();");
      break;
    }
    case "heart": {
      const topY = typeof y === "number" ? y + height * 0.3 : `${y} + ${(height * 0.3).toFixed(2)}`;
      const bottomY2 = typeof y === "number" ? y + height * 0.9 : `${y} + ${(height * 0.9).toFixed(2)}`;
      const ctrlY = typeof y === "number" ? y + height * 0.1 : `${y} + ${(height * 0.1).toFixed(2)}`;
      const midX = typeof x === "number" ? x + width / 2 : `${x} + ${width / 2}`;
      const x08 = typeof x === "number" ? x + width * 0.8 : `${x} + ${(width * 0.8).toFixed(2)}`;
      const x02 = typeof x === "number" ? x + width * 0.2 : `${x} + ${(width * 0.2).toFixed(2)}`;
      const xFull = typeof x === "number" ? x + width : `${x} + ${width}`;
      const y04 = typeof y === "number" ? y + height * 0.4 : `${y} + ${(height * 0.4).toFixed(2)}`;
      lines.push(`  ctx.moveTo(${midX}, ${topY});`);
      lines.push(`  ctx.bezierCurveTo(${x08}, ${ctrlY}, ${xFull}, ${y04}, ${midX}, ${bottomY2});`);
      lines.push(`  ctx.bezierCurveTo(${x}, ${y04}, ${x02}, ${ctrlY}, ${midX}, ${topY});`);
      lines.push("  ctx.closePath();");
      break;
    }
    case "hexagon": {
      const cx3 = typeof x === "number" ? x + width / 2 : `${x} + ${width / 2}`;
      const cy3 = typeof y === "number" ? y + height / 2 : `${y} + ${height / 2}`;
      const hexR = Math.min(width, height) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const px = (Math.cos(angle) * hexR).toFixed(2);
        const py = (Math.sin(angle) * hexR).toFixed(2);
        if (i === 0) {
          lines.push(`  ctx.moveTo(${cx3} + ${px}, ${cy3} + ${py});`);
        } else {
          lines.push(`  ctx.lineTo(${cx3} + ${px}, ${cy3} + ${py});`);
        }
      }
      lines.push("  ctx.closePath();");
      break;
    }
    case "diamond": {
      const halfW = width / 2;
      const halfH = height / 2;
      const dMidX = typeof x === "number" ? x + halfW : `${x} + ${halfW}`;
      const dMidY = typeof y === "number" ? y + halfH : `${y} + ${halfH}`;
      const dRight = typeof x === "number" ? x + width : `${x} + ${width}`;
      const dBottom = typeof y === "number" ? y + height : `${y} + ${height}`;
      lines.push(`  ctx.moveTo(${dMidX}, ${y});`);
      lines.push(`  ctx.lineTo(${dRight}, ${dMidY});`);
      lines.push(`  ctx.lineTo(${dMidX}, ${dBottom});`);
      lines.push(`  ctx.lineTo(${x}, ${dMidY});`);
      lines.push("  ctx.closePath();");
      break;
    }
  }

  lines.push("  ctx.clip();");
  return lines;
}

/**
 * Shared Canvas 2D API code generation helpers.
 * These functions generate pure Canvas 2D API code strings with no library-specific references.
 * Used by both node-canvas and skia-canvas generators.
 */

/**
 * Generates canvas 2D drawing code for an image object.
 * Handles: loadImage, save/restore, translate/rotate/scale for transforms,
 * globalAlpha, scale for flip, 9-argument drawImage for crops.
 *
 * Transform chain matches Konva's approach:
 *   translate(x, y) → rotate(r) → scale(sx, sy) → translate(-offsetX, -offsetY) → drawImage(0, 0, w, h)
 * Where offsetX = flipX ? width/2 : 0, offsetY = flipY ? height/2 : 0
 *
 * @param image - The image object to generate code for
 * @param index - 1-based index for layer comment
 * @returns String of canvas 2D drawing commands
 */
export function generateImageDrawCode(image: ImageObject, index: number): string {
  const lines: string[] = [];

  // Layer comment
  lines.push(`  // Layer ${index}: ${image.name || "Image"}`);
  lines.push("  ctx.save();");

  // Load the image
  const escapedName = image.originalName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  lines.push(`  const img${index} = await loadImage("./images/${escapedName}");`);

  // Opacity (if not 1) - set before transforms per FR-010
  const needsAlphaReset = image.opacity < 1;
  if (needsAlphaReset) {
    lines.push(`  ctx.globalAlpha = ${image.opacity};`);
  }

  // Blend mode (if not source-over)
  const needsBlendReset = image.blendMode !== "source-over";
  if (needsBlendReset) {
    lines.push(`  ctx.globalCompositeOperation = "${image.blendMode}";`);
  }

  // Shadow (if enabled)
  if (image.shadowEnabled) {
    lines.push("  " + generateShadowSetupCode(
      image.shadowColor,
      image.shadowBlur,
      image.shadowOffsetX,
      image.shadowOffsetY
    ).replace(/\n/g, "\n  "));
  }

  // Determine transform requirements
  const hasFlip = image.flipX || image.flipY;
  const hasRotation = image.rotation !== 0;
  const hasTransform = hasFlip || hasRotation;
  const hasMask = image.maskType && image.maskType !== "none";

  // Crop detection
  const hasCrop =
    image.cropX !== undefined &&
    image.cropY !== undefined &&
    image.cropWidth !== undefined &&
    image.cropHeight !== undefined;

  if (!hasTransform) {
    // Case 1: No flip, no rotation - simplest form per FR-006
    if (hasMask) {
      lines.push(...generateMaskClipCode(
        image.maskType, image.x, image.y, image.width, image.height, image.maskRadius
      ));
    }
    if (hasCrop) {
      lines.push(
        `  ctx.drawImage(img${index}, ${image.cropX}, ${image.cropY}, ${image.cropWidth}, ${image.cropHeight}, ${image.x}, ${image.y}, ${image.width}, ${image.height});`
      );
    } else {
      lines.push(`  ctx.drawImage(img${index}, ${image.x}, ${image.y}, ${image.width}, ${image.height});`);
    }
  } else if (hasFlip) {
    // Case 2: Flip (with or without rotation) - use Konva transform chain
    // Transform: position → rotate → flip → offset → draw
    lines.push("  // Transform: position → rotate → flip → offset → draw");

    const scaleX = image.flipX ? -1 : 1;
    const scaleY = image.flipY ? -1 : 1;
    const offsetX = image.flipX ? image.width / 2 : 0;
    const offsetY = image.flipY ? image.height / 2 : 0;

    // Translate to position
    lines.push(`  ctx.translate(${image.x}, ${image.y});`);

    // Rotation (if any)
    if (hasRotation) {
      const radians = (image.rotation * Math.PI) / 180;
      lines.push(`  ctx.rotate(${radians});`);
    }

    // Scale for flip
    lines.push(`  ctx.scale(${scaleX}, ${scaleY});`);

    // Translate offset for flip pivot
    lines.push(`  ctx.translate(${-offsetX}, ${-offsetY});`);

    // Clip to mask shape (in local coordinates after all transforms)
    if (hasMask) {
      lines.push(...generateMaskClipCode(
        image.maskType, 0, 0, image.width, image.height, image.maskRadius
      ));
    }

    // Draw at local origin (0, 0)
    if (hasCrop) {
      lines.push(
        `  ctx.drawImage(img${index}, ${image.cropX}, ${image.cropY}, ${image.cropWidth}, ${image.cropHeight}, 0, 0, ${image.width}, ${image.height});`
      );
    } else {
      lines.push(`  ctx.drawImage(img${index}, 0, 0, ${image.width}, ${image.height});`);
    }
  } else {
    // Case 3: Rotation only (no flip) - center-pivot rotation
    // Transform: position → center → rotate → un-center → draw
    lines.push("  // Transform: position → center → rotate → draw");

    const centerX = image.width / 2;
    const centerY = image.height / 2;
    const radians = (image.rotation * Math.PI) / 180;

    lines.push(`  ctx.translate(${image.x}, ${image.y});`);
    lines.push(`  ctx.translate(${centerX}, ${centerY});`);
    lines.push(`  ctx.rotate(${radians});`);
    lines.push(`  ctx.translate(${-centerX}, ${-centerY});`);

    // Clip to mask shape (in local coordinates after all transforms)
    if (hasMask) {
      lines.push(...generateMaskClipCode(
        image.maskType, 0, 0, image.width, image.height, image.maskRadius
      ));
    }

    if (hasCrop) {
      lines.push(
        `  ctx.drawImage(img${index}, ${image.cropX}, ${image.cropY}, ${image.cropWidth}, ${image.cropHeight}, 0, 0, ${image.width}, ${image.height});`
      );
    } else {
      lines.push(`  ctx.drawImage(img${index}, 0, 0, ${image.width}, ${image.height});`);
    }
  }

  // Reset shadow (explicit reset for code clarity)
  if (image.shadowEnabled) {
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

/**
 * Font metadata for text rendering warnings.
 */
export interface FontMeta {
  supportsItalic: boolean;
  category: "english" | "arabic";
}

/**
 * Generates canvas 2D drawing code for a rich text object.
 * Emits inline wrapRichText helper and per-chunk rendering loop.
 */
function generateRichTextDrawCode(
  text: TextObject,
  effectiveFont: string,
  index: number,
  direction: "rtl" | "ltr"
): string {
  const lines: string[] = [];
  const suffix = `_${index}`;

  lines.push(`  // Layer ${index}: ${text.name || "Text"} (rich text)`);
  lines.push("  ctx.save();");

  if (text.opacity < 1) {
    lines.push(`  ctx.globalAlpha = ${text.opacity};`);
  }
  if (text.blendMode !== "source-over") {
    lines.push(`  ctx.globalCompositeOperation = "${text.blendMode}";`);
  }
  if (text.shadowEnabled) {
    lines.push("  " + generateShadowSetupCode(
      text.shadowColor,
      text.shadowBlur,
      text.shadowOffsetX,
      text.shadowOffsetY
    ).replace(/\n/g, "\n  "));
  }

  // Transform
  lines.push(`  ctx.translate(${text.x}, ${text.y});`);
  if (text.rotation !== 0) {
    lines.push(`  ctx.rotate(${text.rotation} * Math.PI / 180);`);
  }
  if (direction === "rtl") {
    lines.push("  ctx.direction = 'rtl';");
  }

  // Parent style (used for resolution)
  const escapedFont = effectiveFont.replace(/"/g, '\\"');
  lines.push(`  const parentStyle${suffix} = {`);
  lines.push(`    fontFamily: "${escapedFont}",`);
  lines.push(`    fontSize: ${text.fontSize},`);
  lines.push(`    fontWeight: "${text.fontWeight}",`);
  lines.push(`    fontStyle: "${text.fontStyle}",`);
  lines.push(`    fill: "${text.fill}",`);
  lines.push(`    textDecoration: "${text.textDecoration}",`);
  lines.push(`    letterSpacing: ${text.letterSpacing}`);
  lines.push("  };");

  // Emit richContent as JSON
  const richContentJson = JSON.stringify(text.richContent, null, 0);
  lines.push(`  const richContent${suffix} = ${richContentJson};`);

  // Emit inline wrapRichText helper (indented for use inside async function body)
  const textWidth = text.width;
  const textLineHeight = text.lineHeight;
  const textAlign = text.textAlign;
  lines.push(`  const textWidth${suffix} = ${textWidth};`);
  lines.push(`  const lineHeight${suffix} = ${textLineHeight};`);
  lines.push(`  const textAlign${suffix} = "${textAlign}";`);
  lines.push("");
  // Emit the wrapRichText helper (uses fixed name, safe to redeclare per object)
  const wrapCode = generateWrapRichTextCode();
  lines.push(wrapCode);
  lines.push("");

  // Call the inline wrap function — signature: wrapRichText(ctx, richContent, parentStyle, maxWidth, lineHeight)
  lines.push(`  const wrappedLines${suffix} = wrapRichText(ctx, richContent${suffix}, parentStyle${suffix}, textWidth${suffix}, lineHeight${suffix});`);
  lines.push("");

  // Rendering loop
  lines.push(`  ctx.textBaseline = "top";`);
  lines.push(`  let y${suffix} = 0;`);
  lines.push(`  for (const line${suffix} of wrappedLines${suffix}) {`);
  lines.push(`    let drawX${suffix} = 0;`);
  lines.push(`    if (textAlign${suffix} === "center") drawX${suffix} = (textWidth${suffix} - line${suffix}.width) / 2;`);
  lines.push(`    else if (textAlign${suffix} === "right") drawX${suffix} = textWidth${suffix} - line${suffix}.width;`);
  lines.push(`    for (const chunk${suffix} of line${suffix}.chunks) {`);

  // Build font
  lines.push(`      const fontParts${suffix} = [];`);
  lines.push(`      if (chunk${suffix}.fontStyle === "italic") fontParts${suffix}.push("italic");`);
  lines.push(`      if (chunk${suffix}.fontWeight === "bold") fontParts${suffix}.push("bold");`);
  lines.push(`      fontParts${suffix}.push(chunk${suffix}.fontSize + "px");`);
  lines.push(`      fontParts${suffix}.push('"' + chunk${suffix}.fontFamily + '"');`);
  lines.push(`      ctx.font = fontParts${suffix}.join(" ");`);
  lines.push(`      ctx.fillStyle = chunk${suffix}.fill;`);

  // Stroke if enabled
  if (text.strokeEnabled && text.strokeWidth > 0) {
    lines.push(`      ctx.strokeStyle = "${text.strokeColor}";`);
    lines.push(`      ctx.lineWidth = ${text.strokeWidth};`);
    lines.push(`      ctx.lineJoin = "round";`);
  }

  // Render text (letter spacing aware)
  lines.push(`      if (chunk${suffix}.letterSpacing > 0) {`);
  lines.push(`        const chars${suffix} = Array.from(chunk${suffix}.text);`);
  lines.push(`        let charX${suffix} = drawX${suffix};`);
  lines.push(`        for (const char${suffix} of chars${suffix}) {`);
  if (text.strokeEnabled && text.strokeWidth > 0) {
    lines.push(`          ctx.strokeText(char${suffix}, charX${suffix}, y${suffix});`);
  }
  lines.push(`          ctx.fillText(char${suffix}, charX${suffix}, y${suffix});`);
  lines.push(`          charX${suffix} += ctx.measureText(char${suffix}).width + chunk${suffix}.letterSpacing;`);
  lines.push(`        }`);
  lines.push(`      } else {`);
  if (text.strokeEnabled && text.strokeWidth > 0) {
    lines.push(`        ctx.strokeText(chunk${suffix}.text, drawX${suffix}, y${suffix});`);
  }
  lines.push(`        ctx.fillText(chunk${suffix}.text, drawX${suffix}, y${suffix});`);
  lines.push(`      }`);

  // Text decorations
  lines.push(`      const deco${suffix} = chunk${suffix}.textDecoration;`);
  lines.push(`      if (deco${suffix} && deco${suffix} !== "none") {`);
  lines.push(`        const thickness${suffix} = Math.max(1, Math.round(chunk${suffix}.fontSize / 20));`);
  lines.push(`        ctx.fillStyle = chunk${suffix}.fill;`);
  lines.push(`        if (deco${suffix}.includes("underline")) {`);
  lines.push(`          ctx.fillRect(drawX${suffix}, y${suffix} + chunk${suffix}.fontSize * 1.1, chunk${suffix}.width, thickness${suffix});`);
  lines.push(`        }`);
  lines.push(`        if (deco${suffix}.includes("line-through")) {`);
  lines.push(`          ctx.fillRect(drawX${suffix}, y${suffix} + chunk${suffix}.fontSize * 0.5, chunk${suffix}.width, thickness${suffix});`);
  lines.push(`        }`);
  lines.push(`      }`);

  lines.push(`      drawX${suffix} += chunk${suffix}.width;`);
  lines.push(`    }`);
  lines.push(`    y${suffix} += line${suffix}.height;`);
  lines.push(`  }`);

  if (text.shadowEnabled) {
    lines.push("  ctx.shadowColor = 'transparent';");
    lines.push("  ctx.shadowBlur = 0;");
    lines.push("  ctx.shadowOffsetX = 0;");
    lines.push("  ctx.shadowOffsetY = 0;");
  }
  lines.push("  ctx.restore();");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates canvas 2D drawing code for a curved text object (arc, circle, or wave path).
 * Each character is positioned using save/translate/rotate/fillText/restore.
 * Includes an inline helper function for the character positioning math.
 */
function generateCurvedTextDrawCode(
  text: TextObject,
  effectiveFont: string,
  index: number
): string {
  const lines: string[] = [];
  const pathType = text.textPathType ?? "arc";
  const escapedFont = effectiveFont.replace(/"/g, '\\"');

  lines.push(`  // Layer ${index}: ${text.name || "Text"} (curved path: ${pathType})`);
  lines.push("  ctx.save();");

  if (text.opacity < 1) {
    lines.push(`  ctx.globalAlpha = ${text.opacity};`);
  }
  if (text.blendMode !== "source-over") {
    lines.push(`  ctx.globalCompositeOperation = "${text.blendMode}";`);
  }
  if (text.shadowEnabled) {
    lines.push("  " + generateShadowSetupCode(
      text.shadowColor, text.shadowBlur, text.shadowOffsetX, text.shadowOffsetY
    ).replace(/\n/g, "\n  "));
  }

  const fontParts: string[] = [];
  if (text.fontStyle === "italic") fontParts.push("italic");
  if (text.fontWeight === "bold") fontParts.push("bold");
  fontParts.push(`${text.fontSize}px`);
  fontParts.push(`"${escapedFont}"`);
  const fontShorthand = fontParts.join(" ");

  // Translate to text center
  const cx = text.x + text.width / 2;
  const cy = text.y + text.height / 2;
  if (text.rotation !== 0) {
    const radians = (text.rotation * Math.PI) / 180;
    lines.push(`  ctx.translate(${cx}, ${cy});`);
    lines.push(`  ctx.rotate(${radians});`);
  } else {
    lines.push(`  ctx.translate(${cx}, ${cy});`);
  }

  lines.push(`  ctx.font = '${fontShorthand}';`);
  lines.push(`  ctx.textBaseline = "middle";`);
  lines.push(`  ctx.fillStyle = "${text.fill}";`);
  lines.push("");

  // Inline character splitting and measurement
  lines.push(`  const chars_${index} = Array.from(${JSON.stringify(text.content)});`);
  lines.push(`  const widths_${index} = chars_${index}.map(c => ctx.measureText(c).width);`);

  // Generate position computation based on path type
  if (pathType === "arc") {
    const r = text.textPathRadius ?? 300;
    const dir = text.textPathDirection ?? "up";
    const startDeg = text.textPathStartAngle ?? 0;
    const ls = text.letterSpacing;
    lines.push(`  // Arc path: radius=${r}, direction="${dir}", startAngle=${startDeg}°`);
    lines.push(`  const totalW_${index} = widths_${index}.reduce((s, w) => s + w, 0) + Math.max(0, chars_${index}.length - 1) * ${ls};`);
    lines.push(`  const totalAngle_${index} = totalW_${index} / ${r};`);
    lines.push(`  const startAngleRad_${index} = (${startDeg} * Math.PI / 180) - totalAngle_${index} / 2;`);
    lines.push(`  let curAngle_${index} = startAngleRad_${index};`);
    lines.push(`  for (let i = 0; i < chars_${index}.length; i++) {`);
    lines.push(`    const span = widths_${index}[i] / ${r};`);
    lines.push(`    const angle = curAngle_${index} + span / 2;`);
    if (dir === "up") {
      lines.push(`    const px = ${r} * Math.sin(angle);`);
      lines.push(`    const py = ${r} - ${r} * Math.cos(angle);`);
      lines.push(`    const rot = angle;`);
    } else {
      lines.push(`    const px = ${r} * Math.sin(angle);`);
      lines.push(`    const py = -${r} + ${r} * Math.cos(angle);`);
      lines.push(`    const rot = angle + Math.PI;`);
    }
    lines.push(`    ctx.save();`);
    lines.push(`    ctx.translate(px, py);`);
    lines.push(`    ctx.rotate(rot);`);
    if (text.strokeEnabled && text.strokeWidth > 0) {
      lines.push(`    ctx.strokeStyle = "${text.strokeColor}";`);
      lines.push(`    ctx.lineWidth = ${text.strokeWidth};`);
      lines.push(`    ctx.strokeText(chars_${index}[i], 0, 0);`);
    }
    lines.push(`    ctx.fillText(chars_${index}[i], 0, 0);`);
    lines.push(`    ctx.restore();`);
    lines.push(`    curAngle_${index} += span + ${ls} / ${r};`);
    lines.push(`  }`);
  } else if (pathType === "circle") {
    const r = text.textPathRadius ?? 150;
    const startDeg = text.textPathStartAngle ?? 0;
    const cw = text.textPathClockwise ?? true;
    const ls = text.letterSpacing;
    const dir = cw ? 1 : -1;
    lines.push(`  // Circle path: radius=${r}, startAngle=${startDeg}°, clockwise=${cw}`);
    lines.push(`  let curAngle_${index} = (${startDeg} - 90) * Math.PI / 180;`);
    lines.push(`  for (let i = 0; i < chars_${index}.length; i++) {`);
    lines.push(`    const span = (widths_${index}[i] / ${r}) * ${dir};`);
    lines.push(`    const angle = curAngle_${index} + span / 2;`);
    lines.push(`    const px = ${r} * Math.cos(angle);`);
    lines.push(`    const py = ${r} * Math.sin(angle);`);
    lines.push(`    const rot = angle + Math.PI / 2;`);
    lines.push(`    ctx.save();`);
    lines.push(`    ctx.translate(px, py);`);
    lines.push(`    ctx.rotate(rot);`);
    if (text.strokeEnabled && text.strokeWidth > 0) {
      lines.push(`    ctx.strokeStyle = "${text.strokeColor}";`);
      lines.push(`    ctx.lineWidth = ${text.strokeWidth};`);
      lines.push(`    ctx.strokeText(chars_${index}[i], 0, 0);`);
    }
    lines.push(`    ctx.fillText(chars_${index}[i], 0, 0);`);
    lines.push(`    ctx.restore();`);
    lines.push(`    curAngle_${index} += span + (${ls} / ${r}) * ${dir};`);
    lines.push(`  }`);
  } else if (pathType === "wave") {
    const amp = text.textPathAmplitude ?? 30;
    const wl = text.textPathWavelength ?? 200;
    const phaseDeg = text.textPathPhase ?? 0;
    const ls = text.letterSpacing;
    lines.push(`  // Wave path: amplitude=${amp}, wavelength=${wl}, phase=${phaseDeg}°`);
    lines.push(`  const totalW_${index} = widths_${index}.reduce((s, w) => s + w, 0) + Math.max(0, chars_${index}.length - 1) * ${ls};`);
    lines.push(`  let curX_${index} = -totalW_${index} / 2;`);
    lines.push(`  const phaseRad_${index} = ${phaseDeg} * Math.PI / 180;`);
    lines.push(`  for (let i = 0; i < chars_${index}.length; i++) {`);
    lines.push(`    const charX = curX_${index} + widths_${index}[i] / 2;`);
    lines.push(`    const arg = charX * 2 * Math.PI / ${wl} + phaseRad_${index};`);
    lines.push(`    const py = ${amp} * Math.sin(arg);`);
    lines.push(`    const deriv = ${amp} * (2 * Math.PI / ${wl}) * Math.cos(arg);`);
    lines.push(`    const rot = Math.atan2(deriv, 1);`);
    lines.push(`    ctx.save();`);
    lines.push(`    ctx.translate(charX, py);`);
    lines.push(`    ctx.rotate(rot);`);
    if (text.strokeEnabled && text.strokeWidth > 0) {
      lines.push(`    ctx.strokeStyle = "${text.strokeColor}";`);
      lines.push(`    ctx.lineWidth = ${text.strokeWidth};`);
      lines.push(`    ctx.strokeText(chars_${index}[i], 0, 0);`);
    }
    lines.push(`    ctx.fillText(chars_${index}[i], 0, 0);`);
    lines.push(`    ctx.restore();`);
    lines.push(`    curX_${index} += widths_${index}[i] + ${ls};`);
    lines.push(`  }`);
  }

  if (text.shadowEnabled) {
    lines.push("  ctx.shadowColor = 'transparent';");
    lines.push("  ctx.shadowBlur = 0;");
  }
  if (text.blendMode !== "source-over") {
    lines.push("  ctx.globalCompositeOperation = 'source-over';");
  }
  if (text.opacity < 1) {
    lines.push("  ctx.globalAlpha = 1;");
  }
  lines.push("  ctx.restore();");
  lines.push("");
  return lines.join("\n");
}

/**
 * Generates canvas 2D drawing code for a text object.
 * Handles: CSS font shorthand, fill, alignment, RTL direction,
 * stroke before fill, character-by-character letter spacing,
 * manual text decoration drawing.
 *
 * @param text - The text object to generate code for
 * @param effectiveFont - The resolved font family name
 * @param index - 1-based index for layer comment
 * @param direction - Text direction ("rtl" or "ltr")
 * @param fontMeta - Optional font metadata for Arabic italic warnings
 * @returns String of canvas 2D drawing commands
 */
export function generateTextDrawCode(
  text: TextObject,
  effectiveFont: string,
  index: number,
  direction: "rtl" | "ltr",
  fontMeta?: FontMeta
): string {
  const lines: string[] = [];

  // Skip empty text
  if (!text.content) {
    lines.push(`  // Layer ${index}: ${text.name || "Text"} (skipped - empty content)`);
    lines.push("");
    return lines.join("\n");
  }

  // Use curved text path when textPathType is set
  if (text.textPathType && text.textPathType !== "none") {
    return generateCurvedTextDrawCode(text, effectiveFont, index);
  }

  // Use rich text path when richContent has style overrides
  if (text.richContent && !isPlainRichText(text.richContent)) {
    return generateRichTextDrawCode(text, effectiveFont, index, direction);
  }

  // Layer comment
  lines.push(`  // Layer ${index}: ${text.name || "Text"}`);
  lines.push("  ctx.save();");

  // Opacity (if not 1)
  const needsAlphaReset = text.opacity < 1;
  if (needsAlphaReset) {
    lines.push(`  ctx.globalAlpha = ${text.opacity};`);
  }

  // Blend mode (if not source-over)
  const needsBlendReset = text.blendMode !== "source-over";
  if (needsBlendReset) {
    lines.push(`  ctx.globalCompositeOperation = "${text.blendMode}";`);
  }

  // Shadow (if enabled)
  if (text.shadowEnabled) {
    lines.push("  " + generateShadowSetupCode(
      text.shadowColor,
      text.shadowBlur,
      text.shadowOffsetX,
      text.shadowOffsetY
    ).replace(/\n/g, "\n  "));
  }

  // Build CSS font shorthand: "[font-style] [font-weight] font-size font-family"
  // Order per CSS spec: style before weight, omit "normal" tokens
  const escapedFont = effectiveFont.replace(/"/g, '\\"');
  const fontParts: string[] = [];
  if (text.fontStyle === "italic") {
    fontParts.push("italic");
  }
  if (text.fontWeight === "bold") {
    fontParts.push("bold");
  }
  fontParts.push(`${text.fontSize}px`);
  fontParts.push(`"${escapedFont}"`);
  const fontShorthand = fontParts.join(" ");
  lines.push(`  ctx.font = '${fontShorthand}';`);

  // Arabic italic warning (when using italic on a font without native italic support)
  if (text.fontStyle === "italic" && fontMeta?.category === "arabic" && fontMeta?.supportsItalic === false) {
    lines.push(`  // Note: ${effectiveFont} does not have a native italic variant.`);
    lines.push(`  // Italic is simulated (oblique) and may not render correctly for Arabic text.`);
  }

  // Fill color
  lines.push(`  ctx.fillStyle = "${text.fill}";`);

  // Text alignment
  lines.push(`  ctx.textAlign = "${text.textAlign}";`);
  lines.push(`  ctx.textBaseline = "top";`);

  // RTL direction
  if (direction === "rtl") {
    lines.push(`  ctx.direction = "rtl";`);
  }

  // Rotation setup - translate to position, then rotate around text center
  // Use text.height for centerY to account for wrapped multi-line content
  if (text.rotation !== 0) {
    const centerX = text.width / 2;
    const centerY = text.height / 2;
    const radians = (text.rotation * Math.PI) / 180;
    lines.push(`  ctx.translate(${text.x}, ${text.y});`);
    lines.push(`  ctx.translate(${centerX}, ${centerY});`);
    lines.push(`  ctx.rotate(${radians});`);
    lines.push(`  ctx.translate(${-centerX}, ${-centerY});`);
  } else {
    lines.push(`  ctx.translate(${text.x}, ${text.y});`);
  }

  // Stroke setup (if enabled)
  if (text.strokeEnabled && text.strokeWidth > 0) {
    lines.push(`  ctx.strokeStyle = "${text.strokeColor}";`);
    lines.push(`  ctx.lineWidth = ${text.strokeWidth};`);
    lines.push(`  ctx.lineJoin = "round";`);
    lines.push(`  ctx.miterLimit = 2;`);
  }

  // Escape text content for JavaScript string
  const escapedContent = text.content
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  // Generate inline wrapText helper for multi-line text support
  lines.push(`  // Text wrapping helper`);
  lines.push(`  function measureTextWidth${index}(ctx, text, letterSpacing) {`);
  lines.push(`    return ctx.measureText(text).width + Math.max(0, Array.from(text).length - 1) * letterSpacing;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  function wrapText${index}(ctx, text, maxWidth, letterSpacing) {`);
  lines.push(`    if (maxWidth <= 0) return [text];`);
  lines.push(`    const paragraphs = text.split("\\n");`);
  lines.push(`    const allLines = [];`);
  lines.push(`    for (const para of paragraphs) {`);
  lines.push(`      if (para === "") { allLines.push(""); continue; }`);
  lines.push(`      const words = para.split(" ");`);
  lines.push(`      let currentLine = "";`);
  lines.push(`      for (const word of words) {`);
  lines.push(`        const testLine = currentLine ? currentLine + " " + word : word;`);
  lines.push(`        const testWidth = measureTextWidth${index}(ctx, testLine, letterSpacing);`);
  lines.push(`        if (testWidth > maxWidth && currentLine !== "") {`);
  lines.push(`          allLines.push(currentLine);`);
  lines.push(`          currentLine = word;`);
  lines.push(`          // Character-level breaking for oversized words`);
  lines.push(`          if (measureTextWidth${index}(ctx, word, letterSpacing) > maxWidth) {`);
  lines.push(`            const chars = [];`);
  lines.push(`            let charLine = "";`);
  lines.push(`            for (const char of Array.from(word)) {`);
  lines.push(`              const testCharLine = charLine + char;`);
  lines.push(`              if (measureTextWidth${index}(ctx, testCharLine, letterSpacing) > maxWidth && charLine !== "") {`);
  lines.push(`                chars.push(charLine);`);
  lines.push(`                charLine = char;`);
  lines.push(`              } else {`);
  lines.push(`                charLine = testCharLine;`);
  lines.push(`              }`);
  lines.push(`            }`);
  lines.push(`            if (charLine) chars.push(charLine);`);
  lines.push(`            allLines.push(...chars.slice(0, -1));`);
  lines.push(`            currentLine = chars[chars.length - 1] || "";`);
  lines.push(`          }`);
  lines.push(`        } else {`);
  lines.push(`          currentLine = testLine;`);
  lines.push(`        }`);
  lines.push(`      }`);
  lines.push(`      if (currentLine) allLines.push(currentLine);`);
  lines.push(`    }`);
  lines.push(`    return allLines.length ? allLines : [""];`);
  lines.push(`  }`);
  lines.push(``);

  // Generate lines array from wrapped text
  lines.push(`  const lines${index} = wrapText${index}(ctx, "${escapedContent}", ${text.width}, ${text.letterSpacing});`);
  lines.push(``);

  // Calculate drawX based on textAlign
  // For textAlign: "left" → 0, "center" → width/2, "right" → width
  let drawXValue: string;
  if (text.textAlign === "center") {
    drawXValue = `${text.width / 2}`;
  } else if (text.textAlign === "right") {
    drawXValue = `${text.width}`;
  } else {
    drawXValue = "0";
  }
  lines.push(`  const drawX${index} = ${drawXValue};`);
  lines.push(``);

  // Decoration thickness variable (proportional to fontSize, minimum 1px)
  const hasDecoration = text.textDecoration && (text.textDecoration.includes("underline") || text.textDecoration.includes("line-through"));
  if (hasDecoration) {
    lines.push(`  const decoThickness${index} = Math.max(1, Math.round(${text.fontSize} / 20));`);
    lines.push(``);
  }

  // Multi-line rendering loop with lineHeight spacing
  lines.push(`  for (let i = 0; i < lines${index}.length; i++) {`);
  lines.push(`    const lineY${index} = i * (${text.fontSize} * ${text.lineHeight});`);
  lines.push(`    const lineText${index} = lines${index}[i];`);

  if (text.letterSpacing > 0) {
    // Character-by-character rendering when letterSpacing > 0
    // Note: Emoji rendering requires an emoji font installed on the system.
    // On Linux: sudo apt install fonts-noto-color-emoji
    lines.push(`    let charX${index} = drawX${index};`);
    lines.push(`    const chars${index} = Array.from(lineText${index});`);
    lines.push(`    for (let j = 0; j < chars${index}.length; j++) {`);
    lines.push(`      const char${index} = chars${index}[j];`);
    if (text.strokeEnabled && text.strokeWidth > 0) {
      lines.push(`      ctx.strokeText(char${index}, charX${index}, lineY${index});`);
    }
    lines.push(`      ctx.fillText(char${index}, charX${index}, lineY${index});`);
    lines.push(`      charX${index} += ctx.measureText(char${index}).width + ${text.letterSpacing};`);
    lines.push(`    }`);
  } else {
    // Simple fillText per line when letterSpacing = 0
    if (text.strokeEnabled && text.strokeWidth > 0) {
      lines.push(`    ctx.strokeText(lineText${index}, drawX${index}, lineY${index});`);
    }
    lines.push(`    ctx.fillText(lineText${index}, drawX${index}, lineY${index});`);
  }

  // Per-line text decoration drawing
  if (hasDecoration) {
    const textDecoration = text.textDecoration!;

    lines.push(`    // Per-line decoration`);
    lines.push(`    if (lineText${index} !== "") {`);

    // Calculate line width based on letterSpacing
    if (text.letterSpacing > 0) {
      lines.push(`      const lineW${index} = measureTextWidth${index}(ctx, lineText${index}, ${text.letterSpacing});`);
    } else {
      lines.push(`      const lineW${index} = ctx.measureText(lineText${index}).width;`);
    }

    // Calculate decoration X position based on textAlign
    if (text.textAlign === "center") {
      lines.push(`      const decoX${index} = drawX${index} - lineW${index} / 2;`);
    } else if (text.textAlign === "right") {
      lines.push(`      const decoX${index} = drawX${index} - lineW${index};`);
    } else {
      lines.push(`      const decoX${index} = drawX${index};`);
    }

    // Underline: just below character bottom (lineY + fontSize + fontSize * 0.1)
    if (textDecoration.includes("underline")) {
      lines.push(`      ctx.fillRect(decoX${index}, lineY${index} + ${text.fontSize} + ${text.fontSize * 0.1}, lineW${index}, decoThickness${index});`);
    }

    // Line-through: at vertical center of characters (lineY + fontSize * 0.5)
    if (textDecoration.includes("line-through")) {
      lines.push(`      ctx.fillRect(decoX${index}, lineY${index} + ${text.fontSize * 0.5}, lineW${index}, decoThickness${index});`);
    }

    lines.push(`    }`);
  }

  lines.push(`  }`);
  lines.push(``);

  // Reset shadow (explicit reset for code clarity)
  if (text.shadowEnabled) {
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

/**
 * Generates canvas 2D drawing code for a shape object.
 * Handles all 8 shape types with fill, stroke, cornerRadius, rotation, opacity.
 *
 * @param shape - The shape object to generate code for
 * @param index - 1-based index for layer comment
 * @returns String of canvas 2D drawing commands
 */
export function generateShapeDrawCode(shape: ShapeObject, index: number): string {
  const lines: string[] = [];

  // Layer comment
  lines.push(`  // Layer ${index}: ${shape.name || `Shape (${shape.shapeType})`}`);
  lines.push("  ctx.save();");

  // Opacity (if not 1)
  const needsAlphaReset = shape.opacity < 1;
  if (needsAlphaReset) {
    lines.push(`  ctx.globalAlpha = ${shape.opacity};`);
  }

  // Blend mode (if not source-over)
  const needsBlendReset = shape.blendMode !== "source-over";
  if (needsBlendReset) {
    lines.push(`  ctx.globalCompositeOperation = "${shape.blendMode}";`);
  }

  // Shadow (if enabled)
  if (shape.shadowEnabled) {
    lines.push("  " + generateShadowSetupCode(
      shape.shadowColor,
      shape.shadowBlur,
      shape.shadowOffsetX,
      shape.shadowOffsetY
    ).replace(/\n/g, "\n  "));
  }

  // Translate to center for rotation
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  lines.push(`  ctx.translate(${centerX}, ${centerY});`);

  // Rotation around center (if not 0)
  if (shape.rotation !== 0) {
    const radians = (shape.rotation * Math.PI) / 180;
    lines.push(`  ctx.rotate(${radians});`);
  }

  // Fill and stroke settings
  lines.push(`  ctx.fillStyle = "${shape.fill}";`);
  lines.push(`  ctx.strokeStyle = "${shape.stroke}";`);
  lines.push(`  ctx.lineWidth = ${shape.strokeWidth};`);

  // Half dimensions for centered drawing
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;

  // Shape-specific drawing
  switch (shape.shapeType) {
    case "rect":
      generateRectCode(lines, shape, halfW, halfH);
      break;
    case "circle":
      generateCircleCode(lines, halfW, halfH);
      break;
    case "triangle":
      generateTriangleCode(lines, halfW, halfH);
      break;
    case "star":
      generateStarCode(lines, shape, halfW, halfH);
      break;
    case "arrow":
      generateArrowCode(lines, shape, halfW, halfH);
      break;
    case "line":
      generateLineCode(lines, shape, halfW, halfH);
      break;
    case "polygon":
      generatePolygonCode(lines, shape, halfW, halfH);
      break;
      case "diamond":
        generateDiamondCode(lines, halfW, halfH);
        break;

      case "icon":
        if (shape.svgPath) {
          generateIconCode(lines, shape, halfW, halfH);
        }
        break;

      case "custom":
        if (shape.customPath) {
          generateCustomShapeCode(lines, shape);
        }
        break;
    }

  // Reset shadow (explicit reset for code clarity)
  if (shape.shadowEnabled) {
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

/**
 * Generates code for rectangle shape (with optional corner radius).
 */
function generateRectCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  const cornerRadius = shape.cornerRadius || 0;

  if (cornerRadius > 0) {
    // Use roundRect for rounded corners
    lines.push("  ctx.beginPath();");
    lines.push(
      `  ctx.roundRect(${-halfW}, ${-halfH}, ${shape.width}, ${shape.height}, ${cornerRadius});`
    );
    lines.push("  ctx.fill();");
    if (shape.strokeWidth > 0) {
      lines.push("  ctx.stroke();");
    }
  } else {
    // Standard fillRect/strokeRect for sharp corners
    lines.push(`  ctx.fillRect(${-halfW}, ${-halfH}, ${shape.width}, ${shape.height});`);
    if (shape.strokeWidth > 0) {
      lines.push(`  ctx.strokeRect(${-halfW}, ${-halfH}, ${shape.width}, ${shape.height});`);
    }
  }
}

/**
 * Generates code for circle/ellipse shape.
 */
function generateCircleCode(lines: string[], halfW: number, halfH: number): void {
  lines.push("  ctx.beginPath();");
  lines.push(`  ctx.ellipse(0, 0, ${halfW}, ${halfH}, 0, 0, Math.PI * 2);`);
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for triangle shape (3-point path).
 */
function generateTriangleCode(lines: string[], halfW: number, halfH: number): void {
  lines.push("  ctx.beginPath();");
  lines.push(`  ctx.moveTo(0, ${-halfH});`); // Top center
  lines.push(`  ctx.lineTo(${-halfW}, ${halfH});`); // Bottom left
  lines.push(`  ctx.lineTo(${halfW}, ${halfH});`); // Bottom right
  lines.push("  ctx.closePath();");
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for star shape.
 */
function generateStarCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  const sides = shape.sides || 5;
  const outerRadius = Math.min(halfW, halfH);
  const inner = shape.innerRadius ?? outerRadius * 0.4;

  lines.push("  ctx.beginPath();");

  for (let i = 0; i < sides * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : inner;
    const angle = (Math.PI / sides) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      lines.push(`  ctx.moveTo(${x.toFixed(2)}, ${y.toFixed(2)});`);
    } else {
      lines.push(`  ctx.lineTo(${x.toFixed(2)}, ${y.toFixed(2)});`);
    }
  }

  lines.push("  ctx.closePath();");
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for arrow shape (line shaft with triangular arrowhead).
 */
function generateArrowCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  // Horizontal arrow pointing right
  const arrowHeadSize = Math.min(halfW, halfH) * 0.4;

  lines.push("  ctx.beginPath();");
  // Shaft
  lines.push(`  ctx.moveTo(${-halfW}, 0);`);
  lines.push(`  ctx.lineTo(${halfW - arrowHeadSize}, 0);`);
  // Arrowhead
  lines.push(`  ctx.lineTo(${halfW - arrowHeadSize}, ${-arrowHeadSize});`);
  lines.push(`  ctx.lineTo(${halfW}, 0);`);
  lines.push(`  ctx.lineTo(${halfW - arrowHeadSize}, ${arrowHeadSize});`);
  lines.push(`  ctx.lineTo(${halfW - arrowHeadSize}, 0);`);
  lines.push("  ctx.closePath();");
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for simple line shape.
 */
function generateLineCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  lines.push("  ctx.beginPath();");
  lines.push(`  ctx.moveTo(${-halfW}, ${-halfH});`);
  lines.push(`  ctx.lineTo(${halfW}, ${halfH});`);
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for polygon shape (N sides).
 */
function generatePolygonCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  const sides = shape.sides || 6;
  const radius = Math.min(halfW, halfH);

  lines.push("  ctx.beginPath();");

  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      lines.push(`  ctx.moveTo(${x.toFixed(2)}, ${y.toFixed(2)});`);
    } else {
      lines.push(`  ctx.lineTo(${x.toFixed(2)}, ${y.toFixed(2)});`);
    }
  }

  lines.push("  ctx.closePath();");
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for diamond shape (4 midpoints of bounding box edges).
 */
function generateDiamondCode(lines: string[], halfW: number, halfH: number): void {
  lines.push("  ctx.beginPath();");
  lines.push(`  ctx.moveTo(0, ${-halfH});`); // Top
  lines.push(`  ctx.lineTo(${halfW}, 0);`); // Right
  lines.push(`  ctx.lineTo(0, ${halfH});`); // Bottom
  lines.push(`  ctx.lineTo(${-halfW}, 0);`); // Left
  lines.push("  ctx.closePath();");
  lines.push("  ctx.fill();");
  lines.push("  ctx.stroke();");
}

/**
 * Generates code for a custom pen-tool shape using SVG path data.
 * Uses the applySvgPath() runtime helper instead of Path2D (not available in node-canvas).
 */
function generateCustomShapeCode(lines: string[], shape: ShapeObject): void {
  const origW = shape.customPathOriginalWidth ?? shape.width;
  const origH = shape.customPathOriginalHeight ?? shape.height;
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  const scaleX = origW > 0 ? (shape.width / origW).toFixed(6) : "1";
  const scaleY = origH > 0 ? (shape.height / origH).toFixed(6) : "1";
  const escapedPath = (shape.customPath ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  lines.push(`  // Custom shape path (original size: ${origW}×${origH})`);
  lines.push(`  ctx.translate(${-halfW}, ${-halfH});`);
  lines.push(`  ctx.scale(${scaleX}, ${scaleY});`);
  lines.push(`  applySvgPath(ctx, "${escapedPath}");`);

  if (shape.fill !== "transparent") {
    lines.push(`  ctx.fill();`);
  }
  if (shape.strokeWidth > 0) {
    lines.push(`  ctx.lineCap = "round";`);
    lines.push(`  ctx.lineJoin = "round";`);
    lines.push(`  ctx.stroke();`);
  }
}

/**
 * Generates code for icon shape (SVG path scaled from 24x24 Lucide viewbox).
 * Uses the applySvgPath() runtime helper instead of Path2D (not available in node-canvas).
 */
function generateIconCode(
  lines: string[],
  shape: ShapeObject,
  halfW: number,
  halfH: number
): void {
  const escapedPath = (shape.svgPath ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const scaleX = (shape.width / 24).toFixed(4);
  const scaleY = (shape.height / 24).toFixed(4);

  lines.push(`  ctx.translate(${-halfW}, ${-halfH});`);
  lines.push(`  ctx.scale(${scaleX}, ${scaleY});`);
  lines.push(`  applySvgPath(ctx, "${escapedPath}");`);
  lines.push(`  ctx.strokeStyle = "${shape.fill}";`);
  lines.push(`  ctx.lineWidth = 2;`);
  lines.push(`  ctx.lineCap = "round";`);
  lines.push(`  ctx.lineJoin = "round";`);
  lines.push(`  ctx.stroke();`);
  if (shape.strokeWidth > 0) {
    lines.push(`  ctx.strokeStyle = "${shape.stroke}";`);
    lines.push(`  ctx.lineWidth = ${shape.strokeWidth};`);
    lines.push(`  ctx.stroke();`);
  }
}
