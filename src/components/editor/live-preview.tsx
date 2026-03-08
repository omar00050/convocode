"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, ExternalLink } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { TargetLibrary, ImageObject, AnyCanvasObject } from "@/types/editor";

function collectImageSources(objects: AnyCanvasObject[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const obj of objects) {
    if (obj.type === "image") {
      const img = obj as ImageObject;
      map[img.originalName] = img.src;
    } else if (obj.type === "group" && "children" in obj) {
      Object.assign(map, collectImageSources((obj as { children: AnyCanvasObject[] }).children));
    }
  }
  return map;
}

interface LivePreviewProps {
  code: string;
  canvasWidth: number;
  canvasHeight: number;
  generator: TargetLibrary;
  autoRun: boolean;
  onAutoRunComplete: () => void;
}

type PreviewStatus = "ready" | "running" | "error";

export default function LivePreview({
  code,
  canvasWidth,
  canvasHeight,
  generator,
  autoRun,
  onAutoRunComplete,
}: LivePreviewProps) {
  const objects = useEditorStore((s) => s.objects);
  const backgroundImage = useEditorStore((s) => s.backgroundImage);

  const [status, setStatus] = useState<PreviewStatus>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const hasAutoRun = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const runPreview = useCallback(async () => {
    if (!code) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setErrorMessage(null);

    const images = collectImageSources(objects);
    if (backgroundImage) images["background.png"] = backgroundImage;

    try {
      const resp = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, generator, images }),
        signal: controller.signal,
      });

      const data = await resp.json();

      if (controller.signal.aborted) return;

      if (data.type === "success") {
        setPreviewImage(data.imageDataUrl);
        setStatus("ready");
        setErrorMessage(null);
      } else {
        setStatus("error");
        setErrorMessage(data.message ?? "Unknown error");
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [code, generator, objects, backgroundImage]);

  useEffect(() => {
    if (autoRun && !hasAutoRun.current) {
      hasAutoRun.current = true;
      runPreview().then(() => {
        onAutoRunComplete();
        hasAutoRun.current = false;
      });
    }
  }, [autoRun, runPreview, onAutoRunComplete]);

  const handleOpenInNewTab = useCallback(() => {
    if (!previewImage) return;
    const byteString = atob(previewImage.split(",")[1]);
    const mimeType = previewImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeType });
    window.open(URL.createObjectURL(blob), "_blank");
  }, [previewImage]);

  const statusColor =
    status === "ready"
      ? "#22c55e"
      : status === "running"
        ? "#eab308"
        : "#ef4444";
  const statusText =
    status === "ready"
      ? "Ready"
      : status === "running"
        ? "Running..."
        : "Error";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderBottom: "1px solid #2a2a2a",
          flexShrink: 0,
          backgroundColor: "#252525",
        }}
      >
        <button
          onClick={runPreview}
          title="Run preview"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            color: "#ccc",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <Play size={11} />
          Run
        </button>
        <button
          onClick={handleOpenInNewTab}
          disabled={!previewImage}
          title="Open in new tab"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            color: previewImage ? "#ccc" : "#555",
            cursor: previewImage ? "pointer" : "not-allowed",
            fontSize: "11px",
          }}
        >
          <ExternalLink size={11} />
          Open in New Tab
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: statusColor,
              animation: status === "running" ? "pulse 1s infinite" : "none",
            }}
          />
          <span style={{ fontSize: "11px", color: statusColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Preview body */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {previewImage ? (
          <img
            src={previewImage}
            alt={`Preview (${canvasWidth}×${canvasHeight})`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              fontSize: "13px",
              textAlign: "center",
              padding: "20px",
              gap: "8px",
            }}
          >
            <Play size={28} color="#444" />
            <span>Click Run to preview the generated image.</span>
          </div>
        )}
      </div>

      {/* Error bar */}
      {errorMessage && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#2a1515",
            borderTop: "1px solid #5a2020",
            color: "#ef4444",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          {errorMessage}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
