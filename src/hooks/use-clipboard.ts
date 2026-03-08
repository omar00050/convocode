import type { AnyCanvasObject } from "@/types/editor";
import { deepCloneWithNewIds } from "@/lib/group-utils";

/**
 * Module-level clipboard state.
 * Not a React hook - just a plain TypeScript module with getter/setter functions.
 * Clipboard is ephemeral and does not need to trigger re-renders.
 */

let clipboard: AnyCanvasObject[] | null = null;
let pasteOffset: number = 0;

export function getClipboard(): AnyCanvasObject[] | null {
  return clipboard;
}

export function setClipboard(items: AnyCanvasObject[]): void {
  // Deep clone with new IDs (handles groups recursively)
  clipboard = items.map((item) => deepCloneWithNewIds(item));
  // Reset paste offset when copying new items
  pasteOffset = 0;
}

export function getPasteOffset(): number {
  return pasteOffset;
}

export function incrementPasteOffset(): void {
  pasteOffset += 20;
}
