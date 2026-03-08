import { NextRequest, NextResponse } from "next/server";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import type { TargetLibrary } from "@/types/editor";

// Eagerly require each native package with a static string literal so that
// deployment file-tracers (Vercel @vercel/nft, Replit, etc.) can detect them
// and include the native .node binaries in the deployment bundle.
// Dynamic require(variable) is opaque to static analysis — this is the fix.
/* eslint-disable @typescript-eslint/no-require-imports */
let _canvas: unknown = null;
let _skiaCanvas: unknown = null;
let _sharp: unknown = null;
let _jimp: unknown = null;
let _qrcode: unknown = null;
try { _canvas = require("canvas"); } catch { /* not available in this environment */ }
try { _skiaCanvas = require("skia-canvas"); } catch { /* not available */ }
try { _sharp = require("sharp"); } catch { /* not available */ }
try { _jimp = require("jimp"); } catch { /* not available */ }
try { _qrcode = require("qrcode"); } catch { /* not available */ }
/* eslint-enable @typescript-eslint/no-require-imports */

const preloadedModules: Record<string, unknown> = {
  canvas: _canvas,
  "skia-canvas": _skiaCanvas,
  sharp: _sharp,
  jimp: _jimp,
  qrcode: _qrcode,
  fs,
  path,
};

const TIMEOUT_MS = 15_000;

const ALLOWED_MODULES: Record<string, string[]> = {
  "node-canvas": ["canvas", "fs", "path", "qrcode"],
  "skia-canvas": ["skia-canvas", "fs", "path", "qrcode"],
  sharp: ["sharp", "fs", "path", "qrcode"],
  jimp: ["jimp", "fs", "path", "qrcode"],
};

function buildSandboxRequire(generator: TargetLibrary) {
  const allowed = ALLOWED_MODULES[generator] ?? [];
  let capturedBuffer: Buffer | null = null;

  const fsShim = {
    writeFileSync(_path: string, data: Buffer | string) {
      capturedBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    },
    readFileSync: fs.readFileSync,
    existsSync: fs.existsSync,
  };

  return {
    require: (mod: string) => {
      if (mod === "fs") return fsShim;
      if (mod === "path") return path;
      if (!allowed.includes(mod)) {
        throw new Error(`Module "${mod}" is not allowed in sandbox`);
      }

      const realModule = preloadedModules[mod];
      if (realModule == null) {
        throw new Error(
          `Module "${mod}" is not available in this environment.`
        );
      }

      if (mod === "canvas") {
        return { ...(realModule as object), registerFont: () => {} };
      }

      if (mod === "skia-canvas") {
        const { Canvas, loadImage, FontLibrary, Path2D } = realModule as Record<string, unknown>;
        return {
          Canvas,
          createCanvas: (w: number, h: number) => new (Canvas as new (w: number, h: number) => unknown)(w, h),
          loadImage,
          registerFont: () => {},
          FontLibrary: { ...(FontLibrary as object), use: () => {} },
          Path2D,
        };
      }

      return realModule;
    },
    getCapturedBuffer: () => capturedBuffer,
  };
}

function transformCodeForExecution(
  code: string,
  generator: TargetLibrary,
  images?: Record<string, string>
): string {
  let transformed = code;

  // Replace image file paths with data URLs so the sandbox doesn't need disk access
  if (images) {
    for (const [name, dataUrl] of Object.entries(images)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      transformed = transformed.replace(
        new RegExp(`(loadImage|sharp|Jimp\\.read)\\s*\\(\\s*["']\\./images/${escaped}["']`, "g"),
        `$1("${dataUrl}"`
      );
    }
  }

  // Remove the auto-invocation line
  transformed = transformed.replace(
    /^\s*generateImage\s*\(\s*\)\s*\.catch\s*\(\s*console\.error\s*\)\s*;?\s*$/m,
    ""
  );

  // Remove font registration lines (fonts fall back to system defaults)
  transformed = transformed.replace(/^\s*registerFont\s*\([^)]*\)\s*;?\s*$/gm, "");
  transformed = transformed.replace(/^\s*FontLibrary\.use\s*\([^)]*\)\s*;?\s*$/gm, "");

  if (generator === "jimp") {
    // Redirect writeAsync to capture buffer instead of writing to disk
    transformed = transformed.replace(
      /await\s+image\.writeAsync\s*\(\s*["'][^"']*["']\s*\)\s*;?/g,
      `const __buf = await image.getBufferAsync("image/png");
  require("fs").writeFileSync("output.png", __buf);`
    );
  }

  if (generator === "skia-canvas") {
    // skia-canvas toBuffer is async — ensure it's awaited
    transformed = transformed.replace(
      /const\s+buffer\s*=\s*canvas\.toBuffer\(/g,
      "const buffer = await canvas.toBuffer("
    );
  }

  // Wrap in async IIFE
  transformed = `(async () => {\n${transformed}\nawait generateImage();\n})()`;

  return transformed;
}

export async function POST(request: NextRequest) {
  let body: { code: string; generator: TargetLibrary; images?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { type: "error", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { code, generator, images } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { type: "error", message: "Missing or invalid 'code' field" },
      { status: 400 }
    );
  }

  if (!["node-canvas", "skia-canvas", "sharp", "jimp"].includes(generator)) {
    return NextResponse.json(
      { type: "error", message: `Unsupported generator: ${generator}` },
      { status: 400 }
    );
  }

  try {
    const transformed = transformCodeForExecution(code, generator, images);
    const { require: sandboxRequire, getCapturedBuffer } =
      buildSandboxRequire(generator);

    const sandbox = vm.createContext({
      require: sandboxRequire,
      console: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Promise,
      process: { env: {}, argv: [], cwd: () => process.cwd() },
      URL,
      TextEncoder,
      TextDecoder,
    });

    const script = new vm.Script(transformed, {
      filename: "generated-code.js",
    });

    const resultPromise = script.runInContext(sandbox);

    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Execution timed out (${TIMEOUT_MS / 1000}s limit)`)),
        TIMEOUT_MS
      );
    });

    try {
      await Promise.race([resultPromise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }

    const capturedBuffer = getCapturedBuffer();

    if (!capturedBuffer) {
      return NextResponse.json({
        type: "error",
        message: "No image output was captured. The generated code may not have produced an image.",
      });
    }

    const base64 = capturedBuffer.toString("base64");
    const imageDataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ type: "success", imageDataUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ type: "error", message });
  }
}
