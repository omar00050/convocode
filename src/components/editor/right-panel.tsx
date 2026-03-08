"use client";

import LayersPanel from "./layers-panel";
import PropertiesPanel from "./properties-panel";
import GlobalFontSetting from "./global-font-setting";

export default function RightPanel() {
  return (
    <div className="w-[280px] bg-[#252525] border-l border-[#333333] flex flex-col">
      {/* Global Font Setting */}
      <GlobalFontSetting />

      {/* Properties Section */}
      <div className="flex-[6] min-h-0 px-3 py-2 overflow-y-auto border-b border-[#333333]">
        <PropertiesPanel />
      </div>

      {/* Layers Section */}
      <div className="flex-[4] min-h-0">
        <LayersPanel />
      </div>
    </div>
  );
}
