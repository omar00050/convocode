"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import type Konva from "konva";

export default function TransformerWrapper() {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useEditorStore((state) => state.objects);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shiftHeld = useRef(false);

  // Attach Transformer to selected nodes (excluding locked objects)
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const layer = transformer.getLayer();
    if (!layer) return;

    // Find nodes by ID, skipping locked objects
    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const obj = objects.find((o) => o.id === id);
      if (obj && obj.locked) continue; // Skip locked objects
      const node = layer.findOne("#" + id);
      if (node) {
        nodes.push(node);
      }
    }

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, objects]);

  // Track Shift key for aspect ratio toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        shiftHeld.current = true;
        // Toggle ratio off when Shift is held
        if (transformerRef.current) {
          transformerRef.current.keepRatio(false);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        shiftHeld.current = false;
        // Toggle ratio back on when Shift is released
        if (transformerRef.current) {
          transformerRef.current.keepRatio(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={true}
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ]}
      keepRatio={true}
      boundBoxFunc={(oldBox, newBox) => {
        // Minimum size constraint
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
