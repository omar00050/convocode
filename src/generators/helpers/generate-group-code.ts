import type { GroupObject, ImageObject, TextObject, ShapeObject } from "@/types/editor";
import { generateImageDrawCode, generateTextDrawCode, generateShapeDrawCode } from "./canvas-api-shared";

// Minimal text draw wrapper that resolves font to "Arial" for group children
// (full font resolution requires EditorState which is not available in a pure helper)
function drawTextInGroup(text: TextObject, index: number): string {
  const effectiveFont = text.fontFamily ?? "Arial";
  const direction = text.direction === "rtl" ? "rtl" : "ltr";
  return generateTextDrawCode(text, effectiveFont, index, direction);
}

/**
 * Generates Canvas 2D code for a GroupObject using ctx.save()/restore() with nested transforms.
 * Children coordinates are relative to the group origin.
 */
export function generateGroupCode(
  group: GroupObject,
  index: number,
  childStartIndex: number = 0
): string {
  const lines: string[] = [];

  lines.push(`  // Group ${index}: ${group.name || "Group"}`);
  lines.push("  ctx.save();");

  if (group.opacity < 1) {
    lines.push(`  ctx.globalAlpha *= ${group.opacity};`);
  }

  if (group.blendMode !== "source-over") {
    lines.push(`  ctx.globalCompositeOperation = "${group.blendMode}";`);
  }

  lines.push(`  ctx.translate(${group.x}, ${group.y});`);

  if (group.rotation !== 0) {
    const radians = (group.rotation * Math.PI) / 180;
    lines.push(`  ctx.rotate(${radians.toFixed(6)});`);
  }

  let childIdx = childStartIndex;
  for (const child of group.children) {
    childIdx++;
    if (child.type === "group") {
      lines.push(generateGroupCode(child as GroupObject, childIdx, childIdx * 10));
    } else if (child.type === "image") {
      lines.push(generateImageDrawCode(child as ImageObject, childIdx));
    } else if (child.type === "text") {
      lines.push(drawTextInGroup(child as TextObject, childIdx));
    } else if (child.type === "shape") {
      lines.push(generateShapeDrawCode(child as ShapeObject, childIdx));
    }
  }

  lines.push("  ctx.restore();");
  lines.push(`  // End Group ${index}`);

  return lines.join("\n");
}

/**
 * Collects all image objects from a group recursively (for image pre-loading).
 */
export function collectGroupImages(group: GroupObject): ImageObject[] {
  const images: ImageObject[] = [];
  for (const child of group.children) {
    if (child.type === "image") {
      images.push(child as ImageObject);
    } else if (child.type === "group") {
      images.push(...collectGroupImages(child as GroupObject));
    }
  }
  return images;
}

/**
 * Collects all text objects from a group recursively (for font registration).
 */
export function collectGroupTextObjects(group: GroupObject): TextObject[] {
  const texts: TextObject[] = [];
  for (const child of group.children) {
    if (child.type === "text") {
      texts.push(child as TextObject);
    } else if (child.type === "group") {
      texts.push(...collectGroupTextObjects(child as GroupObject));
    }
  }
  return texts;
}
