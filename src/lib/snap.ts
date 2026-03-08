import type { AnyCanvasObject, Guide } from "@/types/editor";

/**
 * Represents a single snap alignment guide displayed on the canvas during drag operations.
 */
export interface SnapLine {
  orientation: "horizontal" | "vertical";
  position: number;
}

/**
 * Return value from the snap calculation function.
 */
export interface SnapResult {
  snappedX: number | null;
  snappedY: number | null;
  activeGuides: SnapLine[];
}

/**
 * Bounding rectangle of a canvas object, used for snap calculations.
 */
export interface ObjectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Defines the crop region in the original image's pixel coordinate space.
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts bounding box from any canvas object.
 */
export function getObjectBounds(obj: AnyCanvasObject): ObjectBounds {
  return {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
  };
}

/**
 * Computes snap guides for a dragged object against other objects and canvas edges.
 *
 * Algorithm:
 * 1. Compute 6 snap points for dragged object (left, right, center-x, top, bottom, center-y)
 * 2. Collect reference snap points from visible/unlocked objects and canvas edges/center
 * 3. For each axis independently, find closest snap within threshold
 * 4. Return corrected positions and all matching guide lines at snap positions
 */
export function calculateSnapGuides(
  draggedBounds: ObjectBounds,
  otherObjects: AnyCanvasObject[],
  canvasDimensions: { width: number; height: number },
  threshold: number = 5,
  guides: Guide[] = []
): SnapResult {
  const { x, y, width, height } = draggedBounds;
  const { width: canvasWidth, height: canvasHeight } = canvasDimensions;

  // Compute dragged object's snap points
  const draggedPoints = {
    left: x,
    right: x + width,
    centerX: x + width / 2,
    top: y,
    bottom: y + height,
    centerY: y + height / 2,
  };

  // Collect reference snap points from other objects
  const referencePointsX: number[] = [];
  const referencePointsY: number[] = [];
  const referencePointSources: { x: number[]; y: number[] }[] = [];

  for (const obj of otherObjects) {
    // Skip hidden or locked objects
    if (!obj.visible || obj.locked) continue;

    const bounds = getObjectBounds(obj);
    const objLeft = bounds.x;
    const objRight = bounds.x + bounds.width;
    const objCenterX = bounds.x + bounds.width / 2;
    const objTop = bounds.y;
    const objBottom = bounds.y + bounds.height;
    const objCenterY = bounds.y + bounds.height / 2;

    referencePointsX.push(objLeft, objRight, objCenterX);
    referencePointsY.push(objTop, objBottom, objCenterY);
    referencePointSources.push(
      { x: [objLeft, objRight, objCenterX], y: [objTop, objBottom, objCenterY] }
    );
  }

  // Add canvas edge and center snap points
  referencePointsX.push(0, canvasWidth, canvasWidth / 2);
  referencePointsY.push(0, canvasHeight, canvasHeight / 2);
  referencePointSources.push(
    { x: [0, canvasWidth, canvasWidth / 2], y: [0, canvasHeight, canvasHeight / 2] }
  );

  // Add guide positions as snap targets
  for (const guide of guides) {
    if (!guide.locked) {
      if (guide.orientation === "vertical") {
        referencePointsX.push(guide.position);
        referencePointSources.push({ x: [guide.position], y: [] });
      } else {
        referencePointsY.push(guide.position);
        referencePointSources.push({ x: [], y: [guide.position] });
      }
    }
  }

  // Find closest snap on X axis
  let snappedX: number | null = null;
  let snappedXDelta: number | null = null;
  let snappedXPosition: number | null = null;

  const draggedXPoints = [
    { point: draggedPoints.left, type: "left" as const },
    { point: draggedPoints.right, type: "right" as const },
    { point: draggedPoints.centerX, type: "centerX" as const },
  ];

  for (const { point: draggedPoint } of draggedXPoints) {
    for (const refPoint of referencePointsX) {
      const delta = refPoint - draggedPoint;
      if (Math.abs(delta) <= threshold) {
        if (snappedXDelta === null || Math.abs(delta) < Math.abs(snappedXDelta)) {
          snappedXDelta = delta;
          snappedXPosition = refPoint;
          snappedX = x + delta;
        }
      }
    }
  }

  // Find closest snap on Y axis
  let snappedY: number | null = null;
  let snappedYDelta: number | null = null;
  let snappedYPosition: number | null = null;

  const draggedYPoints = [
    { point: draggedPoints.top, type: "top" as const },
    { point: draggedPoints.bottom, type: "bottom" as const },
    { point: draggedPoints.centerY, type: "centerY" as const },
  ];

  for (const { point: draggedPoint } of draggedYPoints) {
    for (const refPoint of referencePointsY) {
      const delta = refPoint - draggedPoint;
      if (Math.abs(delta) <= threshold) {
        if (snappedYDelta === null || Math.abs(delta) < Math.abs(snappedYDelta)) {
          snappedYDelta = delta;
          snappedYPosition = refPoint;
          snappedY = y + delta;
        }
      }
    }
  }

  // Collect all guide lines at the snapped positions
  const activeGuides: SnapLine[] = [];

  // X-axis guides
  if (snappedXPosition !== null) {
    // Find all reference objects that have a point at the snapped X position
    for (const source of referencePointSources) {
      if (source.x.includes(snappedXPosition)) {
        activeGuides.push({
          orientation: "vertical",
          position: snappedXPosition,
        });
        break; // Only add one vertical guide per snapped position
      }
    }
  }

  // Y-axis guides
  if (snappedYPosition !== null) {
    // Find all reference objects that have a point at the snapped Y position
    for (const source of referencePointSources) {
      if (source.y.includes(snappedYPosition)) {
        activeGuides.push({
          orientation: "horizontal",
          position: snappedYPosition,
        });
        break; // Only add one horizontal guide per snapped position
      }
    }
  }

  return {
    snappedX,
    snappedY,
    activeGuides,
  };
}
