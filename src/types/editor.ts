import { GradientDef, FillType, BackgroundType } from "./gradient";
import type { PatternDef } from "./pattern";
import type { RichTextSegment } from "./rich-text";

/**
 * Image filter settings for brightness, contrast, saturation, blur, sepia, and hue-rotate.
 */
export interface ImageFilters {
  brightness: number;  // -100 to 100, default 0 (maps to CSS brightness 0-2)
  contrast: number;    // -100 to 100, default 0
  saturation: number;  // -100 to 100, default 0 (maps to CSS saturate 0-2)
  blur: number;        // 0 to 20, default 0 (direct px value)
  sepia: number;       // 0 to 100, default 0 (maps to CSS sepia 0-1)
  hueRotate: number;   // 0 to 360, default 0 (direct deg value)
}

/**
 * Default values for image filters.
 */
export const DEFAULT_IMAGE_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  sepia: 0,
  hueRotate: 0,
};

/**
 * Mask/clip shape types for images.
 */
export type MaskType = "none" | "circle" | "roundedRect" | "star" | "heart" | "hexagon" | "diamond";

/**
 * Base interface for all canvas objects.
 * Uses a discriminated union pattern with the `type` field.
 */
export interface CanvasObject {
  id: string;
  type: "text" | "image" | "shape" | "qrcode" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
  // Shadow properties
  shadowEnabled: boolean;
  shadowColor: string;      // 8-digit hex (#RRGGBBAA)
  shadowBlur: number;       // 0–50
  shadowOffsetX: number;    // -50 to 50
  shadowOffsetY: number;    // -50 to 50
  // Blend mode
  blendMode: string;        // Canvas 2D composite operation name
}

/**
 * Text object for rendering text on the canvas.
 */
export interface TextObject extends CanvasObject {
  type: "text";
  content: string;
  fontFamily: string | null;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: string;
  fill: string;
  fillType?: FillType;
  fillGradient?: GradientDef | null;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  textAlign: "left" | "center" | "right";
  direction: "auto" | "rtl" | "ltr";
  letterSpacing: number;
  lineHeight: number;
  // Rich text support: array of segments with per-segment style overrides.
  // Null = plain text mode (use content field with parent styles only).
  // Non-null = rich text mode with per-segment styles.
  richContent?: RichTextSegment[] | null;
  // Text path (curve) support
  textPathType?: "none" | "arc" | "circle" | "wave";
  textPathRadius?: number;        // 50–2000 for arc, 50–500 for circle; default 300
  textPathDirection?: "up" | "down"; // arc curvature direction; default "up"
  textPathStartAngle?: number;    // 0–360 degrees; default 0
  textPathClockwise?: boolean;    // circle wrapping direction; default true
  textPathAmplitude?: number;     // wave height 5–100; default 30
  textPathWavelength?: number;    // wave peak distance 50–500; default 200
  textPathPhase?: number;         // wave offset 0–360 degrees; default 0
}

/**
 * Image object for rendering uploaded images on the canvas.
 */
export interface ImageObject extends CanvasObject {
  type: "image";
  src: string;
  originalName: string;
  originalUrl?: string; // Source URL if loaded from web
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  flipX: boolean;
  flipY: boolean;
  // Filter properties
  filters: ImageFilters;
  // Mask/clip properties
  maskType: MaskType;
  maskRadius: number; // Corner radius for roundedRect mask
  // Border/outline properties
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderRadius: number; // Only used when maskType="none"
}

/**
 * Shape object for rendering geometric shapes on the canvas.
 */
export interface ShapeObject extends CanvasObject {
  type: "shape";
  shapeType: "rect" | "circle" | "triangle" | "star" | "arrow" | "line" | "polygon" | "diamond" | "icon" | "custom";
  fill: string;
  fillType?: FillType;
  fillGradient?: GradientDef | null;
  fillPattern?: PatternDef | null;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
  sides?: number;
  innerRadius?: number;
  // Icon-specific fields (only when shapeType === "icon")
  svgPath?: string;    // SVG d attribute string (Lucide 24×24 viewBox)
  iconName?: string;   // Display name for properties panel label
  // Custom pen-tool shape fields (only when shapeType === "custom")
  customPath?: string | null;               // SVG path data (M, L, C, Z absolute commands)
  customPathOriginalWidth?: number | null;  // Bounding box width at creation time
  customPathOriginalHeight?: number | null; // Bounding box height at creation time
}

/**
 * QR code object for rendering scannable QR codes on the canvas.
 */
export interface QRCodeObject extends CanvasObject {
  type: "qrcode";
  data: string;                              // URL or text to encode; default "https://example.com"
  errorCorrectionLevel: "L" | "M" | "Q" | "H";  // default "M"
  foregroundColor: string;                   // hex string; default "#000000"
  backgroundColor: string;                   // hex string or "transparent"; default "#FFFFFF"
  padding: number;                           // 0–4 quiet zone modules; default 2
  style: "square" | "rounded" | "dots";     // module shape; default "square"
}

/**
 * Group object for grouping multiple canvas objects into a single unit.
 * Children positions are relative to the group origin (0,0 = top-left of group bounding box).
 */
export interface GroupObject extends Omit<CanvasObject, "type"> {
  type: "group";
  children: AnyCanvasObject[];
}

/**
 * Union type for any canvas object.
 * Enables type narrowing via the `type` discriminant.
 */
export type AnyCanvasObject = TextObject | ImageObject | ShapeObject | QRCodeObject | GroupObject;

/**
 * Font definition for font registry.
 */
