"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { getEffectiveFont, resolveDirection } from "@/lib/font-utils";
import {
  applyStyleToRange,
  getStylesInRange,
  insertTextAtIndex,
  deleteTextRange,
} from "@/lib/rich-text-operations";
import {
  plainTextToSegments,
  mergeAdjacentSegments,
  segmentsToPlainText,
  isPlainRichText,
} from "@/types/rich-text";
import type { RichTextSegment, RangeStyles } from "@/types/rich-text";
import InlineFormatToolbar from "@/components/editor/inline-format-toolbar";
import type { TextObject } from "@/types/editor";

interface TextEditorOverlayProps {
  obj: TextObject;
  zoom: number;
  canvasOffset: { x: number; y: number };
  onEndEdit: (id: string, newContent: string) => void;
}

export default function TextEditorOverlay({
  obj,
  zoom,
  canvasOffset,
  onEndEdit,
}: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateObject = useEditorStore((state) => state.updateObject);
  const globalFont = useEditorStore((state) => state.globalFont);

  // Rich text state
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [richContent, setRichContent] = useState<RichTextSegment[]>(() => {
    // Initialize richContent from obj, or create from plain text
    if (obj.richContent && obj.richContent.length > 0) {
      return obj.richContent;
    }
    return plainTextToSegments(obj.content);
  });

  // Resolve effective font from cascade
  const fontFamily = getEffectiveFont(obj, { globalFont });

  // Capture resolved direction once at mount to prevent cursor jumps during editing
  const initialDir = useRef<"rtl" | "ltr">(resolveDirection(obj));

  // Sync richContent to store when it changes
  const syncRichContent = useCallback((segments: RichTextSegment[]) => {
    const merged = mergeAdjacentSegments(segments);
    const plainText = segmentsToPlainText(merged);
    setRichContent(merged);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateObject(obj.id, { richContent: merged, content: plainText } as any, true);
  }, [obj.id, updateObject]);

  // Initialize richContent in store if needed (plain text object being edited for first time)
  useEffect(() => {
    if (!obj.richContent || obj.richContent.length === 0) {
      const segments = plainTextToSegments(obj.content);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateObject(obj.id, { richContent: segments } as any, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus and select on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }, []);

  // Hide toolbar on unmount
  useEffect(() => {
    return () => {
      setShowToolbar(false);
    };
  }, []);

  const handleBlur = () => {
    // Commit richContent and content on exit
    const merged = mergeAdjacentSegments(richContent);
    const plainText = segmentsToPlainText(merged);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateObject(obj.id, { richContent: merged, content: plainText } as any);
    setShowToolbar(false);
    onEndEdit(obj.id, plainText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      const merged = mergeAdjacentSegments(richContent);
      const plainText = segmentsToPlainText(merged);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateObject(obj.id, { richContent: merged, content: plainText } as any);
      setShowToolbar(false);
      onEndEdit(obj.id, plainText);
    }
  };

  // Track text selection for toolbar display
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start !== end) {
      setSelectionRange({ start, end });
      setShowToolbar(true);
    } else {
      setSelectionRange(null);
      setShowToolbar(false);
    }
  }, []);

  // Track text changes to keep richContent in sync
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const newValue = textarea.value;
    const oldValue = segmentsToPlainText(richContent);

    if (newValue === oldValue) return;

    // Determine the type of change by comparing old and new values
    // Simple approach: find the diff region using selectionStart as a hint
    const cursorPos = textarea.selectionStart ?? newValue.length;
    const lenDiff = newValue.length - oldValue.length;

    let newSegments: RichTextSegment[];

    if (lenDiff > 0) {
      // Characters were inserted
      // Find where the insertion happened - use the cursor position minus the inserted length
      const insertEnd = cursorPos;
      const insertStart = cursorPos - lenDiff;
      const insertedText = newValue.slice(insertStart, insertEnd);

      // Find if there's a deletion in the old text before the insertion
      // For a simple case: the old text up to insertStart matches new text up to insertStart
      newSegments = insertTextAtIndex(richContent, insertStart, insertedText);
    } else if (lenDiff < 0) {
      // Characters were deleted
      // Find the deletion range
      // The new text and old text share a common prefix and suffix
      let prefixLen = 0;
      while (prefixLen < newValue.length && prefixLen < oldValue.length && newValue[prefixLen] === oldValue[prefixLen]) {
        prefixLen++;
      }
      const deleteStart = prefixLen;
      const deleteEnd = deleteStart + (-lenDiff);

      newSegments = deleteTextRange(richContent, deleteStart, deleteEnd);
    } else {
      // Same length - replacement (e.g., paste with same size or autocorrect)
      // Find where it differs
      let prefixLen = 0;
      while (prefixLen < newValue.length && newValue[prefixLen] === oldValue[prefixLen]) {
        prefixLen++;
      }
      let suffixLen = 0;
      while (
        suffixLen < newValue.length - prefixLen &&
        newValue[newValue.length - 1 - suffixLen] === oldValue[oldValue.length - 1 - suffixLen]
      ) {
        suffixLen++;
      }
      const deleteEnd = oldValue.length - suffixLen;
      const insertedText = newValue.slice(prefixLen, newValue.length - suffixLen);

      let tempSegments = deleteTextRange(richContent, prefixLen, deleteEnd);
      if (insertedText) {
        tempSegments = insertTextAtIndex(tempSegments, prefixLen, insertedText);
      }
      newSegments = tempSegments;
    }

    syncRichContent(newSegments);
  }, [richContent, syncRichContent]);

  // Format handler for toolbar
  const handleFormat = useCallback((property: string, value: unknown) => {
    if (!selectionRange) return;
    const { start, end } = selectionRange;

    let styleToApply: Partial<RichTextSegment> = {};

    switch (property) {
      case "fontWeight":
        styleToApply = { fontWeight: value as "normal" | "bold" };
        break;
      case "fontStyle":
        styleToApply = { fontStyle: value as "normal" | "italic" };
        break;
      case "fontSize":
        styleToApply = { fontSize: value as number };
        break;
      case "fill":
        styleToApply = { fill: value as string };
        break;
      case "textDecoration":
        styleToApply = { textDecoration: value as RichTextSegment["textDecoration"] };
        break;
    }

    if (Object.keys(styleToApply).length > 0) {
      const newSegments = applyStyleToRange(richContent, start, end, styleToApply);
      syncRichContent(newSegments);
    }
  }, [selectionRange, richContent, syncRichContent]);

  // Compute toolbar position (above textarea, shift below if near top)
  const computeToolbarPosition = () => {
    const left = obj.x * zoom + canvasOffset.x;
    const top = obj.y * zoom + canvasOffset.y;
    const width = obj.width * zoom;
    const toolbarHeight = 44;
    const toolbarWidth = 300;

    const toolbarTop = top - toolbarHeight - 8;
    const toolbarLeft = left + (width / 2) - (toolbarWidth / 2);

    if (toolbarTop < 0) {
      // Place below the textarea
      const textareaHeight = obj.height * zoom;
      return {
        x: Math.max(0, toolbarLeft),
        y: top + textareaHeight + 8,
      };
    }

    return {
      x: Math.max(0, toolbarLeft),
      y: toolbarTop,
    };
  };

  // Compute selected styles for toolbar
  const selectedStyles: RangeStyles | null = (() => {
    if (!selectionRange || !richContent) return null;
    return getStylesInRange(richContent, selectionRange.start, selectionRange.end, obj, globalFont);
  })();

  // Calculate position and dimensions with zoom
  const left = obj.x * zoom + canvasOffset.x;
  const top = obj.y * zoom + canvasOffset.y;
  const width = obj.width * zoom;
  const fontSize = obj.fontSize * zoom;

  const toolbarPosition = computeToolbarPosition();

  return (
    <div ref={containerRef} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0 }}>
      {/* Toolbar */}
      {showToolbar && selectedStyles && (
        <InlineFormatToolbar
          position={toolbarPosition}
          selectedStyles={selectedStyles}
          onFormat={handleFormat}
        />
      )}

      {/* Textarea for text input */}
      <textarea
        ref={textareaRef}
        defaultValue={obj.content}
        dir={initialDir.current}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onSelect={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        style={{
          position: "absolute",
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: obj.fontWeight,
          fontStyle: obj.fontStyle,
          color: obj.fill,
          textAlign: initialDir.current === "rtl" ? "right" : "left",
          lineHeight: obj.lineHeight,
          transform: `rotate(${obj.rotation}deg)`,
          transformOrigin: "top left",
          background: "none",
          border: "none",
          outline: "none",
          resize: "none",
          overflow: "hidden",
          padding: 0,
          margin: 0,
          zIndex: 1000,
        }}
      />
    </div>
  );
}
