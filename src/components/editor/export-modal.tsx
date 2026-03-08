"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Info, AlertTriangle, Loader2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import {
  DEFAULT_EXPORT_CONFIG,
  type ExportConfig,
  type ExportFormat,
  type ScaleFactor,
  sanitizeFilename,
  detectWebPSupport,
  estimateFileSize,
  triggerDownload,
  FORMAT_EXTENSIONS,
  FORMAT_MIME_TYPES,
} from "@/lib/export-utils";
import { exportToSVG } from "@/lib/svg-exporter";
import { exportToPDF } from "@/lib/pdf-exporter";
import type Konva from "konva";

interface ExportModalProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  showGrid: boolean;
  onClose: () => void;
}

const FORMAT_TABS: ExportFormat[] = ["png", "jpeg", "webp", "svg", "pdf"];
const FORMAT_LABELS: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  svg: "SVG",
  pdf: "PDF",
};

const SCALE_OPTIONS: ScaleFactor[] = [0.5, 1, 2, 3];

export default function ExportModal({
  stageRef,
  zoom,
  canvasWidth,
  canvasHeight,
  onClose,
}: ExportModalProps) {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [webpFallbackMessage, setWebpFallbackMessage] = useState<string | null>(null);

  const setStoreExporting = useEditorStore((s) => s.setExporting);
  const objects = useEditorStore((s) => s.objects);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const backgroundType = useEditorStore((s) => s.backgroundType);
  const backgroundGradient = useEditorStore((s) => s.backgroundGradient);
  const backgroundPattern = useEditorStore((s) => s.backgroundPattern);

  const update = <K extends keyof ExportConfig>(key: K, value: ExportConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  // Computed values
  const isSvg = config.format === "svg";
  const finalWidth = Math.round(canvasWidth * (isSvg ? 1 : config.scaleFactor));
  const finalHeight = Math.round(canvasHeight * (isSvg ? 1 : config.scaleFactor));
  const pixelCount = finalWidth * finalHeight;
  const quality = config.format === "jpeg" ? config.jpegQuality
    : config.format === "webp" ? config.webpQuality : 90;
  const estSize = estimateFileSize(pixelCount, config.format, quality);
  const hasImages = objects.some((o) => o.type === "image");
  const isLargeFile = parseFloat(estSize.replace(/[^0-9.]/g, "")) > 20 &&
    estSize.includes("MB");

  // Generate preview on mount
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      const dataUrl = stage.toDataURL({ pixelRatio: 0.15, mimeType: "image/png" });
      setPreviewUrl(dataUrl);
    } catch {
      setPreviewUrl(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear WebP fallback message on tab change
  useEffect(() => {
    setWebpFallbackMessage(null);
  }, [config.format]);

  // Keyboard handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isExporting) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleExport();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isExporting, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = useCallback(async () => {
    const stage = stageRef.current;
    setExportError(null);

    const safeName = sanitizeFilename(config.filename) + FORMAT_EXTENSIONS[config.format];

    // ── SVG export ────────────────────────────────────────────────────────
    if (config.format === "svg") {
      try {
        const svgString = exportToSVG({
          canvasWidth,
          canvasHeight,
          backgroundColor,
          backgroundType,
          backgroundGradient: backgroundGradient ?? null,
          backgroundPattern: backgroundPattern ?? null,
          objects,
        });
        const blob = new Blob([svgString], { type: FORMAT_MIME_TYPES.svg });
        triggerDownload(blob, safeName);
        onClose();
      } catch (err) {
        setExportError("SVG export failed. Please try again.");
        console.error(err);
      }
      return;
    }

    // ── Raster + PDF export ───────────────────────────────────────────────
    if (!stage) return;

    setIsExporting(true);
    setStoreExporting(true);

    setTimeout(async () => {
      try {
        const pixelRatio = config.scaleFactor / zoom;

        // ── PNG ──────────────────────────────────────────────────────────
        if (config.format === "png") {
          const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
          const blob = await dataUrlToBlob(dataUrl);
          triggerDownload(blob, safeName);
          onClose();
          return;
        }

        // ── JPEG ──────────────────────────────────────────────────────────
        if (config.format === "jpeg") {
          const dataUrl = stage.toDataURL({
            pixelRatio,
            mimeType: "image/jpeg",
            quality: config.jpegQuality / 100,
          });
          const blob = await dataUrlToBlob(dataUrl);
          triggerDownload(blob, safeName);
          onClose();
          return;
        }

        // ── WebP ──────────────────────────────────────────────────────────
        if (config.format === "webp") {
          if (detectWebPSupport()) {
            const dataUrl = stage.toDataURL({
              pixelRatio,
              mimeType: "image/webp",
              quality: config.webpQuality / 100,
            });
            const blob = await dataUrlToBlob(dataUrl);
            triggerDownload(blob, safeName);
            onClose();
          } else {
            // Fall back to PNG
            const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
            const pngName = sanitizeFilename(config.filename) + ".png";
            const blob = await dataUrlToBlob(dataUrl);
            triggerDownload(blob, pngName);
            setWebpFallbackMessage("WebP not supported in this browser. Exported as PNG instead.");
            setIsExporting(false);
            setStoreExporting(false);
          }
          return;
        }

        // ── PDF ──────────────────────────────────────────────────────────
        if (config.format === "pdf") {
          const jpegDataUrl = stage.toDataURL({
            pixelRatio,
            mimeType: "image/jpeg",
            quality: 0.92,
          });
          const pdfBytes = exportToPDF({
            imageDataUrl: jpegDataUrl,
            imageWidth: Math.round(canvasWidth * config.scaleFactor),
            imageHeight: Math.round(canvasHeight * config.scaleFactor),
            pageSize: config.pdfPageSize,
          });
          const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: FORMAT_MIME_TYPES.pdf });
          triggerDownload(blob, safeName);
          onClose();
          return;
        }
      } catch (err) {
        console.error("Export failed:", err);
        setExportError("Export failed. Try reducing the scale factor.");
      } finally {
        setIsExporting(false);
        setStoreExporting(false);
      }
    }, 50);
  }, [config, zoom, canvasWidth, canvasHeight, backgroundColor, backgroundType,
      backgroundGradient, backgroundPattern, objects, stageRef, setStoreExporting, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (isExporting) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#2a2a2a] rounded-lg shadow-2xl w-full max-w-[520px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#444]">
          <h2 className="text-base font-semibold text-white">Export Image</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded hover:bg-[#444] transition text-gray-400 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>
          {/* ── Preview ── */}
          <div className="bg-[#1a1a1a] rounded-lg p-2 flex flex-col items-center gap-1 min-h-[80px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[120px] max-w-full rounded object-contain"
              />
            ) : (
              <span className="text-gray-500 text-sm py-4">Preview not available</span>
            )}
            <div className="text-xs text-gray-400 text-center">
              <span className="text-white font-mono">{finalWidth} × {finalHeight} px</span>
              {" "}&bull;{" "}
              <span>{isSvg ? "vector" : estSize}</span>
            </div>
          </div>

          {/* ── Format tabs ── */}
          <div className="flex rounded overflow-hidden border border-[#444]">
            {FORMAT_TABS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => update("format", fmt)}
                className={`flex-1 py-1.5 text-xs font-medium transition ${
                  config.format === fmt
                    ? "bg-blue-600 text-white"
                    : "bg-[#333] text-gray-400 hover:bg-[#444] hover:text-white"
                }`}
              >
                {FORMAT_LABELS[fmt]}
              </button>
            ))}
          </div>

          {/* ── Format-specific options ── */}
          <div className="space-y-3">
            {/* PNG */}
            {config.format === "png" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.transparentBackground}
                  onChange={(e) => update("transparentBackground", e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">Transparent background</span>
              </label>
            )}

            {/* JPEG */}
            {config.format === "jpeg" && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">Quality</span>
                    <span className="text-sm text-gray-400">{config.jpegQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={config.jpegQuality}
                    onChange={(e) => update("jpegQuality", Number(e.target.value))}
                    className="w-full h-1 bg-[#444] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Background color</span>
                  <input
                    type="color"
                    value={config.jpegBackgroundColor}
                    onChange={(e) => update("jpegBackgroundColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-[#555]"
                    title="JPEG background color"
                  />
                  <span className="text-xs text-gray-500">{config.jpegBackgroundColor.toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* WebP */}
            {config.format === "webp" && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">Quality</span>
                    <span className="text-sm text-gray-400">{config.webpQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={config.webpQuality}
                    onChange={(e) => update("webpQuality", Number(e.target.value))}
                    className="w-full h-1 bg-[#444] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.webpTransparentBackground}
                    onChange={(e) => update("webpTransparentBackground", e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">Transparent background</span>
                </label>
                {webpFallbackMessage && (
                  <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 rounded p-2 text-xs text-amber-300">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    {webpFallbackMessage}
                  </div>
                )}
              </div>
            )}

            {/* SVG */}
            {config.format === "svg" && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded p-3 text-xs text-amber-300">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>SVG export is best-effort. Fonts must be installed on the viewing system. Some effects (filters, patterns) may render differently than on canvas.</span>
                </div>
                {hasImages && (
                  <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/40 rounded p-3 text-xs text-blue-300">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>Images are embedded as base64, which may result in a large file.</span>
                  </div>
                )}
              </div>
            )}

            {/* PDF */}
            {config.format === "pdf" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">Page size</span>
                <select
                  value={config.pdfPageSize}
                  onChange={(e) => update("pdfPageSize", e.target.value as ExportConfig["pdfPageSize"])}
                  className="bg-[#333] border border-[#555] text-gray-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500"
                >
                  <option value="match">Match Canvas</option>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
            )}
          </div>

          {/* ── Scale factor (disabled for SVG) ── */}
          <div className="space-y-1.5">
            <span className="text-sm text-gray-300">Scale</span>
            <div className="flex gap-2">
              {SCALE_OPTIONS.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-1.5 cursor-pointer ${isSvg ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <input
                    type="radio"
                    name="scale"
                    checked={config.scaleFactor === s}
                    onChange={() => update("scaleFactor", s)}
                    disabled={isSvg}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">{s}x</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Filename ── */}
          <div>
            <span className="text-sm text-gray-300 block mb-1.5">Filename</span>
            <div className="flex items-center gap-0 bg-[#333] border border-[#555] rounded overflow-hidden focus-within:border-blue-500">
              <input
                type="text"
                value={config.filename}
                onChange={(e) => update("filename", e.target.value)}
                placeholder="canvas-export"
                className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white outline-none"
              />
              <span className="px-2 text-sm text-gray-500 bg-[#2a2a2a] border-l border-[#555] select-none">
                {FORMAT_EXTENSIONS[config.format]}
              </span>
            </div>
          </div>

          {/* ── Error message ── */}
          {exportError && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 rounded p-3 text-xs text-red-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {exportError}
            </div>
          )}

          {/* ── Large file warning ── */}
          {isLargeFile && !isSvg && (
            <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 rounded p-3 text-xs text-amber-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              Large file ({estSize}). Consider reducing scale for faster export.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#444]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm text-gray-300 bg-[#333] rounded hover:bg-[#444] transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting && <Loader2 size={14} className="animate-spin" />}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
