export type AlignmentType = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";
export type DistributionType = "horizontal" | "vertical";

export interface AlignableObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the bounding box of all input objects.
 */
export function getSelectionBounds(
  objects: AlignableObject[]
): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const minX = Math.min(...objects.map((o) => o.x));
  const minY = Math.min(...objects.map((o) => o.y));
  const maxX = Math.max(...objects.map((o) => o.x + o.width));
  const maxY = Math.max(...objects.map((o) => o.y + o.height));

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Aligns objects according to the given alignment type.
 * Returns new {id, x, y} positions for each object.
 */
export function alignObjects(
  objects: AlignableObject[],
  type: AlignmentType
): { id: string; x: number; y: number }[] {
  if (objects.length === 0) return [];
  const bounds = getSelectionBounds(objects);

  return objects.map((obj) => {
    let x = obj.x;
    let y = obj.y;

    switch (type) {
      case "left":
        x = bounds.x;
        break;
      case "centerH":
        x = bounds.x + bounds.width / 2 - obj.width / 2;
        break;
      case "right":
        x = bounds.x + bounds.width - obj.width;
        break;
      case "top":
        y = bounds.y;
        break;
      case "centerV":
        y = bounds.y + bounds.height / 2 - obj.height / 2;
        break;
      case "bottom":
        y = bounds.y + bounds.height - obj.height;
        break;
    }

    return { id: obj.id, x, y };
  });
}

/**
 * Distributes objects with equal spacing along an axis.
 * Requires 3+ objects for meaningful distribution.
 * Returns new {id, x, y} positions.
 */
export function distributeObjects(
  objects: AlignableObject[],
  type: DistributionType
): { id: string; x: number; y: number }[] {
  if (objects.length < 3) return objects.map((o) => ({ id: o.id, x: o.x, y: o.y }));

  if (type === "horizontal") {
    const sorted = [...objects].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = sorted.reduce((sum, o) => sum + o.width, 0);
    const totalSpace = (last.x + last.width) - first.x - totalWidth;
    const gap = totalSpace / (sorted.length - 1);

    let currentX = first.x + first.width + gap;
    return sorted.map((obj, i) => {
      if (i === 0) return { id: obj.id, x: obj.x, y: obj.y };
      if (i === sorted.length - 1) return { id: obj.id, x: last.x, y: obj.y };
      const x = currentX;
      currentX += obj.width + gap;
      return { id: obj.id, x, y: obj.y };
    });
  } else {
    const sorted = [...objects].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = sorted.reduce((sum, o) => sum + o.height, 0);
    const totalSpace = (last.y + last.height) - first.y - totalHeight;
    const gap = totalSpace / (sorted.length - 1);

    let currentY = first.y + first.height + gap;
    return sorted.map((obj, i) => {
      if (i === 0) return { id: obj.id, x: obj.x, y: obj.y };
      if (i === sorted.length - 1) return { id: obj.id, x: obj.x, y: last.y };
      const y = currentY;
      currentY += obj.height + gap;
      return { id: obj.id, x: obj.x, y };
    });
  }
}
