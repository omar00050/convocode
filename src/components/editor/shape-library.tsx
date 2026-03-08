"use client";

import { Square, Circle, Triangle, Star } from "lucide-react";
import type { ShapeObject } from "@/types/editor";

interface ShapeLibraryProps {
  onAddShape: (shapeType: ShapeObject["shapeType"]) => void;
}

interface ShapeCardConfig {
  type: ShapeObject["shapeType"];
  label: string;
  icon: React.ReactNode;
}

function ArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function LineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function HexagonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 22 7 22 17 12 22 2 17 2 7" />
    </svg>
  );
}

function DiamondIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
    </svg>
  );
}

const shapeCards: ShapeCardConfig[] = [
  { type: "rect", label: "Rectangle", icon: <Square size={20} className="text-gray-400" /> },
  { type: "circle", label: "Circle", icon: <Circle size={20} className="text-gray-400" /> },
  { type: "triangle", label: "Triangle", icon: <Triangle size={20} className="text-gray-400" /> },
  { type: "star", label: "Star", icon: <Star size={20} className="text-gray-400" /> },
  { type: "arrow", label: "Arrow", icon: <ArrowIcon /> },
  { type: "line", label: "Line", icon: <LineIcon /> },
  { type: "polygon", label: "Polygon", icon: <HexagonIcon /> },
  { type: "diamond", label: "Diamond", icon: <DiamondIcon /> },
];

export default function ShapeLibrary({ onAddShape }: ShapeLibraryProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {shapeCards.map((card) => (
        <button
          key={card.type}
          type="button"
          onClick={() => onAddShape(card.type)}
          className="aspect-square flex flex-col items-center justify-center rounded bg-[#333] hover:bg-[#3a3a3a] transition"
          title={card.label}
        >
          {card.icon}
          <span className="text-[10px] text-gray-500 mt-1">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
