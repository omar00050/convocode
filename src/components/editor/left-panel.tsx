"use client";

import { useState, useRef } from "react";
import { ImagePlus, Type, QrCode, LayoutGrid, PenTool, Group, Ungroup } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { validateImageFile, fitImageToCanvas } from "@/lib/image-utils";
import { getShapeDefaults } from "@/lib/shape-defaults";
import { canGroup } from "@/lib/group-utils";
import ShapeLibrary from "@/components/editor/shape-library";
import IconsLibrary from "@/components/editor/icons-library";
import type { IconEntry } from "@/lib/lucide-icon-data";
import type { ImageObject, TextObject, ShapeObject, QRCodeObject, GroupObject } from "@/types/editor";

export default function LeftPanel() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addObject = useEditorStore((state) => state.addObject);
  const setSelection = useEditorStore((state) => state.setSelection);
  const objects = useEditorStore((state) => state.objects);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const groupObjects = useEditorStore((state) => state.groupObjects);
  const ungroupObject = useEditorStore((state) => state.ungroupObject);

  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
  const isSingleGroup = selectedObjects.length === 1 && selectedObjects[0].type === "group";
  const canGroupSelected = selectedObjects.length >= 2 && canGroup(selectedObjects);
  const singleGroupId = isSingleGroup ? selectedObjects[0].id : null;

  const handleAddText = () => {
    const { canvasWidth, canvasHeight } = useEditorStore.getState();

    // Count existing text objects for naming
    const textCount = objects.filter((o) => o.type === "text").length + 1;

    const textObj: TextObject = {
      id: crypto.randomUUID(),
      type: "text",
      x: (canvasWidth - 300) / 2,
      y: (canvasHeight - 50) / 2,
      width: 300,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: `Text ${textCount}`,
      shadowEnabled: false,
      shadowColor: "#00000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      blendMode: "source-over",
      content: "Double click to edit",
      fontFamily: null,
      fontSize: 32,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      fill: "#FFFFFF",
      strokeEnabled: false,
      strokeColor: "#000000",
      strokeWidth: 0,
      textAlign: "left",
      direction: "auto",
      letterSpacing: 0,
      lineHeight: 1.2,
      textPathType: "none",
      textPathRadius: 300,
      textPathDirection: "up",
      textPathStartAngle: 0,
      textPathClockwise: true,
      textPathAmplitude: 30,
      textPathWavelength: 200,
      textPathPhase: 0,
    };

    addObject(textObj);
    setSelection([textObj.id]);
  };

  const handleAddShape = (shapeType: ShapeObject["shapeType"]) => {
    const { canvasWidth, canvasHeight } = useEditorStore.getState();
    const defaults = getShapeDefaults(shapeType);

    // Count existing shapes of this type for naming
    const shapeCount = objects.filter((o) => o.type === "shape" && (o as ShapeObject).shapeType === shapeType).length + 1;

    // Capitalize shape type for display name
    const shapeTypeName = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);

    const shapeObj: ShapeObject = {
      id: crypto.randomUUID(),
      type: "shape",
      x: (canvasWidth - defaults.width) / 2,
      y: (canvasHeight - defaults.height) / 2,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: `${shapeTypeName} ${shapeCount}`,
      shadowEnabled: false,
      shadowColor: "#00000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      blendMode: "source-over",
      shapeType,
      fill: defaults.fill,
      stroke: defaults.stroke,
      strokeWidth: defaults.strokeWidth,
      cornerRadius: defaults.cornerRadius,
      sides: defaults.sides,
      innerRadius: defaults.innerRadius,
    };

    addObject(shapeObj);
    setSelection([shapeObj.id]);
  };

  const handleAddIcon = (entry: IconEntry) => {
    const { canvasWidth, canvasHeight } = useEditorStore.getState();

    const iconCount = objects.filter((o) => o.type === "shape" && (o as ShapeObject).shapeType === "icon").length + 1;

    const iconObj: ShapeObject = {
      id: crypto.randomUUID(),
      type: "shape",
      x: (canvasWidth - 100) / 2,
      y: (canvasHeight - 100) / 2,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: `Icon ${iconCount}`,
      shadowEnabled: false,
      shadowColor: "#00000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      blendMode: "source-over",
      shapeType: "icon",
      fill: "#FFFFFF",
      stroke: "transparent",
      strokeWidth: 0,
      svgPath: entry.path,
      iconName: entry.name,
    };

    addObject(iconObj);
    setSelection([iconObj.id]);
  };

  const handleAddQRCode = () => {
    const { canvasWidth, canvasHeight } = useEditorStore.getState();

    // Count existing QR codes for naming
    const qrCount = objects.filter((o) => o.type === "qrcode").length + 1;

    const qrObj: QRCodeObject = {
      id: crypto.randomUUID(),
      type: "qrcode",
      x: (canvasWidth - 200) / 2,
      y: (canvasHeight - 200) / 2,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: `QR Code ${qrCount}`,
      shadowEnabled: false,
      shadowColor: "#00000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      blendMode: "source-over",
      data: "https://example.com",
      errorCorrectionLevel: "M",
      foregroundColor: "#000000",
      backgroundColor: "#FFFFFF",
      padding: 2,
      style: "square",
    };

    addObject(qrObj);
    setSelection([qrObj.id]);
  };

  const processFile = async (file: File) => {
    // Clear previous error
    setError(null);

    // Validate file type
    if (!validateImageFile(file)) {
      setError("Only image files are accepted: PNG, JPG, WebP, GIF");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Get image dimensions
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = base64;
      });

      const { naturalWidth, naturalHeight } = img;

      // Get canvas dimensions from store
      const { canvasWidth, canvasHeight } = useEditorStore.getState();

      // Fit image to canvas
      const { width, height } = fitImageToCanvas(
        naturalWidth,
        naturalHeight,
        canvasWidth,
        canvasHeight
      );

      // Compute centered position
      const x = (canvasWidth - width) / 2;
      const y = (canvasHeight - height) / 2;

      // Create ImageObject
      const imageObj: ImageObject = {
        id: crypto.randomUUID(),
        type: "image",
        x,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        name: file.name,
        shadowEnabled: false,
        shadowColor: "#00000000",
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        blendMode: "source-over",
        src: base64,
        originalName: file.name,
        flipX: false,
        flipY: false,
        filters: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          sepia: 0,
          hueRotate: 0,
        },
        maskType: "none",
        maskRadius: 0,
        borderEnabled: false,
        borderColor: "#000000",
        borderWidth: 0,
        borderRadius: 0,
      };

      addObject(imageObj);
    } catch {
      setError("Failed to load image. Please try another file.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-[260px] bg-[#252525] border-r border-[#333333] flex flex-col overflow-y-auto">
      {/* Upload Image Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          Add Image
        </h3>
        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${
            isDragOver
              ? "border-blue-400 bg-blue-400/10"
              : "border-[#444] hover:border-[#555] hover:bg-[#2a2a2a]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <ImagePlus size={32} className="text-gray-500 mb-2" />
          <span className="text-sm text-gray-400">Click to upload</span>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Add Text Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          Add Text
        </h3>
        <button
          type="button"
          onClick={handleAddText}
          className="w-full flex items-center gap-3 px-4 py-3 rounded bg-[#333] hover:bg-[#3a3a3a] transition text-gray-300"
        >
          <Type size={18} />
          <span>Add Text</span>
        </button>
      </div>

      {/* Shape Library Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          Shape Library
        </h3>
        <ShapeLibrary onAddShape={handleAddShape} />
      </div>

      {/* QR Code Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          QR Code
        </h3>
        <button
          type="button"
          onClick={handleAddQRCode}
          className="w-full flex items-center gap-3 px-4 py-3 rounded bg-[#333] hover:bg-[#3a3a3a] transition text-gray-300"
        >
          <QrCode size={18} />
          <span>Add QR Code</span>
        </button>
      </div>

      {/* Icons Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
          <LayoutGrid size={14} />
          Icons
        </h3>
        <IconsLibrary onAddIcon={handleAddIcon} />
      </div>

      {/* Group / Ungroup Section */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          Group
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => groupObjects(selectedIds)}
            disabled={!canGroupSelected}
            title={!canGroupSelected && selectedObjects.length >= 2 ? "Maximum nesting depth (3) reached" : "Group selected objects (⌘G)"}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition text-sm ${
              canGroupSelected
                ? "bg-[#333] hover:bg-[#3a3a3a] text-gray-300"
                : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
            }`}
          >
            <Group size={16} />
            <span>Group</span>
          </button>
          <button
            type="button"
            onClick={() => singleGroupId && ungroupObject(singleGroupId)}
            disabled={!isSingleGroup}
            title="Ungroup (⌘⇧G)"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition text-sm ${
              isSingleGroup
                ? "bg-[#333] hover:bg-[#3a3a3a] text-gray-300"
                : "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
            }`}
          >
            <Ungroup size={16} />
            <span>Ungroup</span>
          </button>
        </div>
      </div>

      {/* Pen Tool Section */}
      <PenToolSection />
    </div>
  );
}

function PenToolSection() {
  const penToolActive = useEditorStore((state) => state.penToolActive);
  const setPenToolActive = useEditorStore((state) => state.setPenToolActive);

  return (
    <div className="px-3 py-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
        <PenTool size={14} />
        Draw
      </h3>
      <button
        type="button"
        onClick={() => setPenToolActive(!penToolActive)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
          penToolActive
            ? "bg-blue-600 text-white"
            : "bg-[#333] hover:bg-[#3a3a3a] text-gray-300"
        }`}
      >
        <PenTool size={18} />
        <span>{penToolActive ? "Drawing... (Esc to cancel)" : "Pen Tool"}</span>
      </button>
    </div>
  );
}
