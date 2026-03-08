"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import type { MenuItemDef } from "@/lib/context-menu-items";

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: MenuItemDef[];
  onClose: () => void;
}

interface SubMenuPanelProps {
  items: MenuItemDef[];
  parentRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

function SubMenuPanel({ items, parentRef, onClose }: SubMenuPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!parentRef.current || !ref.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const menuRect = ref.current.getBoundingClientRect();
    let x = parentRect.right + 4;
    let y = parentRect.top;

    if (x + menuRect.width > window.innerWidth - 8) {
      x = parentRect.left - menuRect.width - 4;
    }
    if (y + menuRect.height > window.innerHeight - 8) {
      y = window.innerHeight - menuRect.height - 8;
    }

    setPos({ x, y });
  }, [parentRef]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 10000 }}
      className="bg-zinc-900 border border-zinc-700 shadow-xl shadow-black/50 rounded-lg py-1 min-w-[180px]"
    >
      {items.map((item) => (
        <MenuRow key={item.id} item={item} onClose={onClose} />
      ))}
    </div>
  );
}

interface MenuRowProps {
  item: MenuItemDef;
  onClose: () => void;
}

function MenuRow({ item, onClose }: MenuRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showSub, setShowSub] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (item.type === "separator") {
    return <div className="h-px bg-zinc-700 my-1 mx-1" />;
  }

  const isDisabled = item.disabled;

  const handleClick = () => {
    if (isDisabled || item.type === "submenu") return;
    item.action?.();
    onClose();
  };

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (item.type === "submenu") {
      openTimer.current = setTimeout(() => setShowSub(true), 150);
    }
  };

  const handleMouseLeave = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (item.type === "submenu") {
      closeTimer.current = setTimeout(() => setShowSub(false), 200);
    }
  };

  const Icon = item.icon;

  return (
    <div
      ref={rowRef}
      className={`relative flex items-center gap-2 px-3 py-1.5 cursor-default select-none
        ${isDisabled ? "text-zinc-600 cursor-default" : "text-zinc-200 hover:bg-zinc-700 cursor-pointer"}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {Icon ? (
        <Icon size={16} className={`shrink-0 ${isDisabled ? "text-zinc-600" : "text-zinc-400"}`} />
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span className="flex-1 text-sm">{item.label}</span>
      {item.shortcut && (
        <span className="text-xs text-zinc-500 ml-4">{item.shortcut}</span>
      )}
      {item.type === "submenu" && (
        <ChevronRight size={14} className="text-zinc-500 ml-1" />
      )}

      {/* Submenu panel */}
      {item.type === "submenu" && showSub && item.children && (
        <SubMenuPanel
          items={item.children}
          parentRef={rowRef as React.RefObject<HTMLElement | null>}
          onClose={onClose}
        />
      )}
    </div>
  );
}

export default function ContextMenu({ visible, position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const menu = menuRef.current;
    const { width, height } = menu.getBoundingClientRect();
    let x = position.x;
    let y = position.y;

    if (x + width > window.innerWidth - 8) x = window.innerWidth - width - 8;
    if (y + height > window.innerHeight - 8) y = window.innerHeight - height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setAdjustedPos({ x, y });
  }, [visible, position]);

  // Close on click outside, Escape, scroll, resize
  useEffect(() => {
    if (!visible) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleScrollOrResize = () => onClose();

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 9999,
      }}
      className="bg-zinc-900 border border-zinc-700 shadow-xl shadow-black/50 rounded-lg py-1 min-w-[200px]"
    >
      {items.map((item) => (
        <MenuRow key={item.id} item={item} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}
