import type { AnyCanvasObject, GroupObject } from "@/types/editor";

export interface GroupTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface FlattenedChild {
  object: AnyCanvasObject;
  transform: GroupTransform;
}

/**
 * Computes the axis-aligned bounding box of an array of objects.
 */
export function getGroupBounds(
  children: AnyCanvasObject[]
): { x: number; y: number; width: number; height: number } {
  if (children.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Creates a GroupObject from a list of objects.
 * Children positions are converted to be relative to the group's origin.
 */
export function createGroup(
  objects: AnyCanvasObject[],
  groupNumber: number
): GroupObject {
  const bounds = getGroupBounds(objects);

  const children: AnyCanvasObject[] = objects.map((obj) => ({
    ...obj,
    x: obj.x - bounds.x,
    y: obj.y - bounds.y,
  }));

  return {
    id: crypto.randomUUID(),
    type: "group",
    name: `Group ${groupNumber}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    shadowEnabled: false,
    shadowColor: "#00000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    blendMode: "source-over",
    children,
  };
}

/**
 * Dissolves a group, converting children back to absolute positions.
 */
export function ungroupObject(group: GroupObject): AnyCanvasObject[] {
  return group.children.map((child) => ({
    ...child,
    x: group.x + child.x,
    y: group.y + child.y,
  }));
}

/**
 * Returns the maximum nesting depth of a canvas object (0 for non-groups).
 */
export function getGroupNestingDepth(obj: AnyCanvasObject): number {
  if (obj.type !== "group") return 0;
  const group = obj as GroupObject;
  if (group.children.length === 0) return 1;
  return 1 + Math.max(...group.children.map(getGroupNestingDepth));
}

/**
 * Returns true if grouping these objects would not exceed depth 3.
 */
export function canGroup(objects: AnyCanvasObject[]): boolean {
  const maxChildDepth = Math.max(...objects.map(getGroupNestingDepth));
  return maxChildDepth < 3;
}

/**
 * Flattens a group tree into leaf objects with accumulated absolute transforms.
 * Used by sharp/jimp generators which need flat compositing.
 */
export function flattenGroupForRendering(
  group: GroupObject,
  parentTransform?: GroupTransform
): FlattenedChild[] {
  const baseTransform: GroupTransform = {
    x: group.x,
    y: group.y,
    rotation: group.rotation,
    scaleX: group.width > 0 ? group.width / group.width : 1,
    scaleY: group.height > 0 ? group.height / group.height : 1,
    opacity: group.opacity,
  };

  const effectiveTransform: GroupTransform = parentTransform
    ? {
        x: parentTransform.x + group.x * parentTransform.scaleX,
        y: parentTransform.y + group.y * parentTransform.scaleY,
        rotation: parentTransform.rotation + group.rotation,
        scaleX: parentTransform.scaleX * baseTransform.scaleX,
        scaleY: parentTransform.scaleY * baseTransform.scaleY,
        opacity: parentTransform.opacity * group.opacity,
      }
    : baseTransform;

  const result: FlattenedChild[] = [];

  for (const child of group.children) {
    if (child.type === "group") {
      // Create a temporary group with absolute position for recursion
      const childGroup: GroupObject = {
        ...(child as GroupObject),
        x: child.x,
        y: child.y,
      };
      result.push(...flattenGroupForRendering(childGroup, effectiveTransform));
    } else {
      const childTransform: GroupTransform = {
        x: effectiveTransform.x + child.x * effectiveTransform.scaleX,
        y: effectiveTransform.y + child.y * effectiveTransform.scaleY,
        rotation: effectiveTransform.rotation + child.rotation,
        scaleX: effectiveTransform.scaleX,
        scaleY: effectiveTransform.scaleY,
        opacity: effectiveTransform.opacity * child.opacity,
      };
      result.push({ object: child, transform: childTransform });
    }
  }

  return result;
}

/**
 * Deep clones a canvas object with new UUIDs for all IDs (including nested group children).
 */
export function deepCloneWithNewIds(obj: AnyCanvasObject): AnyCanvasObject {
  if (obj.type === "group") {
    const group = obj as GroupObject;
    return {
      ...group,
      id: crypto.randomUUID(),
      children: group.children.map(deepCloneWithNewIds),
    } as GroupObject;
  }
  return { ...obj, id: crypto.randomUUID() };
}
