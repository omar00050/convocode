"use client";

interface BlendModeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Dropdown selector for blend/composite modes.
 * Grouped by category with Canvas 2D operation values.
 */
export default function BlendModeSelect({ value, onChange }: BlendModeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 bg-[#333] border border-[#555] rounded text-sm text-gray-200
        focus:outline-none focus:border-blue-500 cursor-pointer"
    >
      <optgroup label="Normal">
        <option value="source-over">Normal</option>
      </optgroup>
      <optgroup label="Darken">
        <option value="multiply">Multiply</option>
        <option value="darken">Darken</option>
        <option value="color-burn">Color Burn</option>
      </optgroup>
      <optgroup label="Lighten">
        <option value="screen">Screen</option>
        <option value="lighten">Lighten</option>
        <option value="color-dodge">Color Dodge</option>
      </optgroup>
      <optgroup label="Contrast">
        <option value="overlay">Overlay</option>
        <option value="hard-light">Hard Light</option>
        <option value="soft-light">Soft Light</option>
      </optgroup>
      <optgroup label="Difference">
        <option value="difference">Difference</option>
        <option value="exclusion">Exclusion</option>
      </optgroup>
      <optgroup label="Color">
        <option value="hue">Hue</option>
        <option value="saturation">Saturation</option>
        <option value="color">Color</option>
        <option value="luminosity">Luminosity</option>
      </optgroup>
    </select>
  );
}
