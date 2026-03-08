"use client";

import { Line } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";

interface SnapGuidesProps {
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Renders snap guide lines on the canvas during drag operations.
 * Reads activeGuides from the editor store and renders Konva Line nodes.
 */
export default function SnapGuides({ canvasWidth, canvasHeight }: SnapGuidesProps) {
  const activeGuides = useEditorStore((state) => state.activeGuides);

  // Don't render if no guides are active
  if (activeGuides.length === 0) {
    return null;
  }

  return (
    <>
      {activeGuides.map((guide, index) => {
        if (guide.orientation === "horizontal") {
          // Horizontal guide: full-width line at Y position
          return (
            <Line
              key={`h-${index}-${guide.position}`}
              points={[0, guide.position, canvasWidth, guide.position]}
              stroke="#FF00FF"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          );
        } else {
          // Vertical guide: full-height line at X position
          return (
            <Line
              key={`v-${index}-${guide.position}`}
              points={[guide.position, 0, guide.position, canvasHeight]}
              stroke="#FF00FF"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          );
        }
      })}
    </>
  );
}
