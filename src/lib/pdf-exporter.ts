/**
 * Minimal PDF 1.4 generator — embeds a JPEG image in a single-page PDF.
 * Pure utility module, no browser APIs beyond TextEncoder/atob.
 */

type PdfPageSize = "match" | "a4" | "letter";

const PDF_PAGE_SIZES = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
} as const;

interface PdfOptions {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  pageSize: PdfPageSize;
}

export function exportToPDF(options: PdfOptions): Uint8Array {
  const { imageDataUrl, imageWidth, imageHeight, pageSize } = options;

  if (!imageDataUrl || !imageDataUrl.startsWith("data:")) {
    throw new Error("Invalid image data URL");
  }

  const jpegBytes = dataUrlToBytes(imageDataUrl);
  if (jpegBytes.length === 0) {
    throw new Error("Failed to decode JPEG data");
  }

  // Page dimensions and image placement
  const { pageW, pageH, imgW, imgH, imgX, imgY } = computeLayout(
    imageWidth,
    imageHeight,
    pageSize
  );

  const enc = new TextEncoder();

  // Build objects as byte arrays, tracking offsets
  const offsets: number[] = [];
  const parts: Uint8Array[] = [];

  function appendText(text: string) {
    parts.push(enc.encode(text));
  }

  function currentOffset(): number {
    return parts.reduce((acc, p) => acc + p.length, 0);
  }

  // PDF header
  appendText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n\n");

  // Object 1: Catalog
  offsets.push(currentOffset());
  appendText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n\n");

  // Object 2: Pages
  offsets.push(currentOffset());
  appendText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n\n");

  // Object 3: Page
  offsets.push(currentOffset());
  appendText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R\n` +
    `/MediaBox [0 0 ${pageW} ${pageH}]\n` +
    `/Contents 4 0 R\n` +
    `/Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n\n`
  );

  // Object 4: Content stream — draw image
  const contentStream =
    `q ${imgW.toFixed(4)} 0 0 ${imgH.toFixed(4)} ${imgX.toFixed(4)} ${imgY.toFixed(4)} cm /Img Do Q`;
  const contentBytes = enc.encode(contentStream);

  offsets.push(currentOffset());
  appendText(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  parts.push(contentBytes);
  appendText("\nendstream\nendobj\n\n");

  // Object 5: Image XObject (JPEG stream)
  offsets.push(currentOffset());
  const imageHeader =
    `5 0 obj\n<< /Type /XObject /Subtype /Image\n` +
    `/Width ${imageWidth} /Height ${imageHeight}\n` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8\n` +
    `/Filter /DCTDecode\n` +
    `/Length ${jpegBytes.length} >>\nstream\n`;

  appendText(imageHeader);
  parts.push(jpegBytes);
  appendText("\nendstream\nendobj\n\n");

  // xref table
  const xrefOffset = currentOffset();
  appendText("xref\n");
  appendText(`0 6\n`);
  appendText("0000000000 65535 f \n"); // Note: trailing space is required
  for (const offset of offsets) {
    appendText(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }

  // Trailer
  appendText(`\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Concatenate all parts
  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return new Uint8Array(0);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface PdfLayout {
  pageW: number;
  pageH: number;
  imgW: number;
  imgH: number;
  imgX: number;
  imgY: number;
}

function computeLayout(
  imageWidth: number,
  imageHeight: number,
  pageSize: PdfPageSize
): PdfLayout {
  if (pageSize === "match") {
    return {
      pageW: imageWidth,
      pageH: imageHeight,
      imgW: imageWidth,
      imgH: imageHeight,
      imgX: 0,
      imgY: 0,
    };
  }

  const base = PDF_PAGE_SIZES[pageSize];
  const isLandscape = imageWidth > imageHeight;

  const pageW = isLandscape ? base.height : base.width;
  const pageH = isLandscape ? base.width : base.height;

  const margin = 10;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;
  const scale = Math.min(availW / imageWidth, availH / imageHeight);

  const imgW = imageWidth * scale;
  const imgH = imageHeight * scale;
  const imgX = (pageW - imgW) / 2;
  // PDF Y-axis is bottom-up: position from bottom
  const imgY = (pageH - imgH) / 2;

  return { pageW, pageH, imgW, imgH, imgX, imgY };
}
