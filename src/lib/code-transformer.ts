/**
 * Transforms Node.js Canvas 2D generated code into browser-executable JavaScript.
 * Pure function — no DOM access, no side effects.
 */

interface TransformOptions {
  width: number;
  height: number;
}

const LOADIMAGE_POLYFILL = `function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + src.substring(0, 100)));
    img.src = src;
  });
}`;

export function transformCodeForBrowser(
  nodeCode: string,
  options: TransformOptions
): string {
  let code = nodeCode;

  // Rule 1: Remove require statements for canvas/skia-canvas/fs/qrcode/path
  code = code.replace(/^const\s+\{[^}]*\}\s*=\s*require\s*\(\s*['"]canvas['"]\s*\)\s*;?\s*$/gm, "");
  code = code.replace(/^const\s+\{[^}]*\}\s*=\s*require\s*\(\s*['"]skia-canvas['"]\s*\)\s*;?\s*$/gm, "");
  code = code.replace(/^const\s+fs\s*=\s*require\s*\(\s*['"]fs['"]\s*\)\s*;?\s*$/gm, "");
  code = code.replace(/^const\s+QRCode\s*=\s*require\s*\(\s*['"]qrcode['"]\s*\)\s*;?\s*$/gm, "");
  code = code.replace(/^const\s+path\s*=\s*require\s*\(\s*['"]path['"]\s*\)\s*;?\s*$/gm, "");

  // Rule 2: Remove font registration lines
  code = code.replace(/^\s*registerFont\s*\([^)]*\)\s*;?\s*$/gm, "");
  code = code.replace(/^\s*FontLibrary\.use\s*\([^)]*\)\s*;?\s*$/gm, "");

  // Rule 3: Replace canvas creation with DOM lookup + dimension assignment
  code = code.replace(
    /(?:const\s+canvas\s*=\s*)?createCanvas\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    (_match, w, h) =>
      `document.getElementById('canvas');\ncanvas.width = ${w};\ncanvas.height = ${h};`
  );
  code = code.replace(
    /(?:const\s+canvas\s*=\s*)?new\s+Canvas\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    (_match, w, h) =>
      `document.getElementById('canvas');\ncanvas.width = ${w};\ncanvas.height = ${h};`
  );

  // Fix up the canvas assignment — ensure "const canvas =" is present before the getElementById
  code = code.replace(
    /^([ \t]*)document\.getElementById\('canvas'\);/gm,
    "$1const canvas = document.getElementById('canvas');"
  );

  // Rule 4: Prepend loadImage polyfill
  code = LOADIMAGE_POLYFILL + "\n\n" + code;

  // Rule 5: Remove file system operations
  code = code.replace(/^\s*fs\.writeFileSync\s*\([^)]*\)\s*;?\s*$/gm, "");
  code = code.replace(/^\s*canvas\.saveAs\s*\([^)]*\)\s*;?\s*$/gm, "");
  code = code.replace(/^\s*const\s+buffer\s*=\s*canvas\.toBuffer\s*\([^)]*\)\s*;?\s*$/gm, "");

  // Rule 6: Remove the main invocation line
  code = code.replace(/^\s*generateImage\s*\(\s*\)\s*\.catch\s*\(\s*console\.error\s*\)\s*;?\s*$/gm, "");

  // Rule 7: Append await call for the async function
  code = code.trimEnd() + "\n\nawait generateImage();";

  // Rule 8: Wrap in async IIFE with try/catch and postMessage reporting
  code = `(async () => {\n  try {\n${code.split("\n").map(line => "    " + line).join("\n")}\n    parent.postMessage({ type: 'success' }, '*');\n  } catch (err) {\n    parent.postMessage({ type: 'error', message: err.message, line: null }, '*');\n  }\n})();`;

  return code;
}