export interface FontDef {
  family: string;
  displayName: string;
  source: "built-in" | "uploaded";
  url?: string;
  supportsBold: boolean;
  supportsItalic: boolean;
}

/**
 * Target code generation libraries.
 */
export type TargetLibrary = "node-canvas" | "sharp" | "jimp" | "skia-canvas";

/**
 * A deep clone of design-level canvas state at a point in time.
 * Used for undo/redo history tracking.
 */
export interface HistorySnapshot {
  objects: AnyCanvasObject[];
  globalFont: string | null;
  backgroundColor: string;
  backgroundType: BackgroundType;
  backgroundGradient: GradientDef | null;
  backgroundImage: string | null;
  backgroundPattern: PatternDef | null;
}

/**
 * Canvas settings subset of editor state.
 */
export interface CanvasSettings {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  showGrid: boolean;
  backgroundColor: string;
  backgroundType: BackgroundType;
  backgroundGradient: GradientDef | null;
  backgroundImage: string | null;
  backgroundPattern: PatternDef | null;
}

/**
 * Represents a single snap alignment guide line.
 */
export interface SnapLine {
  orientation: "horizontal" | "vertical";
  position: number;
}

/**
 * A draggable guide line on the canvas (created by dragging from rulers).
 * Not tracked in undo/redo history.
 */
export interface Guide {
  id: string;
  orientation: "horizontal" | "vertical";
  position: number;  // canvas pixels (absolute)
  locked: boolean;   // default false
}

/**
 * Crop mode state for the editor.
 */
export interface CropMode {
  active: boolean;
  imageId: string | null;
}

/**
 * Complete editor state interface.
 */
export interface EditorState extends CanvasSettings {
  objects: AnyCanvasObject[];
  selectedIds: string[];
  globalFont: string | null;
  builtInFonts: FontDef[];
  uploadedFonts: FontDef[];
  targetLibrary: TargetLibrary;
  generatedCode: string;
  codePanelOpen: boolean;
  // Snap guide state (not in undo history)
  snapEnabled: boolean;
  activeGuides: SnapLine[];
  // Crop mode state (not in undo history)
  cropMode: CropMode;
  // Pen tool state (not in undo history)
  penToolActive: boolean;
  editingCustomShapeId: string | null;
  // Group editing state (not in undo history)
  editingGroupId: string | null;
  // Context menu state (not in undo history)
  contextMenuVisible: boolean;
  contextMenuPosition: { x: number; y: number };
  contextMenuTargetId: string | null;
  // Guides & Rulers state (not in undo history)
  guides: Guide[];
  showRulers: boolean;
  // Export state
  isExporting: boolean;
  // Code playground state
  codePlaygroundOpen: boolean;
  stateVersion: number;
  codeGeneratedAtVersion: number;
}

/**
 * Editor actions interface.
 */
export interface EditorActions {
  addObject: (obj: AnyCanvasObject) => void;
  updateObject: (id: string, partial: Partial<Omit<AnyCanvasObject, "type">>, skipHistory?: boolean) => void;
  removeObject: (id: string) => void;
  reorderObject: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  updateCanvas: (partial: Partial<CanvasSettings>) => void;
  setGlobalFont: (font: string | null) => void;
  setBackgroundImage: (image: string | null) => void;
  addUploadedFont: (font: FontDef) => void;
  removeUploadedFont: (family: string) => void;
  setTargetLibrary: (lib: TargetLibrary) => void;
  duplicateObjects: (ids: string[]) => void;
  flipObject: (id: string, axis: "x" | "y") => void;
  setObjectLocked: (id: string, locked: boolean) => void;
  setObjectVisible: (id: string, visible: boolean) => void;
  reorderToIndex: (id: string, targetIndex: number) => void;
  setBuiltInFonts: (fonts: FontDef[]) => void;
  generateCode: () => void;
  setCodePanelOpen: (open: boolean) => void;
  restoreSnapshot: (snapshot: HistorySnapshot) => void;
  performUndo: () => void;
  performRedo: () => void;
  // Snap guide actions
  toggleSnap: () => void;
  setActiveGuides: (guides: SnapLine[]) => void;
  clearGuides: () => void;
  // Crop mode actions
  enterCropMode: (imageId: string) => void;
  exitCropMode: () => void;
  // Pen tool actions
  setPenToolActive: (active: boolean) => void;
  setEditingCustomShapeId: (id: string | null) => void;
  // Group actions
  groupObjects: (ids: string[]) => void;
  ungroupObject: (groupId: string) => void;
  setEditingGroup: (groupId: string | null) => void;
  // Alignment actions
  alignSelectedObjects: (alignment: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => void;
  distributeSelectedObjects: (distribution: "horizontal" | "vertical") => void;
  // Cut action
  cutObjects: (ids: string[]) => void;
  // Context menu actions
  showContextMenu: (position: { x: number; y: number }, targetId: string | null) => void;
  hideContextMenu: () => void;
  // Export flag
  setExporting: (value: boolean) => void;
  // Code playground actions
  toggleCodePlayground: () => void;
  // Guide actions (not in undo history)
  addGuide: (orientation: "horizontal" | "vertical", position: number) => void;
  updateGuide: (id: string, partial: Partial<Pick<Guide, "position" | "locked">>) => void;
  removeGuide: (id: string) => void;
  clearAllGuides: () => void;
  toggleRulers: () => void;
  // Zoom actions
  zoomToFitCanvas: (viewportWidth: number, viewportHeight: number) => void;
  zoomToSelection: (viewportWidth: number, viewportHeight: number) => void;
  setZoomPreset: (zoomLevel: number) => void;
}
