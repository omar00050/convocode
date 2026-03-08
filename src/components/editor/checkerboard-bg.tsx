"use client";

import type { ReactNode } from "react";

interface CheckerboardBgProps {
  children: ReactNode;
}

export default function CheckerboardBg({ children }: CheckerboardBgProps) {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `repeating-conic-gradient(#2a2a2a 0% 25%, #232323 0% 50%) 0 0 / 20px 20px`,
      }}
    >
      {children}
    </div>
  );
}
