// ─────────────────────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExportFormat = "png" | "jpeg" | "webp" | "svg" | "pdf";

export type ScaleFactor = 0.5 | 1 | 2 | 3;

export type PdfPageSize = "match" | "a4" | "letter";

export interface ExportConfig {
  format: ExportFormat;
  scaleFactor: ScaleFactor;
  filename: string;               // sans extension, default "canvas-export"

  // PNG-specific
  transparentBackground: boolean;

  // JPEG-specific
  jpegQuality: number;            // 10–100
  jpegBackgroundColor: string;    // hex, default "#FFFFFF"

  // WebP-specific
  webpQuality: number;            // 10–100
  webpTransparentBackground: boolean;

  // PDF-specific
  pdfPageSize: PdfPageSize;
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: "png",
  scaleFactor: 1,
  filename: "canvas-export",
  transparentBackground: false,
  jpegQuality: 90,
  jpegBackgroundColor: "#FFFFFF",
  webpQuality: 85,
  webpTransparentBackground: false,
  pdfPageSize: "match",
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  png: ".png",
  jpeg: ".jpg",
  webp: ".webp",
  svg: ".svg",
  pdf: ".pdf",
};

export const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

// ─────────────────────────────────────────────────────────────────────────────
// Filename sanitization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips invalid filename characters, trims whitespace, strips any existing
 * extension, and falls back to "canvas-export" if the result is empty.
 */
export function sanitizeFilename(name: string): string {
  // Strip invalid characters (Windows + Unix + URL unsafe)
  let sanitized = name.replace(/[/\\:*?"<>|]/g, "").trim();

  // Strip any existing extension (last dot + alphanumeric suffix)
  sanitized = sanitized.replace(/\.\w{1,6}$/, "").trim();

  return sanitized || "canvas-export";
}

// ─────────────────────────────────────────────────────────────────────────────
// WebP support detection (cached)
// ─────────────────────────────────────────────────────────────────────────────

let _webpSupported: boolean | null = null;

export function detectWebPSupport(): boolean {
  if (_webpSupported !== null) return _webpSupported;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const result = canvas.toDataURL("image/webp");
    _webpSupported = result.startsWith("data:image/webp");
  } catch {
    _webpSupported = false;
  }

  return _webpSupported;
}

// ─────────────────────────────────────────────────────────────────────────────
// File size estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable estimated file size string (e.g., "~2.4 MB").
 * Uses heuristics based on pixel count, format, and quality.
 */
export function estimateFileSize(
  pixelCount: number,
  format: ExportFormat,
  quality: number // 10–100 for raster, ignored for SVG/PDF
): string {
  let bytes: number;

  switch (format) {
    case "png":
      bytes = pixelCount * 3 * 0.5; // ~50% compression for typical designs
      break;
    case "jpeg":
      bytes = pixelCount * 3 * (quality / 100) * 0.15;
      break;
    case "webp":
      bytes = pixelCount * 3 * (quality / 100) * 0.10;
      break;
    case "svg":
      // Very rough: can't estimate without knowing content
      bytes = pixelCount * 0.01;
      break;
    case "pdf":
      // JPEG size + PDF overhead
      bytes = pixelCount * 3 * 0.92 * 0.15 + 2048;
      break;
    default:
      bytes = pixelCount * 3;
  }

  return formatBytes(bytes);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `~${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Download trigger
// ─────────────────────────────────────────────────────────────────────────────

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
