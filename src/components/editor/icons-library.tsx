"use client";

import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { ICON_DATA } from "@/lib/lucide-icon-data";
import type { IconEntry } from "@/lib/lucide-icon-data";

interface IconsLibraryProps {
  onAddIcon: (entry: IconEntry) => void;
}

export default function IconsLibrary({ onAddIcon }: IconsLibraryProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // 150ms debounce
    const timer = setTimeout(() => setDebouncedQuery(value), 150);
    return () => clearTimeout(timer);
  }, []);

  const filteredIcons = useMemo(() => {
    if (!debouncedQuery.trim()) return ICON_DATA.slice(0, 200);
    const q = debouncedQuery.toLowerCase();
    return ICON_DATA.filter(
      (entry) =>
        entry.name.includes(q) ||
        entry.tags.join(" ").includes(q)
    ).slice(0, 200);
  }, [debouncedQuery]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search icons..."
          className="w-full bg-[#1a1a1a] border border-[#444] rounded text-xs text-gray-300 placeholder-gray-600 pl-7 pr-2 py-1.5 focus:outline-none focus:border-[#555]"
        />
      </div>

      {/* Icon grid */}
      {filteredIcons.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-4">No icons found</p>
      ) : (
        <div
          className="grid gap-1 overflow-y-auto"
          style={{ gridTemplateColumns: "repeat(5, 1fr)", maxHeight: "240px" }}
        >
          {filteredIcons.map((entry) => (
            <button
              key={entry.name}
              type="button"
              title={entry.name}
              onClick={() => onAddIcon(entry)}
              className="flex flex-col items-center justify-center gap-1 p-1.5 rounded hover:bg-[#333] transition-colors group"
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-300 group-hover:text-white shrink-0"
              >
                <path d={entry.path} />
              </svg>
              <span className="text-[9px] text-gray-500 group-hover:text-gray-400 truncate w-full text-center leading-tight">
                {entry.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
