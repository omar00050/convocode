"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, Upload, Trash2 } from "lucide-react";
import type { FontDef } from "@/types/editor";
import { ENGLISH_FONTS, ARABIC_FONTS } from "@/lib/fonts";
import { useEditorStore } from "@/stores/editor-store";

interface FontSelectorProps {
  currentFont: string | null;
  globalFont: string | null;
  onChange: (family: string) => void;
  availableFonts: FontDef[];
  compact?: boolean;
}

/**
 * Font selector dropdown with search and typeface preview.
 * Shows fonts organized by: My Fonts (uploaded) → English Fonts → Arabic Fonts.
 */
export default function FontSelector({
  currentFont,
  globalFont,
  onChange,
  availableFonts,
  compact = false,
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store access
  const uploadedFonts = useEditorStore((state) => state.uploadedFonts);
  const addUploadedFont = useEditorStore((state) => state.addUploadedFont);
  const removeUploadedFont = useEditorStore((state) => state.removeUploadedFont);

  // Determine display text for trigger button
  const getDisplayText = () => {
    if (currentFont !== null) {
      return currentFont;
    }
    if (globalFont !== null) {
      return `Global: ${globalFont}`;
    }
    return "Default: Arial";
  };

  // Determine if current font should show typeface styling
  const getDisplayStyle = () => {
    if (currentFont !== null) {
      return { fontFamily: currentFont };
    }
    return {};
  };

  // Filter fonts by search query
  const filteredUploadedFonts = uploadedFonts.filter((font) =>
    font.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEnglishFonts = ENGLISH_FONTS.filter((font) =>
    font.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArabicFonts = ARABIC_FONTS.filter((font) =>
    font.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Clear error after 3 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const handleFontSelect = (family: string) => {
    onChange(family);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Extract font family name from filename
  const extractFamilyName = (filename: string): string => {
    // Remove extension
    let name = filename.replace(/\.(ttf|otf|woff|woff2)$/i, "");
    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]/g, " ");
    // Strip common weight/style suffixes
    const suffixes = [
      "-Regular", "-Bold", "-Italic", "-Light", "-Medium",
      "-SemiBold", "-ExtraBold", "-Thin", "-Black",
      " Regular", " Bold", " Italic", " Light", " Medium",
      " SemiBold", " ExtraBold", " Thin", " Black"
    ];
    for (const suffix of suffixes) {
      if (name.toLowerCase().endsWith(suffix.toLowerCase())) {
        name = name.slice(0, -suffix.length);
        break;
      }
    }
    return name.trim();
  };

  // Handle font file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const validExtensions = [".ttf", ".otf", ".woff", ".woff2"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validExtensions.includes(ext)) {
      setUploadError("Invalid file type. Please upload .ttf, .otf, .woff, or .woff2 files.");
      e.target.value = "";
      return;
    }

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Extract family name
      const familyName = extractFamilyName(file.name);

      // Create and load font
      const fontFace = new FontFace(familyName, arrayBuffer);
      document.fonts.add(fontFace);
      await fontFace.load();

      // Create blob URL for storage
      const blobUrl = URL.createObjectURL(file);

      // Add to store
      addUploadedFont({
        family: familyName,
        displayName: familyName,
        source: "uploaded",
        url: blobUrl,
        supportsBold: false,
        supportsItalic: false,
      });

      // Clear any previous error
      setUploadError(null);
    } catch (error) {
      console.error("Font upload failed:", error);
      setUploadError("Failed to load font. Please try a different file.");
    }

    // Reset input
    e.target.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFont = (family: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeUploadedFont(family);
  };

  const renderFontRow = (font: FontDef) => {
    const isSelected = currentFont === font.family;
    const isActive = currentFont === font.family;

    return (
      <button
        key={font.family}
        type="button"
        onClick={() => handleFontSelect(font.family)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
          isActive
            ? "bg-blue-600/20 text-white"
            : "text-gray-300 hover:bg-[#333]"
        }`}
        style={{ fontFamily: font.family }}
      >
        {/* Check icon for selected font */}
        <span className="w-4 flex-shrink-0">
          {isSelected && <Check size={14} className="text-blue-400" />}
        </span>
        <span className="flex-1 truncate">{font.displayName}</span>
      </button>
    );
  };

  const renderUploadedFontRow = (font: FontDef) => {
    const isSelected = currentFont === font.family;

    return (
      <button
        key={font.family}
        type="button"
        onClick={() => handleFontSelect(font.family)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
          isSelected
            ? "bg-blue-600/20 text-white"
            : "text-gray-300 hover:bg-[#333]"
        }`}
        style={{ fontFamily: font.family }}
      >
        {/* Check icon for selected font */}
        <span className="w-4 flex-shrink-0">
          {isSelected && <Check size={14} className="text-blue-400" />}
        </span>
        <span className="flex-1 truncate">{font.displayName}</span>
        {/* Trash icon for removal */}
        <Trash2
          size={14}
          className="text-gray-500 hover:text-red-400 flex-shrink-0 cursor-pointer"
          onClick={(e) => handleRemoveFont(font.family, e)}
        />
      </button>
    );
  };

  // Check if any fonts match search
  const hasAnyFonts =
    filteredUploadedFonts.length > 0 ||
    filteredEnglishFonts.length > 0 ||
    filteredArabicFonts.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 rounded border transition-colors ${
          compact
            ? "py-1.5 text-xs bg-[#333] border-[#555] hover:border-[#666] text-gray-300"
            : "py-1.5 text-sm bg-[#333] border-[#555] hover:border-[#666] text-gray-300"
        }`}
        style={getDisplayStyle()}
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown size={compact ? 14 : 16} className="flex-shrink-0 text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl">
          {/* Search input */}
          <div className="p-2 border-b border-[#444]">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#333] rounded border border-[#555]">
              <Search size={14} className="text-gray-500 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fonts..."
                className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none"
              />
            </div>
          </div>

          {/* Font list */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* My Fonts section (uploaded fonts) */}
            {filteredUploadedFonts.length > 0 && (
              <div>
                <div className="sticky top-0 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-[#252525] border-b border-[#333]">
                  My Fonts
                </div>
                {filteredUploadedFonts.map(renderUploadedFontRow)}
              </div>
            )}

            {/* English Fonts section */}
            {filteredEnglishFonts.length > 0 && (
              <div>
                <div className="sticky top-0 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-[#252525] border-b border-[#333]">
                  English Fonts
                </div>
                {filteredEnglishFonts.map(renderFontRow)}
              </div>
            )}

            {/* Arabic Fonts section */}
            {filteredArabicFonts.length > 0 && (
              <div>
                <div className="sticky top-0 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-[#252525] border-b border-[#333]">
                  Arabic Fonts
                </div>
                {filteredArabicFonts.map(renderFontRow)}
              </div>
            )}

            {/* No results message */}
            {!hasAnyFonts && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No fonts found
              </div>
            )}
          </div>

          {/* Error message */}
          {uploadError && (
            <div className="px-3 py-2 text-xs text-red-400 bg-red-900/20 border-t border-[#444]">
              {uploadError}
            </div>
          )}

          {/* Upload Font button */}
          <div className="p-2 border-t border-[#444]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-300 bg-[#333] hover:bg-[#444] rounded border border-[#555] transition-colors"
            >
              <Upload size={14} />
              <span>Upload Font</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
