import type { EditorState, TargetLibrary } from "@/types/editor";
import { generateNodeCanvasCode } from "./node-canvas-generator";

/**
 * Dispatcher function that routes to the appropriate library-specific generator.
 * @param state - Full editor state snapshot
 * @param library - Target library identifier
 * @returns Complete, runnable JavaScript code as a string
 */
export function generateCode(state: EditorState, library: TargetLibrary): string {
  switch (library) {
    case "node-canvas":
      return generateNodeCanvasCode(state);
    case "sharp":
    case "jimp":
    case "skia-canvas":
      return `// Code generation for "${library}" is not yet supported.\n// Please select "node-canvas" as the target library.`;
    default:
      return `// Unknown target library: ${library}`;
  }
}
