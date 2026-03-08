import type { LucideIcon } from "lucide-react";
import {
  Scissors,
  Copy,
  Clipboard,
  CopyPlus,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Group,
  Ungroup,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  MousePointer2,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from "lucide-react";

export interface MenuItemDef {
  id: string;
  type: "action" | "separator" | "submenu";
  label?: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  action?: () => void;
  children?: MenuItemDef[];
}

export interface ObjectMenuContext {
  isLocked: boolean;
  isVisible: boolean;
  isGroup: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  canGroup: boolean;
  onLock: () => void;
  onHide: () => void;
  onDelete: () => void;
  hasClipboard: boolean;
}

export interface CanvasMenuContext {
  onPaste: () => void;
  onSelectAll: () => void;
  hasClipboard: boolean;
}

export interface MultiSelectMenuContext {
  count: number;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onGroup: () => void;
  canGroup: boolean;
  onAlignLeft: () => void;
  onAlignCenterH: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignCenterV: () => void;
  onAlignBottom: () => void;
  onDistributeH: () => void;
  onDistributeV: () => void;
  onDelete: () => void;
  hasClipboard: boolean;
}

export function getObjectMenuItems(ctx: ObjectMenuContext): MenuItemDef[] {
  return [
    { id: "cut", type: "action", label: "Cut", icon: Scissors, shortcut: "⌘X", action: ctx.onCut },
    { id: "copy", type: "action", label: "Copy", icon: Copy, shortcut: "⌘C", action: ctx.onCopy },
    { id: "paste", type: "action", label: "Paste", icon: Clipboard, shortcut: "⌘V", disabled: !ctx.hasClipboard, action: ctx.onPaste },
    { id: "duplicate", type: "action", label: "Duplicate", icon: CopyPlus, shortcut: "⌘D", action: ctx.onDuplicate },
    { id: "sep1", type: "separator" },
    { id: "bringToFront", type: "action", label: "Bring to Front", icon: ArrowUpToLine, action: ctx.onBringToFront },
    { id: "bringForward", type: "action", label: "Bring Forward", icon: ArrowUp, shortcut: "⌘]", action: ctx.onBringForward },
    { id: "sendBackward", type: "action", label: "Send Backward", icon: ArrowDown, shortcut: "⌘[", action: ctx.onSendBackward },
    { id: "sendToBack", type: "action", label: "Send to Back", icon: ArrowDownToLine, action: ctx.onSendToBack },
    { id: "sep2", type: "separator" },
    ...(ctx.isGroup
      ? [{ id: "ungroup", type: "action" as const, label: "Ungroup", icon: Ungroup, shortcut: "⌘⇧G", action: ctx.onUngroup }]
      : [{ id: "group", type: "action" as const, label: "Group", icon: Group, shortcut: "⌘G", disabled: !ctx.canGroup, action: ctx.onGroup }]),
    { id: "sep3", type: "separator" },
    {
      id: "lock",
      type: "action",
      label: ctx.isLocked ? "Unlock" : "Lock",
      icon: ctx.isLocked ? Unlock : Lock,
      action: ctx.onLock,
    },
    {
      id: "visibility",
      type: "action",
      label: ctx.isVisible ? "Hide" : "Show",
      icon: ctx.isVisible ? EyeOff : Eye,
      action: ctx.onHide,
    },
    { id: "sep4", type: "separator" },
    { id: "delete", type: "action", label: "Delete", icon: Trash2, shortcut: "Del", action: ctx.onDelete },
  ];
}

export function getCanvasMenuItems(ctx: CanvasMenuContext): MenuItemDef[] {
  return [
    { id: "paste", type: "action", label: "Paste", icon: Clipboard, shortcut: "⌘V", disabled: !ctx.hasClipboard, action: ctx.onPaste },
    { id: "selectAll", type: "action", label: "Select All", icon: MousePointer2, shortcut: "⌘A", action: ctx.onSelectAll },
  ];
}

export function getMultiSelectMenuItems(ctx: MultiSelectMenuContext): MenuItemDef[] {
  const canDistribute = ctx.count >= 3;

  const alignSubmenu: MenuItemDef[] = [
    { id: "alignLeft", type: "action", label: "Align Left", icon: AlignHorizontalJustifyStart, action: ctx.onAlignLeft },
    { id: "alignCenterH", type: "action", label: "Align Center (H)", icon: AlignHorizontalJustifyCenter, action: ctx.onAlignCenterH },
    { id: "alignRight", type: "action", label: "Align Right", icon: AlignHorizontalJustifyEnd, action: ctx.onAlignRight },
    { id: "alignTop", type: "action", label: "Align Top", icon: AlignVerticalJustifyStart, action: ctx.onAlignTop },
    { id: "alignCenterV", type: "action", label: "Align Center (V)", icon: AlignVerticalJustifyCenter, action: ctx.onAlignCenterV },
    { id: "alignBottom", type: "action", label: "Align Bottom", icon: AlignVerticalJustifyEnd, action: ctx.onAlignBottom },
  ];

  const distributeSubmenu: MenuItemDef[] = [
    { id: "distributeH", type: "action", label: "Distribute Horizontally", icon: AlignHorizontalSpaceAround, disabled: !canDistribute, action: ctx.onDistributeH },
    { id: "distributeV", type: "action", label: "Distribute Vertically", icon: AlignVerticalSpaceAround, disabled: !canDistribute, action: ctx.onDistributeV },
  ];

  return [
    { id: "cut", type: "action", label: "Cut", icon: Scissors, shortcut: "⌘X", action: ctx.onCut },
    { id: "copy", type: "action", label: "Copy", icon: Copy, shortcut: "⌘C", action: ctx.onCopy },
    { id: "paste", type: "action", label: "Paste", icon: Clipboard, shortcut: "⌘V", disabled: !ctx.hasClipboard, action: ctx.onPaste },
    { id: "duplicate", type: "action", label: "Duplicate", icon: CopyPlus, shortcut: "⌘D", action: ctx.onDuplicate },
    { id: "sep1", type: "separator" },
    { id: "bringToFront", type: "action", label: "Bring to Front", icon: ArrowUpToLine, action: ctx.onBringToFront },
    { id: "bringForward", type: "action", label: "Bring Forward", icon: ArrowUp, shortcut: "⌘]", action: ctx.onBringForward },
    { id: "sendBackward", type: "action", label: "Send Backward", icon: ArrowDown, shortcut: "⌘[", action: ctx.onSendBackward },
    { id: "sendToBack", type: "action", label: "Send to Back", icon: ArrowDownToLine, action: ctx.onSendToBack },
    { id: "sep2", type: "separator" },
    { id: "group", type: "action", label: "Group", icon: Group, shortcut: "⌘G", disabled: !ctx.canGroup, action: ctx.onGroup },
    { id: "sep3", type: "separator" },
    { id: "align", type: "submenu", label: "Align", children: alignSubmenu },
    { id: "distribute", type: "submenu", label: "Distribute", children: distributeSubmenu },
    { id: "sep4", type: "separator" },
    { id: "delete", type: "action", label: "Delete", icon: Trash2, shortcut: "Del", action: ctx.onDelete },
  ];
}
