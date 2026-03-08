"use client";

import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";
import { useMemo } from "react";

interface CodeDisplayProps {
  code: string;
}

export default function CodeDisplay({ code }: CodeDisplayProps) {
  // Return null if code is empty
  if (!code) return null;

  // Highlight the code using Prism
  const highlightedCode = useMemo(() => {
    return Prism.highlight(code, Prism.languages.javascript, "javascript");
  }, [code]);

  // Split code into lines for line numbers
  const lines = code.split("\n");
  const lineCount = lines.length;

  return (
    <div
      className="code-display"
      style={{
        backgroundColor: "#1a1a2e",
        overflow: "auto",
        width: "100%",
        height: "100%",
      }}
    >
      <style jsx global>{`
        .code-display {
          --prism-background: #1a1a2e;
        }
        .code-display pre[class*="language-"] {
          background: #1a1a2e;
          margin: 0;
          padding: 0;
          font-size: 13px;
          line-height: 1.6;
          font-family: 'Fira Mono', 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
        }
        .code-display code[class*="language-"] {
          background: transparent;
          font-size: 13px;
          line-height: 1.6;
          font-family: 'Fira Mono', 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
        }
        /* Override Prism theme token colors */
        .code-display .token.comment,
        .code-display .token.prolog,
        .code-display .token.doctype,
        .code-display .token.cdata {
          color: #666; /* gray for comments */
        }
        .code-display .token.punctuation {
          color: #ccc;
        }
        .code-display .token.property,
        .code-display .token.tag,
        .code-display .token.boolean,
        .code-display .token.number,
        .code-display .token.constant,
        .code-display .token.symbol,
        .code-display .token.deleted {
          color: #f08d49; /* orange for numbers */
        }
        .code-display .token.selector,
        .code-display .token.attr-name,
        .code-display .token.string,
        .code-display .token.char,
        .code-display .token.builtin,
        .code-display .token.inserted {
          color: #7ec699; /* green for strings */
        }
        .code-display .token.operator,
        .code-display .token.entity,
        .code-display .token.url,
        .code-display .language-css .token.string,
        .code-display .style .token.string {
          color: #6196cc; /* blue */
        }
        .code-display .token.atrule,
        .code-display .token.attr-value,
        .code-display .token.keyword {
          color: #cc99cd; /* purple for keywords */
        }
        .code-display .token.function,
        .code-display .token.class-name {
          color: #6196cc; /* blue for functions */
        }
        .code-display .token.regex,
        .code-display .token.important,
        .code-display .token.variable {
          color: #f8c555;
        }
      `}</style>
      <div
        style={{
          display: "table",
          width: "100%",
          minHeight: "100%",
        }}
      >
        {/* Line numbers gutter */}
        <div
          style={{
            display: "table-cell",
            position: "sticky",
            left: 0,
            width: "48px",
            minWidth: "48px",
            maxWidth: "48px",
            backgroundColor: "#1a1a2e",
            paddingRight: "12px",
            textAlign: "right",
            userSelect: "none",
            verticalAlign: "top",
            zIndex: 1,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i + 1}
              style={{
                color: "#666",
                fontSize: "13px",
                lineHeight: "1.6",
                fontFamily: "'Fira Mono', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                height: "20.8px", // 13px * 1.6 line-height
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        {/* Code content */}
        <div
          style={{
            display: "table-cell",
            verticalAlign: "top",
            paddingLeft: "12px",
          }}
        >
          <pre className="language-javascript">
            <code
              className="language-javascript"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}
