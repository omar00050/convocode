"use client";

import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { AlignmentType, DistributionType } from "@/lib/alignment-utils";

interface AlignmentToolbarProps {
  selectedCount: number;
}

interface AlignButtonProps {
  icon: React.ElementType;
  tooltip: string;
  disabled?: boolean;
  onClick: () => void;
}

function AlignButton({ icon: Icon, tooltip, disabled, onClick }: AlignButtonProps) {
  return (
    <button
      type="button"
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? "opacity-40 pointer-events-none text-zinc-500"
          : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-zinc-100"
      }`}
    >
      <Icon size={16} />
    </button>
  );
}

export default function AlignmentToolbar({ selectedCount }: AlignmentToolbarProps) {
  const alignSelectedObjects = useEditorStore((state) => state.alignSelectedObjects);
  const distributeSelectedObjects = useEditorStore((state) => state.distributeSelectedObjects);

  const canDistribute = selectedCount >= 3;

  const align = (type: AlignmentType) => alignSelectedObjects(type);
  const distribute = (type: DistributionType) => distributeSelectedObjects(type);

  return (
    <div>
      <p className="text-xs text-zinc-400 font-medium mb-1.5">Align &amp; Distribute</p>
      <div className="flex items-center gap-1">
        <AlignButton icon={AlignHorizontalJustifyStart} tooltip="Align left edges" onClick={() => align("left")} />
        <AlignButton icon={AlignHorizontalJustifyCenter} tooltip="Align horizontal centers" onClick={() => align("centerH")} />
        <AlignButton icon={AlignHorizontalJustifyEnd} tooltip="Align right edges" onClick={() => align("right")} />
        <AlignButton icon={AlignVerticalJustifyStart} tooltip="Align top edges" onClick={() => align("top")} />
        <AlignButton icon={AlignVerticalJustifyCenter} tooltip="Align vertical centers" onClick={() => align("centerV")} />
        <AlignButton icon={AlignVerticalJustifyEnd} tooltip="Align bottom edges" onClick={() => align("bottom")} />

        <div className="w-px h-5 bg-zinc-600 mx-1 self-center" />

        <AlignButton
          icon={AlignHorizontalSpaceAround}
          tooltip="Distribute horizontally"
          disabled={!canDistribute}
          onClick={() => distribute("horizontal")}
        />
        <AlignButton
          icon={AlignVerticalSpaceAround}
          tooltip="Distribute vertically"
          disabled={!canDistribute}
          onClick={() => distribute("vertical")}
        />
      </div>
    </div>
  );
}
