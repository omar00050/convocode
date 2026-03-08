"use client";

import { useState, useRef, useEffect } from "react";
import { GripVertical, Image as ImageIcon, Type, Pentagon, Eye, EyeOff, Unlock, Lock, Folder, QrCode, ChevronRight, ChevronDown } from "lucide-react";
import type { AnyCanvasObject } from "@/types/editor";
import { useEditorStore } from "@/stores/editor-store";

interface LayerRowProps {
  object: AnyCanvasObject;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent, obj: AnyCanvasObject) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  isDragOver: boolean;
  dragPosition: "above" | "below" | null;
  depth?: number;
  isGroup?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onChildClick?: () => void;
}

export default function LayerRow({
  object,
  isSelected,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  dragPosition,
  depth = 0,
  isGroup = false,
  isExpanded = false,
  onToggleExpand,
  onChildClick,
}: LayerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(object.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setSelection, toggleSelection, setObjectVisible, setObjectLocked, updateObject } = useEditorStore();

  // Sync editName with object name when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditName(object.name);
    }
  }, [object.name, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", object.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(object.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(e, object.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, object.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (onChildClick) {
      onChildClick();
      return;
    }
    if (e.shiftKey) {
      toggleSelection(object.id);
    } else {
      setSelection([object.id]);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(object.name);
  };

  const handleSaveName = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== object.name) {
      updateObject(object.id, { name: trimmedName });
    } else {
      setEditName(object.name);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(object.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setObjectVisible(object.id, !object.visible);
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    setObjectLocked(object.id, !object.locked);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, object);
  };

  // Type icon based on object type
  const TypeIcon =
    isGroup
      ? Folder
      : object.type === "image"
        ? ImageIcon
        : object.type === "text"
          ? Type
          : object.type === "qrcode"
            ? QrCode
            : Pentagon;

  return (
    <div
      data-object-id={object.id}
      style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : undefined }}
      className={`
        flex items-center gap-1.5 h-10 px-1.5 rounded cursor-pointer select-none
        ${isSelected ? "bg-blue-500/20" : "hover:bg-[#2a2a2a]"}
        ${isDragOver && dragPosition === "above" ? "border-t-2 border-blue-500" : ""}
        ${isDragOver && dragPosition === "below" ? "border-b-2 border-blue-500" : ""}
        ${depth > 0 ? "border-l-2 border-[#3a3a3a]" : ""}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Handle */}
      <div
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing p-0.5"
      >
        <GripVertical size={16} className="text-gray-500" />
      </div>

      {/* Group Expand/Collapse Toggle */}
      {isGroup && onToggleExpand ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="p-0.5 hover:bg-[#3a3a3a] rounded"
        >
          {isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
        </button>
      ) : isGroup ? (
        <span className="w-4" />
      ) : null}

      {/* Type Icon */}
      <TypeIcon size={14} className={`shrink-0 ${isGroup ? "text-yellow-400" : object.visible ? "text-gray-400" : "text-gray-500 opacity-50"}`} />

      {/* Name */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-[#1a1a1a] border border-[#555] rounded px-1.5 py-0.5 text-sm text-gray-200 outline-none focus:border-blue-500"
        />
      ) : (
        <span
          className={`flex-1 text-sm truncate ${object.visible ? "text-gray-200" : "text-gray-500 opacity-50"}`}
          onDoubleClick={handleDoubleClick}
        >
          {object.name}
        </span>
      )}

      {/* Visibility Toggle */}
      <button
        onClick={handleToggleVisibility}
        className={`p-1 rounded hover:bg-[#3a3a3a] transition-colors ${object.visible ? "text-gray-400" : "text-gray-500 opacity-50"}`}
        title={object.visible ? "Hide" : "Show"}
      >
        {object.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* Lock Toggle */}
      <button
        onClick={handleToggleLock}
        className={`p-1 rounded hover:bg-[#3a3a3a] transition-colors ${!object.locked ? "text-gray-400" : "text-gray-500 opacity-50"}`}
        title={object.locked ? "Unlock" : "Lock"}
      >
        {object.locked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
    </div>
  );
}
