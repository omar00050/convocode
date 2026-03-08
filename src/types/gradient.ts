export interface GradientStop {
  color: string;    // hex string, e.g. "#FF512F"
  position: number; // 0–1 decimal (0% to 100%)
}

export interface GradientDef {
  type: "linear" | "radial";
  angle: number;     // 0–360 degrees. Only relevant when type="linear". 0°=right, 90°=down.
  centerX: number;   // 0–1 fraction of bounding box width. Only relevant when type="radial". Default: 0.5
  centerY: number;   // 0–1 fraction of bounding box height. Only relevant when type="radial". Default: 0.5
  radius: number;    // 0–1 fraction of min(width, height). Only relevant when type="radial". Default: 0.5
  stops: GradientStop[]; // minimum 2, maximum 10
}

export type FillType = "solid" | "linearGradient" | "radialGradient" | "pattern";

export type BackgroundType = "solid" | "gradient" | "pattern";

export const DEFAULT_LINEAR_GRADIENT: GradientDef = {
  type: "linear",
  angle: 0,
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.5,
  stops: [
    { color: "#000000", position: 0 },
    { color: "#ffffff", position: 1 },
  ],
};

export const DEFAULT_RADIAL_GRADIENT: GradientDef = {
  type: "radial",
  angle: 0,
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.5,
  stops: [
    { color: "#ffffff", position: 0 },
    { color: "#000000", position: 1 },
  ],
};

export const GRADIENT_PRESETS: Array<{ name: string } & GradientDef> = [
  { name: "Sunset", type: "linear", angle: 45, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#FF512F", position: 0 }, { color: "#DD2476", position: 1 }] },
  { name: "Ocean", type: "linear", angle: 135, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#2193B0", position: 0 }, { color: "#6DD5ED", position: 1 }] },
  { name: "Fire", type: "linear", angle: 0, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#F12711", position: 0 }, { color: "#F5AF19", position: 1 }] },
  { name: "Forest", type: "linear", angle: 180, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#134E5E", position: 0 }, { color: "#71B280", position: 1 }] },
  { name: "Purple Haze", type: "linear", angle: 90, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#7B4397", position: 0 }, { color: "#DC2430", position: 1 }] },
  { name: "Night Sky", type: "linear", angle: 180, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#0F2027", position: 0 }, { color: "#203A43", position: 0.5 }, { color: "#2C5364", position: 1 }] },
  { name: "Golden Hour", type: "linear", angle: 45, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#F2994A", position: 0 }, { color: "#F2C94C", position: 1 }] },
  { name: "Cool Blues", type: "linear", angle: 135, centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{ color: "#2196F3", position: 0 }, { color: "#00BCD4", position: 0.5 }, { color: "#009688", position: 1 }] },
];
