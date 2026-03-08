"use client";

import { useState, useRef } from "react";
import { ImagePlus } from "lucide-react";

interface ImageUploadStarterProps {
  onCreateProject: (width: number, height: number, imageDataUrl: string) => void;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ImageUploadStarter({
  onCreateProject,
}: ImageUploadStarterProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only image files are accepted (PNG, JPG, WebP, GIF)");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        setError("Failed to read file. Please try again.");
        setIsLoading(false);
        return;
      }

      // Load image to detect dimensions
      const img = new Image();
      img.onload = () => {
        setImageDataUrl(result);
        setImageWidth(img.naturalWidth);
        setImageHeight(img.naturalHeight);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError("Failed to load image. Please try another file.");
        setIsLoading(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreate = () => {
    if (imageWidth !== null && imageHeight !== null && imageDataUrl !== null) {
      onCreateProject(imageWidth, imageHeight, imageDataUrl);
    }
  };

  const handleRetry = () => {
    setImageDataUrl(null);
    setImageWidth(null);
    setImageHeight(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Drag and Drop Zone */}
      <div
        onClick={handleDropZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center p-8 rounded-lg border-2 transition-colors cursor-pointer
          ${isDragOver ? "border-blue-500 bg-[#333333]" : "border-[#555555] bg-[#2a2a2a]"}
          ${error ? "border-red-500" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-t border-gray-500 rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading image...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="text-blue-500 hover:text-blue-400 text-sm underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : imageDataUrl && imageWidth && imageHeight ? (
          <div className="flex flex-col items-center gap-3">
            {/* Image Preview */}
            <img
              src={imageDataUrl}
              alt="Uploaded preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded border border-[#333333]"
            />

            {/* Detected Dimensions */}
            <div className="text-center">
              <p className="text-gray-300 font-medium">
                Detected: {imageWidth} x {imageHeight}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus size={48} className="text-gray-500" />
            <span className="text-gray-400 text-sm">
              Drag & drop an image or click to browse
            </span>
          </div>
        )}
      </div>

      {/* Create Button (only shown when image is loaded successfully) */}
      {imageDataUrl && imageWidth && imageHeight && !error && (
        <button
          type="button"
          onClick={handleCreate}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
        >
          Create
        </button>
      )}
    </div>
  );
}
