import type { ShapeObject } from "@/types/editor";

export interface ShapeDefaults {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
  sides?: number;
  innerRadius?: number;
}

/**
 * Returns default dimensions and properties for each shape type.
 * Used when creating new shapes from the shape library.
 */
export function getShapeDefaults(shapeType: ShapeObject["shapeType"]): ShapeDefaults {
  const baseDefaults = {
    fill: "#4A90D9",
    stroke: "#FFFFFF",
    strokeWidth: 2,
  };

  switch (shapeType) {
    case "rect":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        cornerRadius: 0,
      };
    case "circle":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
      };
    case "triangle":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        sides: 3,
      };
    case "star":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        innerRadius: 30,
      };
    case "arrow":
      return {
        ...baseDefaults,
        width: 200,
        height: 100,
      };
    case "line":
      return {
        ...baseDefaults,
        width: 200,
        height: 4,
      };
    case "polygon":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        sides: 6,
      };
    case "diamond":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        sides: 4,
      };
    case "icon":
      return {
        ...baseDefaults,
        width: 100,
        height: 100,
        fill: "#FFFFFF",
        stroke: "transparent",
        strokeWidth: 0,
      };
    case "custom":
      return {
        ...baseDefaults,
        width: 150,
        height: 150,
        fill: "#6366f1",
        stroke: "#000000",
        strokeWidth: 2,
      };
  }
}
