"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { AnyCanvasObject, ImageObject, TextObject, ShapeObject, QRCodeObject } from "@/types/editor";
import ImageProperties from "./properties/image-properties";
import TextProperties from "./properties/text-properties";
import ShapeProperties from "./properties/shape-properties";
import QRCodeProperties from "./qrcode-properties";
import MultiProperties from "./properties/multi-properties";
import CanvasProperties from "./canvas-properties";

export default function PropertiesPanel() {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useEditorStore((state) => state.objects);

  // Compute selected objects
  const selectedObjects = objects.filter((obj) => selectedIds.includes(obj.id));

  // Empty state - show canvas properties
  if (selectedIds.length === 0) {
    return <CanvasProperties />;
  }

  // Multi-selection state
  if (selectedIds.length > 1) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">
          Multiple Objects ({selectedIds.length})
        </h3>
        <MultiProperties objects={selectedObjects} />
      </div>
    );
  }

  // Single selection state
  const selectedObject = selectedObjects[0];

  if (!selectedObject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 italic text-sm text-center px-4">
          Select an object to see properties
        </p>
      </div>
    );
  }

  // Route to appropriate properties panel based on object type
  switch (selectedObject.type) {
    case "image":
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Image Properties</h3>
          <ImageProperties obj={selectedObject as ImageObject} />
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Text Properties</h3>
          <TextProperties obj={selectedObject as TextObject} />
        </div>
      );
    case "shape":
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Shape Properties</h3>
          <ShapeProperties obj={selectedObject as ShapeObject} />
        </div>
      );
    case "qrcode":
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">QR Code Properties</h3>
          <QRCodeProperties obj={selectedObject as QRCodeObject} />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 italic text-sm text-center px-4">
            Unknown object type
          </p>
        </div>
      );
  }
}
