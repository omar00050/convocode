"use client";

import { useState } from "react";
import { Line } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import type Konva from "konva";

interface GuidelinesProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

interface GuideInputProps {
  guideId: string;
  initialValue: number;
  x: number;
  y: number;
  onDone: () => void;
}

function GuidePositionInput({ guideId, initialValue, x, y, onDone }: GuideInputProps) {
  const updateGuide = useEditorStore((state) => state.updateGuide);
  const [value, setValue] = useState(String(Math.round(initialValue)));

  const commit = () => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateGuide(guideId, { position: num });
    }
    onDone();
  };

  return (
    <input
      type="number"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone();
      }}
      className="fixed z-9999 w-20 bg-zinc-900 border border-blue-500 rounded px-1 py-0.5 text-xs text-white outline-none"
      style={{ left: x, top: y }}
    />
  );
}

export default function Guidelines({ canvasWidth, canvasHeight, zoom }: GuidelinesProps) {
  const guides = useEditorStore((state) => state.guides);
  const updateGuide = useEditorStore((state) => state.updateGuide);
  const removeGuide = useEditorStore((state) => state.removeGuide);
  const clearAllGuides = useEditorStore((state) => state.clearAllGuides);

  const [editState, setEditState] = useState<{
    id: string;
    position: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
    locked: boolean;
    position: number;
  } | null>(null);

  const strokeW = 1 / zoom;
  const dashScale = 1 / zoom;

  return (
    <>
      {guides.map((guide) => {
        const isH = guide.orientation === "horizontal";
        const points = isH
          ? [0, guide.position, canvasWidth, guide.position]
          : [guide.position, 0, guide.position, canvasHeight];

        return (
          <Line
            key={guide.id}
            points={points}
            stroke="#00CCFF"
            strokeWidth={strokeW}
            opacity={guide.locked ? 0.5 : 1}
            dash={guide.locked ? [2 / zoom, 6 / zoom] : [6 / zoom, 4 / zoom]}
            draggable={!guide.locked}
            dragBoundFunc={(pos) =>
              isH ? { x: 0, y: pos.y } : { x: pos.x, y: 0 }
            }
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
              const node = e.target;
              const newPos = isH ? node.y() : node.x();
              if (newPos < 0) {
                removeGuide(guide.id);
              } else {
                updateGuide(guide.id, { position: Math.round(newPos) });
              }
              // Reset node position (data-driven)
              node.x(0);
              node.y(0);
            }}
            onDblClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
              const stage = e.target.getStage();
              if (!stage) return;
              const pointerPos = stage.getPointerPosition();
              if (!pointerPos) return;
              setEditState({
                id: guide.id,
                position: guide.position,
                screenX: pointerPos.x + (stage.container().getBoundingClientRect().left),
                screenY: pointerPos.y + (stage.container().getBoundingClientRect().top),
              });
            }}
            onContextMenu={(e: Konva.KonvaEventObject<PointerEvent>) => {
              e.evt.preventDefault();
              setContextMenu({
                id: guide.id,
                x: e.evt.clientX,
                y: e.evt.clientY,
                locked: guide.locked,
                position: guide.position,
              });
            }}
          />
        );
      })}

      {/* Position input overlay */}
      {editState && (
        <GuidePositionInput
          guideId={editState.id}
          initialValue={editState.position}
          x={editState.screenX}
          y={editState.screenY}
          onDone={() => setEditState(null)}
        />
      )}

      {/* Context menu overlay */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-9998"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-9999 bg-zinc-900 border border-zinc-700 rounded shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              onClick={() => {
                const guide = guides.find((g) => g.id === contextMenu.id);
                if (guide) {
                  setEditState({
                    id: guide.id,
                    position: guide.position,
                    screenX: contextMenu.x,
                    screenY: contextMenu.y,
                  });
                }
                setContextMenu(null);
              }}
            >
              Edit Position
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              onClick={() => {
                updateGuide(contextMenu.id, { locked: !contextMenu.locked });
                setContextMenu(null);
              }}
            >
              {contextMenu.locked ? "Unlock Guide" : "Lock Guide"}
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
              onClick={() => {
                removeGuide(contextMenu.id);
                setContextMenu(null);
              }}
            >
              Delete Guide
            </button>
            <div className="border-t border-zinc-700 my-1" />
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700"
              onClick={() => {
                clearAllGuides();
                setContextMenu(null);
              }}
            >
              Delete All Guides
            </button>
          </div>
        </>
      )}
    </>
  );
}
