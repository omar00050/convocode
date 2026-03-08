"use client";

import { useEffect, useRef } from "react";
import { Copy, Trash2, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import type { AnyCanvasObject } from "@/types/editor";
import { useEditorStore } from "@/stores/editor-store";

interface LayerContextMenuProps {
  object: AnyCanvasObject;
  x: number;
  y: number;
  onClose: () => void;
}

export default function LayerContextMenu({
  object,
  x,
  y,
  onClose,
}: LayerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { duplicateObjects, removeObject, clearSelection, setObjectLocked, setObjectVisible } = useEditorStore();

  // Click-outside listener to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleDuplicate = () => {
    duplicateObjects([object.id]);
    onClose();
  };

  const handleDelete = () => {
    removeObject(object.id);
    clearSelection();
    onClose();
  };

  const handleToggleLock = () => {
    setObjectLocked(object.id, !object.locked);
    onClose();
  };

  const handleToggleVisibility = () => {
    setObjectVisible(object.id, !object.visible);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#2a2a2a] rounded-lg border border-[#444] shadow-lg py-1 z-50 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleDuplicate}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3a3a3a] transition-colors"
      >
        <Copy size={14} />
        Duplicate
      </button>
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3a3a3a] transition-colors"
      >
        <Trash2 size={14} />
        Delete
      </button>
      <button
        onClick={handleToggleLock}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3a3a3a] transition-colors"
      >
        {object.locked ? <Unlock size={14} /> : <Lock size={14} />}
        {object.locked ? "Unlock" : "Lock"}
      </button>
      <button
        onClick={handleToggleVisibility}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3a3a3a] transition-colors"
      >
        {object.visible ? <EyeOff size={14} /> : <Eye size={14} />}
        {object.visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
