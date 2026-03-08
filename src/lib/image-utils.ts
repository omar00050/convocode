/**
 * Validates that a file is an accepted image type.
 * @param file - The file to validate
 * @returns true if the file is a valid image type (PNG, JPG, WebP, GIF)
 */
export function validateImageFile(file: File): boolean {
  const acceptedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  return acceptedTypes.includes(file.type);
}

/**
 * Loads an image from a source URL and returns a promise that resolves
 * with the HTMLImageElement when loaded.
 * @param src - The image source URL (can be a data URL)
 * @returns Promise that resolves with the HTMLImageElement
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Computes the dimensions to fit an image within the canvas,
 * maintaining aspect ratio without upscaling.
 * @param naturalWidth - The original width of the image
 * @param naturalHeight - The original height of the image
 * @param canvasWidth - The canvas width
 * @param canvasHeight - The canvas height
 * @returns The fitted width and height
 */
export function fitImageToCanvas(
  naturalWidth: number,
  naturalHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { width: number; height: number } {
  const maxWidth = canvasWidth * 0.8;
  const maxHeight = canvasHeight * 0.8;

  // If image fits within 80% of canvas, use original dimensions (no upscaling)
  if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
    return { width: naturalWidth, height: naturalHeight };
  }

  // Scale down to fit within 80% of canvas
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}
