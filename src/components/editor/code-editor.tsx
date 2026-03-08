"use client";

import { useRef, useEffect, useCallback } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import { Clipboard, Undo2, Download } from "lucide-react";

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onCopy: () => void;
  onReset: () => void;
  onDownload: () => void;
  hasEdits: boolean;
  generatorName: string;
}

const EDITOR_FONT = "'Fira Mono', 'JetBrains Mono', 'Consolas', 'Courier New', monospace";
const EDITOR_FONT_SIZE = "13px";
const EDITOR_LINE_HEIGHT = "1.6";
const EDITOR_PADDING = "12px";

export default function CodeEditor({
  code,
  onChange,
  onCopy,
  onReset,
  onDownload,
  hasEdits,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const codeElRef = useRef<HTMLElement>(null);

  // Update syntax highlighting when code changes
  useEffect(() => {
    if (codeElRef.current) {
      codeElRef.current.innerHTML = Prism.highlight(
        code,
        Prism.languages.javascript,
        "javascript"
      );
    }
  }, [code]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    if (!ta || !pre || !gutter) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation();
      const ta = e.currentTarget;

      if (e.key === "Tab") {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode = code.substring(0, start) + "  " + code.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const start = ta.selectionStart;
        const lineStart = code.lastIndexOf("\n", start - 1) + 1;
        const currentLine = code.substring(lineStart, start);
        const indentMatch = currentLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : "";
        const insertion = "\n" + indent;
        const newCode = code.substring(0, start) + insertion + code.substring(ta.selectionEnd);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insertion.length;
        });
      }
    },
    [code, onChange]
  );

  const lineCount = (code.match(/\n/g) || []).length + 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#1e1e1e",
        overflow: "hidden",
      }}
    >
      {/* Prism token styles scoped to this editor */}
      <style>{`
        .code-editor-pre .token.comment,
        .code-editor-pre .token.prolog,
        .code-editor-pre .token.doctype,
        .code-editor-pre .token.cdata { color: #666; }
        .code-editor-pre .token.punctuation { color: #ccc; }
        .code-editor-pre .token.property,
        .code-editor-pre .token.tag,
        .code-editor-pre .token.boolean,
        .code-editor-pre .token.number,
        .code-editor-pre .token.constant,
        .code-editor-pre .token.symbol,
        .code-editor-pre .token.deleted { color: #f08d49; }
        .code-editor-pre .token.selector,
        .code-editor-pre .token.attr-name,
        .code-editor-pre .token.string,
        .code-editor-pre .token.char,
        .code-editor-pre .token.builtin,
        .code-editor-pre .token.inserted { color: #7ec699; }
        .code-editor-pre .token.operator,
        .code-editor-pre .token.entity,
        .code-editor-pre .token.url,
        .code-editor-pre .language-css .token.string,
        .code-editor-pre .style .token.string { color: #6196cc; }
        .code-editor-pre .token.atrule,
        .code-editor-pre .token.attr-value,
        .code-editor-pre .token.keyword { color: #cc99cd; }
        .code-editor-pre .token.function,
        .code-editor-pre .token.class-name { color: #6196cc; }
        .code-editor-pre .token.regex,
        .code-editor-pre .token.important,
        .code-editor-pre .token.variable { color: #f8c555; }
        .code-editor-textarea::-webkit-scrollbar { width: 6px; height: 6px; }
        .code-editor-textarea::-webkit-scrollbar-track { background: #1e1e1e; }
        .code-editor-textarea::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
      `}</style>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 10px",
          borderBottom: "1px solid #2a2a2a",
          flexShrink: 0,
          backgroundColor: "#252525",
        }}
      >
        <button
          onClick={onCopy}
          title="Copy code"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            color: "#ccc",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <Clipboard size={12} />
          Copy
        </button>
        <button
          onClick={onReset}
          disabled={!hasEdits}
          title="Reset to generated code"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            color: hasEdits ? "#ccc" : "#555",
            cursor: hasEdits ? "pointer" : "not-allowed",
            fontSize: "11px",
          }}
        >
          <Undo2 size={12} />
          Reset
        </button>
        <button
          onClick={onDownload}
          title="Download as .js file"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "4px",
            color: "#ccc",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          <Download size={12} />
          Download
        </button>
      </div>

      {/* Editor area */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Line number gutter */}
        <div
          ref={gutterRef}
          style={{
            width: "50px",
            minWidth: "50px",
            backgroundColor: "#252525",
            color: "#666",
            fontFamily: EDITOR_FONT,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            padding: `${EDITOR_PADDING} 8px ${EDITOR_PADDING} 0`,
            textAlign: "right",
            userSelect: "none",
            overflowY: "hidden",
            overflowX: "hidden",
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ whiteSpace: "pre" }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area: pre + textarea stacked */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          {/* Highlighted pre — behind textarea */}
          <pre
            ref={preRef}
            className="code-editor-pre"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: EDITOR_PADDING,
              fontFamily: EDITOR_FONT,
              fontSize: EDITOR_FONT_SIZE,
              lineHeight: EDITOR_LINE_HEIGHT,
              whiteSpace: "pre",
              wordWrap: "normal",
              overflowWrap: "normal",
              tabSize: 2,
              overflowX: "auto",
              overflowY: "auto",
              pointerEvents: "none",
              color: "#ccc",
              backgroundColor: "transparent",
            }}
          >
            <code ref={codeElRef} className="language-javascript" />
          </pre>

          {/* Transparent textarea — on top for input */}
          <textarea
            ref={textareaRef}
            className="code-editor-textarea"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCorrect="off"
            autoComplete="off"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: EDITOR_PADDING,
              fontFamily: EDITOR_FONT,
              fontSize: EDITOR_FONT_SIZE,
              lineHeight: EDITOR_LINE_HEIGHT,
              whiteSpace: "pre",
              wordWrap: "normal",
              overflowWrap: "normal",
              tabSize: 2,
              resize: "none",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "transparent",
              caretColor: "#fff",
              overflowX: "auto",
              overflowY: "auto",
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </div>
  );
}
