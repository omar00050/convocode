"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ isActive, onClick, children, title, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        title={title}
        className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${
          isActive
            ? "bg-blue-500/30 border-blue-400/50 text-white"
            : "bg-[#333] border-[#555] text-gray-300 hover:border-[#666]"
        } ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ToggleButton.displayName = "ToggleButton";

export default ToggleButton;
