"use client";

import { useRef, useCallback } from "react";

interface AnglePickerProps {
  value: number;
  onChange: (deg: number) => void;
  size?: number;
}

export default function AnglePicker({
  value,
  onChange,
  size = 40,
}: AnglePickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const r = size / 2;

      const updateAngle = (clientX: number, clientY: number) => {
        const dx = clientX - rect.left - r;
        const dy = clientY - rect.top - r;
        // Calculate angle in radians, convert to degrees
        let angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);
        // Normalize to [0, 360)
        if (angleDeg < 0) angleDeg += 360;
        onChange(Math.round(angleDeg));
      };

      // Handle initial click
      updateAngle(e.clientX, e.clientY);

      const handleMouseMove = (me: MouseEvent) => {
        updateAngle(me.clientX, me.clientY);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onChange, size]
  );

  // Calculate line endpoint
  const r = size / 2;
  const lineRadius = r - 4;
  const angleRad = (value * Math.PI) / 180;
  const lineX2 = r + lineRadius * Math.cos(angleRad);
  const lineY2 = r + lineRadius * Math.sin(angleRad);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onMouseDown={handleMouseDown}
      className="cursor-pointer"
    >
      {/* Background circle */}
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="#333"
        stroke="#555"
        strokeWidth={1}
      />
      {/* Direction line */}
      <line
        x1={r}
        y1={r}
        x2={lineX2}
        y2={lineY2}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={r} cy={r} r={2} fill="#666" />
    </svg>
  );
}
