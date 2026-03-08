# ConvoCode — Visual Canvas Code Generator

A stateless, client-side web application where you design visuals on a canvas and generate runnable **Node.js code** that reproduces your design using a target library (node-canvas, sharp, jimp, or skia-canvas).

Design once, deploy the generated code on any server — no runtime dependency on this app.

---

## What It Does

1. **Design** — Compose layouts with text, images, shapes, QR codes, icons, and groups on an infinite canvas.
2. **Generate** — The app converts your design into self-contained Node.js code with all coordinates, fonts, colors, and effects baked in.
3. **Run** — Execute the generated code on your server or develop it further. The output is a standalone script — no proprietary SDK required.

---

## Core Principles

| Principle | Detail |
|-----------|--------|
| **Stateless** | No database, no auth, no API routes. Everything lives in-browser via Zustand stores. |
| **Client-side only** | No server rendering for canvas. Konva.js components are always dynamically imported with `ssr: false`. |
| **No persistence** | No localStorage or sessionStorage. Each session starts fresh. |
| **Self-contained output** | Generated code includes all instructions (`npm install`, font loading, image loading) — ready to run. |
| **Allowed packages only** | next, react, react-dom, konva, react-konva, zustand, prismjs, file-saver, lucide-react, tailwindcss. Nothing else. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Canvas | Konva.js 9 + react-konva 18 |
| Syntax Highlighting | Prism.js |
| Icons | Lucide React |

---

## Features (V1)

### Canvas Objects
- **Text** — Rich text with per-segment formatting (bold, italic, underline, color, size), text paths (arc, circle, wave), RTL support
- **Images** — Upload with filters (brightness, contrast, saturation, blur, sepia, hue-rotate), masks (circle, star, heart, hexagon, diamond), borders, crop, flip
- **Shapes** — 15+ types (rect, circle, triangle, polygon, star, arrow, diamond, line, heart, badge), custom pen-tool paths, icon shapes from Lucide
- **QR Codes** — Configurable data, error correction, colors, padding, style (square/rounded/dots)
- **Groups** — Nest objects, enter/exit group editing, up to 3 levels deep

### Fill System
- Solid color, linear gradient, radial gradient, conic gradient, pattern fills (dots, lines, crosshatch, checkerboard, and more)

### Design Tools
- **Select** (V) — Move, resize, rotate with transformer handles
- **Crop** (C) — Crop images with drag handles
- **Pen** (P) — Bezier curves with rubber band preview, freeform pen mode, add/delete/convert anchor points
- **Text** (T) — Click to place, double-click to edit inline, vertical text (Shift+T)
- **Shapes** (U) — Draw rect, rounded rect, ellipse, polygon, line by dragging
- **Pan** (H) — Drag to scroll canvas; also Space+drag
- **Zoom** (Z) — Click to zoom in; Shift+Z to zoom out; Ctrl+scroll

### Layers Panel
- Drag-to-reorder, visibility toggle, lock toggle
- Right-click context menu (cut, copy, paste, duplicate, delete, group, arrange)
- Layer search, multi-select with Ctrl+click

### Properties Panel
- Per-object-type editors (text, image, shape, QR code, canvas background)
- Shadow effects (color, blur, offset)
- 16 blend modes (Canvas 2D composite operations)
- Opacity control

### Rulers & Guides
- Drag from rulers to create guides
- Grid overlay with snap alignment

### Code Generation
- **node-canvas** — Full support for all object types, fonts, filters, gradients, patterns, shadows
- **sharp** / **jimp** / **skia-canvas** — Stub generators (marked for implementation)
- Code playground with editable code, execute button, live preview

### Export
- PNG (0.5x, 1x, 2x, 3x), JPEG (quality slider), WebP (quality slider), SVG, PDF

### Keyboard Shortcuts
40+ bindings including undo/redo, copy/paste, selection, zoom, tool switching, alignment, grouping.

---

## Project Structure

```
src/
  app/                          # Next.js pages + API route
  components/
    canvas-objects/             # Konva wrappers (image, text, shape, QR, group, transformer)
    editor/                     # All editor UI components (toolbar, panels, overlays, modals)
    ui/                         # Reusable primitives (color picker, slider, toggle, gradient editor)
    new-project/                # Project creation screen (presets, custom, from image)
  stores/                       # Zustand stores (editor, history, color)
  hooks/                        # Keyboard shortcuts, font loader, clipboard
  generators/                   # Code generation engines + helpers
  lib/                          # Utilities (fonts, shapes, paths, snapping, alignment, QR encoding, export)
  types/                        # TypeScript definitions (editor, gradient, pattern, rich-text)
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select a canvas size, and start designing.

---

## Using the Generated Code

1. Design your layout in the canvas editor.
2. Open the code panel (Ctrl+J) or click "Code" in the toolbar.
3. Copy or download the generated Node.js file.
4. On your server:

```bash
npm install canvas   # or sharp, jimp, skia-canvas
node generated-code.js
```

The script outputs an image file with your design reproduced pixel-perfect.

---

## License

Private project.
